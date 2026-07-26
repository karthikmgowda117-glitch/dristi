"""
Constrained Query Grammar Parser — validates LLM output against a fixed intent grammar.
LLM NEVER generates or executes raw SQL/Cypher — only structured intent JSON.
This is the primary hallucination-prevention mechanism per 13_AI_Architecture.md §10.
"""
import json
from typing import Optional
from pydantic import BaseModel, ValidationError


VALID_INTENT_TYPES = {
    "CASE_SEARCH",
    "NETWORK_QUERY",
    "ALERT_QUERY",
    "SIMILARITY_SEARCH",
    "FORECAST_QUERY",
    "OFFICER_PERFORMANCE",
    "EVIDENCE_QUERY",
    "UNIT_STATS",
    "CASE_TIMELINE",
}


class QueryIntent(BaseModel):
    intent_type: str
    filters: dict = {}
    entity_type: Optional[str] = None
    unit_name: Optional[str] = None
    unit_id: Optional[str] = None
    case_id: Optional[str] = None
    days: Optional[int] = None
    horizon_days: Optional[int] = None
    raw_text: Optional[str] = None


def parse_query_intent(llm_output: str) -> Optional[QueryIntent]:
    """
    Extract and validate the intent JSON from LLM output.
    Returns None if the output does not conform to the grammar (triggers clarification).
    """
    # Try to extract JSON block from LLM output
    json_str = _extract_json(llm_output)
    if not json_str:
        return None

    try:
        data = json.loads(json_str)
    except (json.JSONDecodeError, ValueError):
        return None

    # Validate intent_type against allowlist
    intent_type = data.get("intent_type", "")
    if intent_type not in VALID_INTENT_TYPES:
        return None

    # Validate filters don't contain raw SQL
    filters = data.get("filters", {})
    if _contains_sql_injection(filters):
        return None

    try:
        return QueryIntent(**data)
    except (ValidationError, TypeError):
        return None


def _extract_json(text: str) -> Optional[str]:
    """Extract the first valid JSON object from text."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or start > end:
        return None
    return text[start:end + 1]


def _contains_sql_injection(data: dict) -> bool:
    """Reject any intent that contains SQL keywords — belt-and-suspenders check."""
    SQL_KEYWORDS = {"select", "drop", "insert", "update", "delete", "union", "--", ";"}
    data_str = json.dumps(data).lower()
    return any(kw in data_str for kw in SQL_KEYWORDS)
