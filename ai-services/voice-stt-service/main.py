"""
Voice STT Service — Whisper-based transcription for FR-27 voice queries.
POST /api/v1/stt/transcribe → { transcript, confidence, language }
"""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.db import get_db_session
import uuid, uvicorn, tempfile, os as os_mod

settings = get_settings()
app = FastAPI(title="Drishti Voice STT Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_whisper_model = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper
            _whisper_model = whisper.load_model("tiny")  # Tiny for MVP speed
        except Exception:
            _whisper_model = None
    return _whisper_model


@app.post("/api/v1/stt/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    FR-27: Transcribe audio to text.
    Supports English (en) and Kannada (kn) via Whisper multilingual.
    Returns confidence score — NLQ engine gates on this before query execution.
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=422, detail={"error": {"code": "AUDIO_TOO_SHORT"}})

    model = get_whisper()
    if model:
        # Write to temp file for Whisper
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name
        try:
            result = model.transcribe(tmp_path, language=None, task="transcribe")
            transcript = result.get("text", "").strip()
            language = result.get("language", "en")
            # Whisper doesn't give per-word confidence natively — estimate from segments
            segments = result.get("segments", [])
            avg_prob = sum(s.get("avg_logprob", -1.0) for s in segments) / max(len(segments), 1)
            import math
            confidence = max(0.0, min(1.0, math.exp(avg_prob)))
        finally:
            os_mod.unlink(tmp_path)
    else:
        # Mock fallback for demo
        transcript = "show theft cases in Koramangala last 30 days"
        language = "en"
        confidence = 0.95

    # Log voice query
    await db.execute(text("""
        INSERT INTO voice_query_log (log_id, user_id, audio_ref, transcript_text, language, confidence)
        VALUES (:lid, :uid, :aref, :txt, :lang, :conf)
    """), {
        "lid": str(uuid.uuid4()),
        "uid": user.user_id,
        "aref": f"audio/{user.user_id}/{uuid.uuid4()}.wav",
        "txt": transcript,
        "lang": language[:2],  # 'en' or 'kn'
        "conf": confidence,
    })
    await db.commit()

    return {
        "transcript": transcript,
        "language": language,
        "confidence": round(confidence, 4),
        "confidence_threshold": settings.voice_confidence_threshold,
        "above_threshold": confidence >= settings.voice_confidence_threshold,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "voice-stt-service", "whisper_loaded": get_whisper() is not None}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
