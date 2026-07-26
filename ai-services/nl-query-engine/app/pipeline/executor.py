"""Execute validated intents against read-only DB/Neo4j service accounts."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .grammar import QueryIntent
import httpx
import os

GRAPH_SERVICE_URL = os.getenv("GRAPH_SERVICE_URL", "http://graph-orchestrator:8004")
EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://embedding-service:8002")
ANOMALY_SERVICE_URL = os.getenv("ANOMALY_SERVICE_URL", "http://anomaly-engine:8003")


async def execute_intent(intent: QueryIntent, db: AsyncSession) -> dict:
    """Dispatch to the appropriate executor based on intent type."""
    handlers = {
        "CASE_SEARCH":        _execute_case_search,
        "NETWORK_QUERY":      _execute_network_query,
        "ALERT_QUERY":        _execute_alert_query,
        "SIMILARITY_SEARCH":  _execute_similarity_search,
        "FORECAST_QUERY":     _execute_forecast_query,
        "UNIT_STATS":         _execute_unit_stats,
        "CASE_TIMELINE":      _execute_case_timeline,
    }
    handler = handlers.get(intent.intent_type, _execute_unknown)
    return await handler(intent, db)


async def _execute_case_search(intent: QueryIntent, db: AsyncSession) -> dict:
    filters = intent.filters
    unit_id = filters.get("_jurisdiction_unit_id")
    days = intent.days or 90
    cmh_id = filters.get("crime_minor_head_id")

    sql = """
        WITH RECURSIVE descendants AS (
            SELECT unit_id FROM unit WHERE unit_id = :unit_id
            UNION ALL
            SELECT u.unit_id FROM unit u JOIN descendants d ON u.parent_unit_id = d.unit_id
        )
        SELECT c.case_master_id, c.fir_number, c.status, c.incident_from_date,
               c.latitude, c.longitude, c.crime_minor_head_id, c.unit_id
        FROM casemaster c
        WHERE c.unit_id IN (SELECT unit_id FROM descendants)
          AND c.incident_from_date >= CURRENT_DATE - :days * INTERVAL '1 day'
    """
    params: dict = {"unit_id": unit_id or "00000000-0000-0000-0000-000000000001", "days": days}
    if cmh_id:
        sql += " AND c.crime_minor_head_id = :cmh_id"
        params["cmh_id"] = cmh_id
    sql += " ORDER BY c.incident_from_date DESC LIMIT 50"

    result = await db.execute(text(sql), params)
    rows = [dict(r) for r in result.mappings()]
    return {"data": rows, "confidence": 0.95, "source_refs": [{"table": "casemaster", "count": len(rows)}]}


async def _execute_network_query(intent: QueryIntent, db: AsyncSession) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{GRAPH_SERVICE_URL}/api/v1/graph/network",
                params={"unit_id": intent.unit_id, "entity_type": intent.entity_type or "ACCUSED"},
            )
            data = resp.json()
            return {"data": data, "confidence": 0.88, "reasoning_path": data.get("reasoning_path"),
                    "source_refs": [{"table": "neo4j_graph", "node_count": len(data.get("nodes", []))}]}
    except Exception:
        return {"data": {"nodes": [], "edges": []}, "confidence": 0.0,
                "source_refs": [], "error": "Graph service unavailable"}


async def _execute_alert_query(intent: QueryIntent, db: AsyncSession) -> dict:
    unit_id = intent.filters.get("_jurisdiction_unit_id")
    result = await db.execute(
        text("""
            SELECT a.alert_id, a.unit_id, a.severity, a.z_score, a.triggered_at, a.status
            FROM alert a
            JOIN unit u ON u.unit_id = a.unit_id
            WHERE a.unit_id = :uid AND a.status = 'OPEN'
            ORDER BY a.triggered_at DESC LIMIT 20
        """),
        {"uid": unit_id},
    )
    rows = [dict(r) for r in result.mappings()]
    return {"data": rows, "confidence": 0.92, "source_refs": [{"table": "alert"}]}


async def _execute_similarity_search(intent: QueryIntent, db: AsyncSession) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{EMBEDDING_SERVICE_URL}/api/v1/cases/{intent.case_id}/similar" if intent.case_id
                else f"{EMBEDDING_SERVICE_URL}/api/v1/cases/similar-all",
            )
            return {"data": resp.json(), "confidence": 0.82, "source_refs": [{"table": "case_embedding"}]}
    except Exception:
        return {"data": [], "confidence": 0.0, "source_refs": [], "error": "Embedding service unavailable"}


async def _execute_forecast_query(intent: QueryIntent, db: AsyncSession) -> dict:
    unit_id = intent.unit_id
    result = await db.execute(
        text("""
            SELECT forecast_id, unit_id, crime_minor_head_id, horizon_days,
                   forecasted_count, confidence_lower, confidence_upper, method_tag, generated_at
            FROM forecast_result
            WHERE unit_id = :uid
            ORDER BY generated_at DESC LIMIT 5
        """),
        {"uid": unit_id},
    )
    rows = [dict(r) for r in result.mappings()]
    return {"data": rows, "confidence": 0.78, "source_refs": [{"table": "forecast_result"}]}


async def _execute_unit_stats(intent: QueryIntent, db: AsyncSession) -> dict:
    result = await db.execute(text("SELECT * FROM policymaker_unit_stats ORDER BY total_cases DESC LIMIT 20"))
    rows = [dict(r) for r in result.mappings()]
    return {"data": rows, "confidence": 0.95, "source_refs": [{"view": "policymaker_unit_stats"}]}


async def _execute_case_timeline(intent: QueryIntent, db: AsyncSession) -> dict:
    if not intent.case_id:
        return {"data": [], "confidence": 0.0}
    result = await db.execute(
        text("SELECT * FROM case_timeline_event WHERE case_master_id = :cid ORDER BY created_at"),
        {"cid": intent.case_id},
    )
    rows = [dict(r) for r in result.mappings()]
    return {"data": rows, "confidence": 0.95, "source_refs": [{"table": "case_timeline_event"}]}


async def _execute_unknown(intent: QueryIntent, db: AsyncSession) -> dict:
    return {"data": None, "confidence": 0.0, "source_refs": []}
