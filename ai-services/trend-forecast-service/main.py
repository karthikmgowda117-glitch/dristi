"""
Trend Forecast Service — FR-37 aggregate crime forecasting.
Prophet time-series model. NO per-person or sub-jurisdiction profiling.
Column exclusion enforced at schema level (unit_id only, no accused/victim linkage).
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

import uuid, json, uvicorn
from typing import Optional
import numpy as np

settings = get_settings()
app = FastAPI(title="Drishti Trend Forecast Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ForecastRequest(BaseModel):
    unit_id: str
    crime_minor_head_id: int
    horizon_days: int = 30  # Must be 7, 14, or 30


@app.post("/api/v1/forecast")
async def generate_forecast(
    req: ForecastRequest,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    FR-37: Generate aggregate crime count forecast for a unit + crime type.
    Uses Prophet or simple linear extrapolation as fallback.
    GUARDRAIL: Only works on unit_id + crime_minor_head_id aggregates — no person linkage.
    """
    if req.horizon_days not in (7, 14, 30):
        raise HTTPException(status_code=422, detail={"error": {"code": "INVALID_HORIZON", "message": "horizon_days must be 7, 14, or 30"}})

    # Fetch historical daily counts (aggregate only — no accused/victim data)
    result = await db.execute(text("""
        SELECT incident_from_date::text AS ds, COUNT(*) AS y
        FROM casemaster
        WHERE unit_id = :uid
          AND crime_minor_head_id = :cmhid
          AND incident_from_date >= CURRENT_DATE - 180 * INTERVAL '1 day'
        GROUP BY incident_from_date
        ORDER BY ds
    """), {"uid": req.unit_id, "cmhid": req.crime_minor_head_id})
    rows = [dict(r) for r in result.mappings()]

    if len(rows) < 7:
        # Not enough data — return 0 with low confidence
        forecasted = 0.0
        lower, upper = 0.0, 0.0
        method_tag = "INSUFFICIENT_DATA_FALLBACK"
        confidence = 0.1
    else:
        # Use Prophet if available, else linear regression fallback
        method_tag, forecasted, lower, upper, confidence = _forecast(rows, req.horizon_days)

    forecast_id = str(uuid.uuid4())
    trace_id = str(uuid.uuid4())

    await db.execute(text("""
        INSERT INTO forecast_result (forecast_id, unit_id, crime_minor_head_id, horizon_days,
                                     forecasted_count, confidence_lower, confidence_upper, method_tag)
        VALUES (:fid, :uid, :cmhid, :hd, :fc, :cl, :cu, :mt)
    """), {
        "fid": forecast_id, "uid": req.unit_id, "cmhid": req.crime_minor_head_id,
        "hd": req.horizon_days, "fc": forecasted, "cl": lower, "cu": upper, "mt": method_tag,
    })

    await db.execute(text("""
        INSERT INTO explainability_trace (trace_id, output_type, method_tag, confidence_score, source_record_refs)
        VALUES (:tid, 'TREND_FORECAST', :mt, :conf, :refs::jsonb)
    """), {
        "tid": trace_id, "mt": method_tag,
        "conf": confidence,
        "refs": json.dumps([{"table": "casemaster", "unit_id": req.unit_id, "rows": len(rows)}]),
    })

    await db.commit()

    return {
        "forecast_id": forecast_id,
        "unit_id": req.unit_id,
        "crime_minor_head_id": req.crime_minor_head_id,
        "horizon_days": req.horizon_days,
        "forecasted_count": round(forecasted, 2),
        "confidence_lower": round(lower, 2),
        "confidence_upper": round(upper, 2),
        "method_tag": method_tag,
        "confidence": confidence,
        "trace_id": trace_id,
        "guardrail_note": "Forecast is aggregate-only (unit + crime type). No person/location sub-profiling.",
    }


@app.get("/api/v1/forecast")
async def get_forecasts(
    unit_id: str,
    crime_minor_head_id: Optional[int] = None,
    user: UserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get latest stored forecasts for a unit."""
    result = await db.execute(text("""
        SELECT forecast_id, unit_id, crime_minor_head_id, horizon_days,
               forecasted_count, confidence_lower, confidence_upper, method_tag, generated_at
        FROM forecast_result
        WHERE unit_id = :uid
          AND (:cmhid IS NULL OR crime_minor_head_id = :cmhid)
        ORDER BY generated_at DESC LIMIT 20
    """), {"uid": unit_id, "cmhid": crime_minor_head_id})
    return [dict(r) for r in result.mappings()]


def _forecast(rows: list, horizon_days: int):
    """Simple linear regression fallback when Prophet is unavailable."""
    try:
        from prophet import Prophet
        import pandas as pd

        df = pd.DataFrame(rows)
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)

        m = Prophet(daily_seasonality=False, weekly_seasonality=True, changepoint_prior_scale=0.05)
        m.fit(df)

        future = m.make_future_dataframe(periods=horizon_days)
        forecast_df = m.predict(future)
        tail = forecast_df.tail(horizon_days)

        total = float(tail["yhat"].sum())
        lower = float(tail["yhat_lower"].sum())
        upper = float(tail["yhat_upper"].sum())
        return "Prophet v1.1", total, max(0, lower), upper, 0.78

    except Exception:
        # Linear extrapolation fallback
        counts = [float(r["y"]) for r in rows[-14:]]
        if not counts:
            return "LINEAR_FALLBACK", 0.0, 0.0, 0.0, 0.2
        avg = np.mean(counts)
        weekly_rate = avg * 7
        total = weekly_rate * (horizon_days / 7)
        std = np.std(counts) * 7
        return "LINEAR_EXTRAPOLATION_FALLBACK", total, max(0, total - std), total + std, 0.55


@app.get("/health")
async def health():
    return {"status": "ok", "service": "trend-forecast-service"}

if __name__ == "__main__":
    import uvicorn as uv
    uv.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
