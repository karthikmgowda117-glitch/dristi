"""
NL Query Engine — Router
POST /api/v1/ai/query
POST /api/v1/ai/voice-query
GET  /api/v1/ai/trace/{traceId}
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import Optional
import uuid
import httpx

from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.db import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from .pipeline.rag import build_rag_context
from .pipeline.grammar import parse_query_intent, QueryIntent
from .pipeline.llm import call_ollama
from .pipeline.scope import apply_jurisdiction_scope
from .pipeline.executor import execute_intent
from .pipeline.explainability import build_trace

settings = get_settings()

query_router  = APIRouter(tags=["NL Query"])
voice_router  = APIRouter(tags=["Voice Query"])
trace_router  = APIRouter(tags=["Explainability"])


class NLQueryRequest(BaseModel):
    text: str
    context_case_id: Optional[str] = None


class NLQueryResponse(BaseModel):
    result_type: str
    data: object
    trace_id: str
    confidence: float
    reasoning_path: Optional[list] = None


# ─── POST /api/v1/ai/query ────────────────────────────────────────────────────
@query_router.post("/ai/query", response_model=NLQueryResponse)
async def nl_query(
    req: NLQueryRequest,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Full NL → Intent → Execute → Explain pipeline.
    LLM never generates raw SQL — only a constrained intent JSON.
    """
    # 1. Build RAG context (schema descriptions + jurisdiction context)
    rag_context = await build_rag_context(req.text, user, db)

    # 2. Call Ollama LLM with constrained system prompt
    llm_output = await call_ollama(req.text, rag_context)

    # 3. Parse + validate against constrained grammar
    intent: QueryIntent | None = parse_query_intent(llm_output)
    if intent is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {"code": "GRAMMAR_INVALID", "message": "Query could not be parsed. Try rephrasing."},
                "suggestion": "Example: 'Show theft cases in Koramangala last 30 days'",
            },
        )

    # 4. Apply jurisdiction scope filter (post-parse, before execution — cannot be bypassed by LLM)
    scoped_intent = apply_jurisdiction_scope(intent, user)

    # 5. Execute against read-only DB/Neo4j
    result = await execute_intent(scoped_intent, db)

    # 6. Build explainability trace
    trace = await build_trace(
        output_type=f"NL_QUERY_{intent.intent_type}",
        method_tag=f"NL Query → {intent.intent_type} ({settings.ollama_model})",
        confidence=result.get("confidence", 0.85),
        source_refs=result.get("source_refs", []),
        db=db,
    )

    return NLQueryResponse(
        result_type=intent.intent_type,
        data=result.get("data"),
        trace_id=trace["trace_id"],
        confidence=result.get("confidence", 0.85),
        reasoning_path=result.get("reasoning_path"),
    )


# ─── POST /api/v1/ai/voice-query ─────────────────────────────────────────────
@voice_router.post("/ai/voice-query")
async def voice_query(
    audio: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """STT → transcription → NL query pipeline."""
    # Proxy audio to voice-stt-service
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            stt_response = await client.post(
                f"http://voice-stt-service:{settings.port - 192}/api/v1/stt/transcribe",
                files={"audio": (audio.filename, await audio.read(), audio.content_type)},
            )
            stt_data = stt_response.json()
        except Exception:
            raise HTTPException(status_code=503, detail={"error": {"code": "STT_UNAVAILABLE"}})

    transcript = stt_data.get("transcript", "")
    confidence = stt_data.get("confidence", 0.0)

    if confidence < settings.voice_confidence_threshold:
        return {
            "transcript": transcript,
            "transcript_confidence": confidence,
            "query_result": None,
            "error": "Low confidence transcript — please confirm the text",
        }

    # Reuse NL query with the transcript
    query_result = await nl_query(NLQueryRequest(text=transcript), user, db)
    return {
        "transcript": transcript,
        "transcript_confidence": confidence,
        "query_result": query_result,
    }


# ─── GET /api/v1/ai/trace/:traceId ───────────────────────────────────────────
@trace_router.get("/ai/trace/{trace_id}")
async def get_trace(
    trace_id: str,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        text("SELECT * FROM explainability_trace WHERE trace_id = :tid"),
        {"tid": trace_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND"}})
    return dict(row)
