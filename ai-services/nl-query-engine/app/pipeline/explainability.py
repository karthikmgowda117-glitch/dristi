"""Build and persist explainability traces for every AI output."""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def build_trace(
    output_type: str,
    method_tag: str,
    confidence: float,
    source_refs: list,
    db: AsyncSession,
) -> dict:
    """
    Create an explainability_trace row and return the trace payload.
    Every AI output MUST call this — enforced by the router.
    """
    trace_id = str(uuid.uuid4())
    import json
    await db.execute(
        text("""
            INSERT INTO explainability_trace (trace_id, output_type, method_tag, confidence_score, source_record_refs)
            VALUES (:tid, :otype, :mtag, :cscore, :srefs::jsonb)
        """),
        {
            "tid": trace_id,
            "otype": output_type,
            "mtag": method_tag,
            "cscore": min(1.0, max(0.0, confidence)),
            "srefs": json.dumps(source_refs),
        },
    )
    await db.commit()
    return {
        "trace_id": trace_id,
        "output_type": output_type,
        "method_tag": method_tag,
        "confidence_score": confidence,
        "source_record_refs": source_refs,
    }
