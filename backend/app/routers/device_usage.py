from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends

from backend.app.core.database import db
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["device-usage"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/device-usage/my")
async def get_my_device_usage(current_user: dict = Depends(get_current_user)):
    usage = (
        await db.device_usage.find({"userId": ObjectId(current_user["_id"])})
        .sort("date", -1)
        .limit(50)
        .to_list(50)
    )
    for record in usage:
        record["userId"] = str(record["userId"])
    return [serialize_doc(u) for u in usage]


@router.post("/device-usage")
async def log_device_usage(usage: dict, current_user: dict = Depends(get_current_user)):
    usage_dict = dict(usage)
    usage_dict["userId"] = ObjectId(current_user["_id"])
    usage_dict["date"] = datetime.utcnow()
    result = await db.device_usage.insert_one(usage_dict)
    return {"id": str(result.inserted_id), "message": "Device usage logged successfully"}
