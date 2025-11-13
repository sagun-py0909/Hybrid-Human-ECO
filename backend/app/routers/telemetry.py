from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from backend.app.core.dependencies import get_current_user
from backend.app.services.telemetry_service import insert_telemetry, fetch_recent_telemetry

router = APIRouter(prefix="/api/device", tags=["telemetry"])


class TelemetrySample(BaseModel):
    timestamp: datetime
    type: str
    value: float
    unit: Optional[str] = None
    source: Optional[str] = None


class TelemetryIn(BaseModel):
    deviceId: str
    samples: List[TelemetrySample]


@router.post("/telemetry")
async def ingest_telemetry(payload: TelemetryIn, current_user: dict = Depends(get_current_user)):
    if not payload.samples:
        raise HTTPException(status_code=400, detail="No samples provided")

    inserted = await insert_telemetry(
        user_id=current_user["_id"],
        device_id=payload.deviceId,
        samples=[
            {
                "timestamp": s.timestamp,
                "type": s.type,
                "value": s.value,
                "unit": s.unit,
                "source": s.source,
            }
            for s in payload.samples
        ],
    )
    return {"inserted_count": inserted}


@router.get("/telemetry/recent")
async def get_recent_telemetry(
    limit: int = 50,
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    items = await fetch_recent_telemetry(
        user_id=current_user["_id"],
        limit=limit,
        type_=type,
    )
    return {"items": items}
