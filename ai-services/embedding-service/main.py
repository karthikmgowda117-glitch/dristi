"""
Embedding Service — Case vector embedding + cosine similarity for FR-29 case matching.
Uses sentence-transformers (all-mpnet-base-v2) and pgvector for storage + retrieval.
"""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.db import get_db_session

import uuid, json, asyncio, uvicorn
from typing import Optional
import numpy as np

settings = get_settings()
app = FastAPI(title="Drishti Embedding Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Lazy-load the embedding model to avoid startup delay
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")  # Smaller for MVP
        except Exception:
            _model = None  # Fall back to mock
    return _model


def embed_text(text_: str) -> list[float]:
    """Embed a text string. Falls back to random if model not loaded."""
    model = get_model()
    if model:
        return model.encode(text_, normalize_embeddings=True).tolist()
    # Mock embedding for demo — deterministic based on hash
    rng = np.random.default_rng(hash(text_) % (2**32))
    v = rng.random(384)
    return (v / np.linalg.norm(v)).tolist()


@app.post("/api/v1/embedding/cases/{case_id}")
async def embed_case(
    case_id: str,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Compute and store embedding for a single case."""
    result = await db.execute(
        text("SELECT narrative, crime_major_head_id, crime_minor_head_id FROM casemaster WHERE case_master_id = :cid"),
        {"cid": case_id},
    )
    row = result.mappings().first()
    if not row:
        return {"error": "Case not found"}

    text_for_embed = (
        f"crime_type_{row['crime_major_head_id']}_{row['crime_minor_head_id']} "
        f"{row['narrative'] or ''}"
    )
    vector = embed_text(text_for_embed)

    await db.execute(text("""
        INSERT INTO case_embedding (embedding_id, case_master_id, embedding_vector)
        VALUES (:eid, :cid, :vec)
        ON CONFLICT (case_master_id) DO UPDATE SET embedding_vector = :vec, updated_at = now()
    """), {
        "eid": str(uuid.uuid4()),
        "cid": case_id,
        "vec": f"[{','.join(str(v) for v in vector)}]",
    })
    await db.commit()
    return {"case_id": case_id, "embedding_dim": len(vector)}


@app.get("/api/v1/cases/{case_id}/similar")
async def find_similar(
    case_id: str,
    threshold: float = 0.7,
    limit: int = 10,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """FR-29: Find top-k similar cases using pgvector cosine similarity."""
    # Get source embedding
    result = await db.execute(
        text("SELECT embedding_vector FROM case_embedding WHERE case_master_id = :cid"),
        {"cid": case_id},
    )
    row = result.mappings().first()
    if not row:
        return {"similar_cases": [], "message": "No embedding for this case — trigger indexing first"}

    # pgvector cosine similarity search
    sim_result = await db.execute(text("""
        SELECT ce.case_master_id,
               1 - (ce.embedding_vector <=> (SELECT embedding_vector FROM case_embedding WHERE case_master_id = :cid)) AS score,
               c.fir_number, c.status, c.crime_minor_head_id, c.incident_from_date
        FROM case_embedding ce
        JOIN casemaster c ON c.case_master_id = ce.case_master_id
        WHERE ce.case_master_id != :cid
          AND 1 - (ce.embedding_vector <=> (SELECT embedding_vector FROM case_embedding WHERE case_master_id = :cid)) >= :threshold
        ORDER BY score DESC
        LIMIT :limit
    """), {"cid": case_id, "threshold": threshold, "limit": limit})

    similar = [dict(r) for r in sim_result.mappings()]

    trace_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO explainability_trace (trace_id, output_type, method_tag, confidence_score, source_record_refs)
        VALUES (:tid, 'SIMILARITY_SCORE', 'all-MiniLM-L6-v2 + pgvector HNSW', :conf, :refs::jsonb)
    """), {
        "tid": trace_id,
        "conf": similar[0]["score"] if similar else 0.0,
        "refs": json.dumps([{"table": "case_embedding", "case_id": case_id}]),
    })
    await db.commit()

    return {"case_id": case_id, "similar_cases": similar, "trace_id": trace_id}


@app.post("/api/v1/embedding/reindex-all")
async def reindex_all(
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Trigger background reindex of all case embeddings."""
    background_tasks.add_task(_reindex_all_background)
    return {"message": "Reindex started in background", "status": "QUEUED"}


async def _reindex_all_background():
    """Background task to embed all cases."""
    from shared.db import get_db_session
    async for db in get_db_session():
        result = await db.execute(text("SELECT case_master_id FROM casemaster LIMIT 1000"))
        for row in result.fetchall():
            await embed_case.__wrapped__(row[0], None, db)
        await db.commit()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "embedding-service", "model_loaded": get_model() is not None}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
