from datetime import datetime, timedelta
from typing import Optional, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from backend.app.core.database import db
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["user"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    fullName: str
    phone: Optional[str] = None
    role: str
    devices: List[str] = []
    createdAt: datetime


class UserStats(BaseModel):
    totalTasks: int
    completedTasks: int
    completionRate: int
    currentStreak: int
    totalDeviceUsage: int


@router.get("/user/profile", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        username=current_user["username"],
        email=current_user["email"],
        fullName=current_user["fullName"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        devices=current_user.get("devices", []),
        createdAt=current_user["createdAt"],
    )


@router.get("/user/stats", response_model=UserStats)
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]

    programs = await db.programs.find({"userId": user_id}).to_list(1000)

    total_tasks = 0
    completed_tasks = 0
    for program in programs:
        for task in program.get("tasks", []):
            total_tasks += 1
            if task.get("completed"):
                completed_tasks += 1

    completion_rate = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

    streak = 0
    today = datetime.utcnow().date()
    for i in range(30):
        check_date = (today - timedelta(days=i)).isoformat()
        day_program = await db.programs.find_one({"userId": user_id, "date": check_date})
        if day_program:
            day_completed = all(task.get("completed", False) for task in day_program.get("tasks", []))
            if day_completed:
                streak += 1
            else:
                break
        else:
            break

    usage_records = await db.device_usage.find({"userId": ObjectId(user_id)}).to_list(1000)
    total_usage = sum(record.get("duration", 0) for record in usage_records)

    return UserStats(
        totalTasks=total_tasks,
        completedTasks=completed_tasks,
        completionRate=completion_rate,
        currentStreak=streak,
        totalDeviceUsage=total_usage,
    )


@router.get("/user/devices")
async def get_user_devices(current_user: dict = Depends(get_current_user)):
    device_names = current_user.get("devices", [])
    devices_with_info: list[dict] = []

    for device_name in device_names:
        product = await db.products.find_one({"name": device_name})
        usage_records = await db.device_usage.find({
            "userId": ObjectId(current_user["_id"]),
            "deviceType": device_name,
        }).to_list(1000)
        total_sessions = len(usage_records)
        total_minutes = sum(record.get("duration", 0) for record in usage_records)
        devices_with_info.append({
            "name": device_name,
            "description": product.get("description", "") if product else "",
            "category": product.get("category", "Other") if product else "Other",
            "totalSessions": total_sessions,
            "totalMinutes": total_minutes,
        })

    return {"devices": devices_with_info}


@router.get("/user/devices/{device_name}/usage")
async def get_device_usage_logs(device_name: str, current_user: dict = Depends(get_current_user)):
    usage_records = await db.device_usage.find({
        "userId": ObjectId(current_user["_id"]),
        "deviceType": device_name,
    }).sort("date", -1).limit(100).to_list(100)

    product = await db.products.find_one({"name": device_name})

    for record in usage_records:
        record["userId"] = str(record["userId"])

    return {
        "deviceName": device_name,
        "product": serialize_doc(product) if product else None,
        "usageLogs": [serialize_doc(r) for r in usage_records],
    }
