from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId

from backend.app.core.database import db


async def insert_telemetry(user_id: str, device_id: str, samples: List[Dict[str, Any]]) -> int:
    if not samples:
        return 0
    docs = [
        {
            "userId": ObjectId(user_id),
            "deviceId": device_id,
            "timestamp": s["timestamp"],
            "type": s["type"],
            "value": s["value"],
            "unit": s.get("unit"),
            "source": s.get("source") or "mobile",
            "createdAt": datetime.utcnow(),
        }
        for s in samples
    ]
    result = await db.telemetry.insert_many(docs)
    return len(result.inserted_ids)


async def fetch_recent_telemetry(user_id: str, limit: int = 50, type_: Optional[str] = None) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {"userId": ObjectId(user_id)}
    if type_:
        q["type"] = type_
    cursor = db.telemetry.find(q).sort("timestamp", -1).limit(max(1, min(limit, 500)))
    items: List[Dict[str, Any]] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["userId"] = str(doc["userId"])
        items.append(doc)
    return items
