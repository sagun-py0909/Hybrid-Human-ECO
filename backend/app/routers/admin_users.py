from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from backend.app.core.database import db
from backend.app.core.dependencies import get_admin_user
from backend.app.core.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin-users"])


def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/users", dependencies=[Depends(get_admin_user)])
async def get_all_users():
    users = await db.users.find({}).to_list(1000)
    return [serialize_doc(u) for u in users]


@router.put("/users/{user_id}/role", dependencies=[Depends(get_admin_user)])
async def update_user_role(user_id: str, role_data: dict):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_data.get("role")}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User role updated successfully"}


@router.delete("/users/{user_id}", dependencies=[Depends(get_admin_user)])
async def delete_user(user_id: str):
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


@router.put("/users/{user_id}/devices", dependencies=[Depends(get_admin_user)])
async def update_user_devices(user_id: str, devices_data: dict):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"devices": devices_data.get("devices", [])}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User devices updated successfully"}


class UserCreateIn(dict):
    username: str
    email: str
    password: str
    fullName: str
    phone: Optional[str]
    role: str
    devices: list[str]


@router.post("/users/create", dependencies=[Depends(get_admin_user)])
async def create_user_by_admin(user_data: dict, current_user: dict = Depends(get_admin_user)):
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data["username"]}, {"email": user_data["email"]}],
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user_dict = {
        "username": user_data["username"],
        "email": user_data["email"],
        "password": hash_password(user_data["password"]),
        "fullName": user_data.get("fullName"),
        "phone": user_data.get("phone"),
        "role": user_data.get("role", "user"),
        "devices": user_data.get("devices", []),
        "mode": "onboarding",
        "lifecycleForm": None,
        "onboardingStartDate": datetime.utcnow(),
        "onboardingCompletedDate": None,
        "autoUnlockAfter25Days": True,
        "createdAt": datetime.utcnow(),
    }

    result = await db.users.insert_one(user_dict)
    return {
        "id": str(result.inserted_id),
        "message": "User created successfully",
        "username": user_data["username"],
        "email": user_data["email"],
    }


@router.get("/users-with-mode")
async def get_users_with_mode(current_user: dict = Depends(get_admin_user)):
    users = await db.users.find({},{"password":0}).to_list(1000)
    users_list = []
    for user in users:
        user_dict = serialize_doc(user)
        if "mode" not in user_dict:
            user_dict["mode"] = "unlocked"
        users_list.append(user_dict)
    return {"users": users_list}


@router.put("/user/{user_id}/mode")
async def update_user_mode(user_id: str, mode_update: dict, current_user: dict = Depends(get_admin_user)):
    update_data = {"mode": mode_update.get("mode", "unlocked")}
    if update_data["mode"] == "unlocked":
        update_data["onboardingCompletedDate"] = datetime.utcnow()
    result = await db.users.update_one({"_id": ObjectId(user_id)},{"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User mode updated to {update_data['mode']}"}


@router.get("/export/user-data")
async def export_user_data(current_user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"password": 0}).to_list(1000)
    export_data = []
    for user in users:
        user_id = str(user["_id"]) 
        programs = await db.programs.find({"userId": user_id}).to_list(1000)
        total_tasks = 0
        completed_tasks = 0
        for program in programs:
            tasks = program.get("tasks", [])
            total_tasks += len(tasks)
            completed_tasks += sum(1 for task in tasks if task.get("completed", False))
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        device_usage_logs = await db.device_usage.find({"userId": user_id}).to_list(1000)
        total_sessions = len(device_usage_logs)
        total_minutes = sum(log.get("duration", 0) for log in device_usage_logs)
        tickets = await db.tickets.find({"userId": user_id}).to_list(100)
        calls = await db.call_requests.find({"userId": user_id}).to_list(100)
        export_data.append({
            "User ID": user_id,
            "Username": user.get("username", ""),
            "Email": user.get("email", ""),
            "Full Name": user.get("fullName", ""),
            "Phone": user.get("phone", ""),
            "Role": user.get("role", "user"),
            "Mode": user.get("mode", "unlocked"),
            "Devices": ", ".join(user.get("devices", [])),
            "Total Tasks": total_tasks,
            "Completed Tasks": completed_tasks,
            "Completion Rate (%)": f"{completion_rate:.1f}",
            "Total Device Sessions": total_sessions,
            "Total Minutes": total_minutes,
            "Tickets Raised": len(tickets),
            "Call Requests": len(calls),
            "Created At": user.get("createdAt", "").isoformat() if hasattr(user.get("createdAt", None), 'isoformat') else "",
        })
    return {"data": export_data}
