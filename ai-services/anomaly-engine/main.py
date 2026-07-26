"""Anomaly Detection Engine — Z-score baseline statistical alerting."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
import uuid, json
from shared.auth import get_current_user, UserContext
from shared.config import get_settings
from shared.db import get_db_session

settings = get_settings()
app = FastAPI(title="Drishti Anomaly Engine", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

import uvicorn

class RunDetectionRequest(BaseModel):
    unit_id: Optional[str] = None
    crime_minor_head_id: Optional[int] = None
    baseline_window_days: int = 90


@app.post("/api/v1/anomaly/detect")
async def run_detection(
    req: RunDetectionRequest,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Compute Z-score for current 7-day crime count vs. 90-day baseline.
    Generates alert rows for z-score > 2.5 (HIGH) or > 2.0 (MEDIUM).
    """
    sql = """
        WITH baseline AS (
            SELECT
                c.unit_id,
                c.crime_minor_head_id,
                -- Count per 7-day window within the baseline period
                COUNT(*) FILTER (
                    WHERE c.incident_from_date >= CURRENT_DATE - :baseline_days * INTERVAL '1 day'
                    AND c.incident_from_date < CURRENT_DATE - 7 * INTERVAL '1 day'
                ) AS historical_count,
                -- Recent 7-day count
                COUNT(*) FILTER (
                    WHERE c.incident_from_date >= CURRENT_DATE - 7 * INTERVAL '1 day'
                ) AS recent_count,
                -- Simple average weekly rate
                COUNT(*) FILTER (
                    WHERE c.incident_from_date >= CURRENT_DATE - :baseline_days * INTERVAL '1 day'
                ) * 7.0 / NULLIF(:baseline_days, 0) AS expected_weekly
            FROM casemaster c
            WHERE 1=1
              AND (:unit_id IS NULL OR c.unit_id = :unit_id::uuid)
              AND (:crime_minor_head_id IS NULL OR c.crime_minor_head_id = :crime_minor_head_id)
            GROUP BY c.unit_id, c.crime_minor_head_id
        )
        SELECT
            unit_id,
            crime_minor_head_id,
            recent_count,
            expected_weekly,
            CASE WHEN expected_weekly > 0
                 THEN (recent_count - expected_weekly) / SQRT(GREATEST(expected_weekly, 1))
                 ELSE 0
            END AS z_score
        FROM baseline
        WHERE recent_count > 0
        ORDER BY z_score DESC
        LIMIT 20
    """
    result = await db.execute(text(sql), {
        "baseline_days": req.baseline_window_days,
        "unit_id": req.unit_id,
        "crime_minor_head_id": req.crime_minor_head_id,
    })
    rows = [dict(r) for r in result.mappings()]

    alerts_created = []
    for row in rows:
        z = float(row.get("z_score", 0))
        if z < 2.0:
            continue

        severity = "CRITICAL" if z > 4.0 else "HIGH" if z > 2.5 else "MEDIUM"
        alert_id = str(uuid.uuid4())
        trace_id = str(uuid.uuid4())

        # Persist explainability trace
        await db.execute(text("""
            INSERT INTO explainability_trace (trace_id, output_type, method_tag, confidence_score, source_record_refs)
            VALUES (:tid, 'ANOMALY_ALERT', 'Z-Score Baseline Detection v1', :confidence, :refs::jsonb)
        """), {
            "tid": trace_id,
            "confidence": min(1.0, z / 5.0),
            "refs": json.dumps([{"table": "casemaster", "unit_id": str(row["unit_id"]), "crime_minor_head_id": row["crime_minor_head_id"]}]),
        })

        # Create alert
        await db.execute(text("""
            INSERT INTO alert (alert_id, unit_id, crime_minor_head_id, severity, z_score, baseline_window_days, status)
            VALUES (:aid, :uid, :cmhid, :sev, :zscore, :bwd, 'OPEN')
            ON CONFLICT DO NOTHING
        """), {
            "aid": alert_id, "uid": str(row["unit_id"]), "cmhid": row["crime_minor_head_id"],
            "sev": severity, "zscore": z, "bwd": req.baseline_window_days,
        })

        alerts_created.append({"alert_id": alert_id, "unit_id": str(row["unit_id"]),
                                "crime_minor_head_id": row["crime_minor_head_id"],
                                "z_score": z, "severity": severity, "trace_id": trace_id})

    await db.commit()
    return {"alerts_created": len(alerts_created), "alerts": alerts_created}


@app.get("/api/v1/anomaly/results")
async def get_results(
    unit_id: Optional[str] = None,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        text("""
            SELECT alert_id, unit_id, crime_minor_head_id, severity, z_score,
                   baseline_window_days, triggered_at, status
            FROM alert WHERE status = 'OPEN' AND (:uid IS NULL OR unit_id = :uid::uuid)
            ORDER BY triggered_at DESC LIMIT 50
        """),
        {"uid": unit_id},
    )
    return [dict(r) for r in result.mappings()]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "anomaly-engine"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
