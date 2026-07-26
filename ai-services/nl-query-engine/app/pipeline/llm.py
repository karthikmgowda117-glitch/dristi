"""
Ollama LLM integration — self-hosted, low temperature, constrained output.
Sends schema-grounded prompts and returns structured intent JSON only.
"""
import httpx
import json
import logging
from shared.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a police crime intelligence query assistant for Project Drishti (KSP).
Your ONLY job is to convert natural language queries into structured JSON intents.

Rules:
1. Output ONLY a valid JSON object matching the intent grammar — no prose, no explanation.
2. Never generate SQL, Cypher, or any database query syntax.
3. Never fabricate case IDs, names, or statistics not in the schema context.
4. If the query is outside the data domain (not about crime/cases/police), output: {"intent_type": "OUT_OF_SCOPE"}
5. Temperature is low — favor determinism over creativity.

Valid intent_types: CASE_SEARCH, NETWORK_QUERY, ALERT_QUERY, SIMILARITY_SEARCH,
FORECAST_QUERY, OFFICER_PERFORMANCE, EVIDENCE_QUERY, UNIT_STATS, CASE_TIMELINE

Example output:
{"intent_type": "CASE_SEARCH", "filters": {"crime_minor_head_id": 101}, "days": 30, "unit_name": "Koramangala PS"}
"""


async def call_ollama(user_text: str, rag_context: str) -> str:
    """
    Call the self-hosted Ollama LLM with the constrained system prompt + RAG context.
    Returns the raw LLM output (to be parsed by grammar validator).
    Falls back to a mock intent if Ollama is unavailable.
    """
    prompt = f"{rag_context}\n\nUser query: {user_text}"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "system": SYSTEM_PROMPT,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,     # Low temperature for determinism
                        "top_p": 0.9,
                        "num_predict": 256,
                    },
                },
            )
            data = response.json()
            return data.get("response", "")
    except Exception as exc:
        logger.warning(f"Ollama unavailable: {exc}. Using fallback mock intent.")
        return _mock_intent(user_text)


def _mock_intent(user_text: str) -> str:
    """
    Fallback mock intent for demo/testing when Ollama is not running.
    Maps common query keywords to structured intents.
    """
    text = user_text.lower()
    if any(w in text for w in ["theft", "vehicle", "motorcycle"]):
        return json.dumps({"intent_type": "CASE_SEARCH", "filters": {"crime_minor_head_id": 101}, "days": 30})
    if any(w in text for w in ["network", "graph", "repeat offender", "co-accused"]):
        return json.dumps({"intent_type": "NETWORK_QUERY", "entity_type": "ACCUSED"})
    if any(w in text for w in ["alert", "anomaly", "spike"]):
        return json.dumps({"intent_type": "ALERT_QUERY"})
    if any(w in text for w in ["similar", "duplicate", "same modus"]):
        return json.dumps({"intent_type": "SIMILARITY_SEARCH"})
    if any(w in text for w in ["trend", "forecast", "predict"]):
        return json.dumps({"intent_type": "FORECAST_QUERY", "horizon_days": 30})
    # Default fallback
    return json.dumps({"intent_type": "CASE_SEARCH", "filters": {}, "days": 90})
