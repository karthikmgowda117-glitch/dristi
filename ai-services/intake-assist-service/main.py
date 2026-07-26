"""
Intake Assist Service — FR-32: Proactive intake assistance when a new FIR is created.
Combines: similar case lookup + act/section suggestions + entity pre-fill.
"""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.db import get_db_session
import httpx, uuid, json, uvicorn

settings = get_settings()
app = FastAPI(title="Drishti Intake Assist Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

EMBEDDING_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://embedding-service:8002")
NARRATIVE_URL  = os.getenv("NARRATIVE_SERVICE_URL", "http://narrative-extraction-service:8011")


@app.get("/api/v1/intake-assist/{case_id}")
async def get_intake_assist(
    case_id: str,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    FR-32: Returns pre-filled intake assist suggestions for a newly created case.
    Components: similar cases + act/section suggestions + narrative entities.
    """
    # Get case details
    result = await db.execute(
        text("SELECT narrative, crime_major_head_id, crime_minor_head_id FROM casemaster WHERE case_master_id = :cid"),
        {"cid": case_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND"}})

    # 1. Find similar cases via embedding service
    similar_cases = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{EMBEDDING_URL}/api/v1/cases/{case_id}/similar?limit=3")
            if resp.status_code == 200:
                similar_cases = resp.json().get("similar_cases", [])
    except Exception:
        pass

    # 2. Suggest act/sections based on crime_minor_head_id
    suggested_sections = await db.execute(text("""
        SELECT sm.section_id, sm.section_number, am.act_name, sm.description
        FROM section_master sm
        JOIN act_master am ON am.act_id = sm.act_id
        WHERE sm.act_id IN (
            SELECT act_id FROM act_section_association asa
            JOIN casemaster c ON c.case_master_id = asa.case_master_id
            WHERE c.crime_minor_head_id = :cmhid
            GROUP BY asa.act_id ORDER BY COUNT(*) DESC LIMIT 3
        )
        LIMIT 10
    """), {"cmhid": row["crime_minor_head_id"]})
    sections = [dict(r) for r in suggested_sections.mappings()]

    # 3. Fetch narrative entities (already extracted by narrative-extraction-service)
    narrative_entities = []
    try:
        entity_result = await db.execute(text("""
            SELECT entity_type, extracted_text, confidence_score
            FROM narrative_extracted_entity
            WHERE case_master_id = :cid AND confidence_score >= 0.6
            ORDER BY confidence_score DESC
        """), {"cid": case_id})
        narrative_entities = [dict(r) for r in entity_result.mappings()]
    except Exception:
        pass

    return {
        "case_id": case_id,
        "status": "ready",
        "similar_cases": similar_cases,
        "suggested_sections": sections,
        "narrative_entities": narrative_entities,
        "suggestion_note": "Suggestions are based on historical patterns — officer must verify before submission.",
    }


@app.post("/api/v1/intake-assist/trigger")
async def trigger_intake(
    body: dict,
    db: AsyncSession = Depends(get_db_session),
):
    """Called by case-service when a new case is created to kick off async intake."""
    case_id = body.get("caseMasterId")
    if not case_id:
        raise HTTPException(status_code=422, detail="caseMasterId required")

    # Trigger embedding and narrative extraction asynchronously
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            await client.post(f"{EMBEDDING_URL}/api/v1/embedding/cases/{case_id}")
        except Exception:
            pass
        try:
            await client.post(f"{NARRATIVE_URL}/api/v1/narrative-extraction/{case_id}")
        except Exception:
            pass

    return {"status": "triggered", "case_id": case_id}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "intake-assist-service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
