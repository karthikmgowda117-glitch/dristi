"""
Face Similarity Service — FR-30: Face embedding matching with pgvector.
POST /api/v1/intel/face/match — match uploaded face against accused embeddings.
"""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.db import get_db_session
import uuid, json, uvicorn
import numpy as np

settings = get_settings()
app = FastAPI(title="Drishti Face Similarity Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _mock_face_embedding(image_bytes: bytes) -> list[float]:
    """Mock face embedding — deterministic hash-based for demo."""
    rng = np.random.default_rng(hash(image_bytes[:50]) % (2**32))
    v = rng.random(512)
    return (v / np.linalg.norm(v)).tolist()


@app.post("/api/v1/intel/face/match")
async def face_match(
    image: UploadFile = File(...),
    threshold: float = 0.7,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """FR-30: Match a face image against stored face embeddings."""
    if user.role not in ("INVESTIGATOR", "ANALYST", "SHO", "SUPERVISOR", "ADMIN"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN"}})

    image_bytes = await image.read()
    if len(image_bytes) < 100:
        raise HTTPException(status_code=422, detail={"error": {"code": "IMAGE_TOO_SMALL"}})

    query_embedding = _mock_face_embedding(image_bytes)
    vec_str = f"[{','.join(str(v) for v in query_embedding)}]"

    # pgvector cosine similarity against face_embedding table
    result = await db.execute(text("""
        SELECT fe.embedding_id, fe.person_ref,
               1 - (fe.embedding_vector <=> :qvec::vector) AS similarity_score,
               a.name, a.age, a.gender
        FROM face_embedding fe
        LEFT JOIN accused a ON a.accused_id = fe.person_ref
        WHERE 1 - (fe.embedding_vector <=> :qvec::vector) >= :threshold
        ORDER BY similarity_score DESC
        LIMIT 5
    """), {"qvec": vec_str, "threshold": threshold})
    matches = [dict(r) for r in result.mappings()]

    trace_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO explainability_trace (trace_id, output_type, method_tag, confidence_score, source_record_refs)
        VALUES (:tid, 'FACE_MATCH', 'Mock Face Embedding + pgvector cosine (FR-30)', :conf, :refs::jsonb)
    """), {
        "tid": trace_id,
        "conf": matches[0]["similarity_score"] if matches else 0.0,
        "refs": json.dumps([{"table": "face_embedding", "query_size_bytes": len(image_bytes)}]),
    })
    await db.commit()

    return {
        "matches": matches,
        "threshold_used": threshold,
        "trace_id": trace_id,
        "note": "Biometric matching for investigation purposes only. Officer must verify all matches.",
    }


@app.get("/api/v1/intel/cctv/detections")
async def cctv_detections(
    camera_id: str | None = None,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get CCTV detection events."""
    result = await db.execute(text("""
        SELECT e.event_id, e.camera_id, e.detected_at, e.object_type, e.confidence,
               c.label, c.latitude, c.longitude
        FROM cctv_detection_event e
        JOIN cctv_camera c ON c.camera_id = e.camera_id
        WHERE (:cam_id IS NULL OR e.camera_id = :cam_id::uuid)
        ORDER BY e.detected_at DESC LIMIT 50
    """), {"cam_id": camera_id})
    return [dict(r) for r in result.mappings()]


@app.get("/api/v1/intel/vehicle/sightings")
async def vehicle_sightings(
    plate_number: str | None = None,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get vehicle sightings, optionally filtered by plate number."""
    result = await db.execute(text("""
        SELECT vs.sighting_id, vs.camera_id, vs.plate_number, vs.vehicle_attributes,
               vs.sighted_at, c.label, c.latitude, c.longitude
        FROM vehicle_sighting vs
        LEFT JOIN cctv_camera c ON c.camera_id = vs.camera_id
        WHERE (:plate IS NULL OR vs.plate_number ILIKE :plate_like)
        ORDER BY vs.sighted_at DESC LIMIT 50
    """), {
        "plate": plate_number,
        "plate_like": f"%{plate_number}%" if plate_number else "%",
    })
    return [dict(r) for r in result.mappings()]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "face-similarity-service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
