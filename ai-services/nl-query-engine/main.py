"""
NL Query Engine — FastAPI service
Orchestrates: STT → normalize → RAG → Ollama LLM → grammar validator → scope filter → execute → XAI
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.schemas import AIQueryResponse, ErrorResponse
from app.routers import query_router, voice_router, trace_router

settings = get_settings()

app = FastAPI(
    title="Drishti NL Query Engine",
    description="Natural language query orchestrator with RAG + constrained grammar + explainability",
    version="1.0.0",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(query_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")
app.include_router(trace_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "nl-query-engine"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
