"""
RAG (Retrieval-Augmented Generation) — builds schema-grounded context for the LLM.
Retrieves relevant table/column descriptions and example NL→intent pairs.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from shared.auth import UserContext

# Schema description snippets — grounded in the actual Drishti schema
SCHEMA_DESCRIPTIONS = {
    "casemaster": """
Table: casemaster — Central fact table for FIR/case records.
Columns: case_master_id (UUID PK), unit_id (FK→unit), crime_major_head_id, crime_minor_head_id,
fir_number, latitude, longitude, incident_from_date, incident_to_date, status, assigned_officer_id, narrative.
Status values: REGISTERED, UNDER_INVESTIGATION, EVIDENCE_COLLECTION, CHARGESHEET_PREP, CLOSED.
""",
    "unit": """
Table: unit — Jurisdiction hierarchy (STATE→DISTRICT→SUBDIVISION→STATION).
Columns: unit_id, parent_unit_id (self-ref), unit_name, unit_type.
""",
    "accused": """
Table: accused — People accused in cases.
Columns: accused_id, case_master_id, name, age, gender, address, contact_number.
contact_number is used for FR-33 cross-case contact linkage.
""",
    "crime_categories": """
crime_major_head: e.g. Property Offences (1), Offences Against Body (2), Cyber Crimes (5).
crime_minor_head: e.g. Vehicle Theft (101), Chain Snatching (103), Murder (201).
""",
}

EXAMPLE_INTENTS = [
    {"nl": "show theft cases in Koramangala last 30 days",
     "intent": {"intent_type": "CASE_SEARCH", "filters": {"crime_minor_head_id": 101, "days": 30}}},
    {"nl": "find repeat offenders across Mysuru and Mandya",
     "intent": {"intent_type": "NETWORK_QUERY", "entity_type": "ACCUSED", "district_names": ["Mysuru", "Mandya"]}},
    {"nl": "show anomaly alerts for HSR Layout",
     "intent": {"intent_type": "ALERT_QUERY", "unit_name": "HSR Layout PS"}},
    {"nl": "cases similar to this FIR",
     "intent": {"intent_type": "SIMILARITY_SEARCH"}},
    {"nl": "what is the crime trend in Bengaluru Urban",
     "intent": {"intent_type": "FORECAST_QUERY", "unit_name": "Bengaluru Urban District"}},
]


async def build_rag_context(user_query: str, user: UserContext, db: AsyncSession) -> str:
    """
    Build a schema-grounded RAG context string to prepend to the LLM prompt.
    Retrieves:
    1. Relevant schema descriptions (keyword matching for MVP; vector RAG for production)
    2. User's jurisdiction context
    3. Example NL→intent pairs
    """
    # Keyword-based schema retrieval (MVP — production uses sentence embeddings)
    relevant_schemas = []
    query_lower = user_query.lower()
    if any(w in query_lower for w in ["case", "fir", "theft", "murder", "crime"]):
        relevant_schemas.append(SCHEMA_DESCRIPTIONS["casemaster"])
        relevant_schemas.append(SCHEMA_DESCRIPTIONS["crime_categories"])
    if any(w in query_lower for w in ["station", "district", "unit", "jurisdiction"]):
        relevant_schemas.append(SCHEMA_DESCRIPTIONS["unit"])
    if any(w in query_lower for w in ["accused", "suspect", "offender", "person"]):
        relevant_schemas.append(SCHEMA_DESCRIPTIONS["accused"])

    if not relevant_schemas:
        relevant_schemas = list(SCHEMA_DESCRIPTIONS.values())

    # Jurisdiction context
    jurisdiction_ctx = f"User role: {user.role}. User unit: {user.unit_id}. Jurisdiction path: {user.jurisdiction_path}"

    # Example intents
    examples = "\n".join([
        f"NL: '{ex['nl']}' → Intent: {ex['intent']}"
        for ex in EXAMPLE_INTENTS[:3]
    ])

    return f"""
=== SCHEMA CONTEXT ===
{''.join(relevant_schemas)}

=== JURISDICTION CONTEXT ===
{jurisdiction_ctx}

=== EXAMPLE NL→INTENT MAPPINGS ===
{examples}
"""
