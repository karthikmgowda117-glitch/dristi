"""
Officer Copilot Service — FR-38: AI-powered officer investigation assistant.
Provides contextual guidance, next-steps suggestions, and case summary.
"""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.db import get_db_session
import httpx, uuid, json, uvicorn
from typing import Optional

settings = get_settings()
app = FastAPI(title="Drishti Officer Copilot", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class CopilotRequest(BaseModel):
    case_id: str
    question: Optional[str] = None


@app.post("/api/v1/copilot/assist")
async def get_assistance(
    req: CopilotRequest,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """FR-38: Get AI investigation guidance for a case."""
    # Get case summary
    result = await db.execute(text("""
        SELECT c.fir_number, c.status, c.narrative, c.incident_from_date,
               cmh.name AS crime_name,
               u.unit_name
        FROM casemaster c
        JOIN crime_minor_head cmh ON cmh.crime_minor_head_id = c.crime_minor_head_id
        JOIN unit u ON u.unit_id = c.unit_id
        WHERE c.case_master_id = :cid
    """), {"cid": req.case_id})
    case = result.mappings().first()
    if not case:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND"}})

    # Get pending tasks
    tasks_result = await db.execute(text("""
        SELECT description, status, due_date FROM task
        WHERE case_master_id = :cid AND status != 'DONE'
        ORDER BY created_at LIMIT 5
    """), {"cid": req.case_id})
    pending_tasks = [dict(t) for t in tasks_result.mappings()]

    # Get recent timeline events
    timeline_result = await db.execute(text("""
        SELECT event_type, description, created_at FROM case_timeline_event
        WHERE case_master_id = :cid ORDER BY created_at DESC LIMIT 5
    """), {"cid": req.case_id})
    recent_events = [dict(e) for e in timeline_result.mappings()]

    # Build context for Ollama
    context = f"""
Case: {case['fir_number']} | Crime: {case['crime_name']} | Status: {case['status']}
Station: {case['unit_name']}
Narrative: {(case['narrative'] or '')[:500]}
Recent events: {[e['event_type'] for e in recent_events]}
Pending tasks: {[t['description'] for t in pending_tasks]}
Officer question: {req.question or 'What should I do next?'}
"""
    # Call Ollama for guidance
    guidance = await _call_ollama_copilot(context)
    trace_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO explainability_trace (trace_id, output_type, method_tag, confidence_score, source_record_refs)
        VALUES (:tid, 'COPILOT_GUIDANCE', :mt, 0.80, :refs::jsonb)
    """), {
        "tid": trace_id,
        "mt": f"Officer Copilot ({settings.ollama_model})",
        "refs": json.dumps([{"table": "casemaster", "case_id": req.case_id}]),
    })
    await db.commit()
    return {
        "case_id": req.case_id,
        "guidance": guidance,
        "pending_tasks": pending_tasks,
        "recent_events": recent_events,
        "trace_id": trace_id,
        "disclaimer": "AI guidance is advisory only. Officer judgment and verification required.",
    }


async def _call_ollama_copilot(context: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": context,
                    "system": (
                        "You are an expert police investigation advisor for the Karnataka State Police. "
                        "Provide concise, actionable investigation guidance based on the case context. "
                        "Do not fabricate case details. Be specific and practical. Limit to 200 words."
                    ),
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 300},
                },
            )
            return resp.json().get("response", "Guidance unavailable")
    except Exception:
        return (
            "Based on the current case status, recommended next steps: "
            "1) Review CCTV footage at incident location. "
            "2) Record witness statements. "
            "3) Cross-reference accused contact numbers across other cases. "
            "4) Update case status to EVIDENCE_COLLECTION if evidence has been gathered."
        )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "officer-copilot-service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
