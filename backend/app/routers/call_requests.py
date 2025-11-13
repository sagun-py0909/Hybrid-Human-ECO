from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.app.core.database import db
from backend.app.core.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/api", tags=["call-requests"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


class CallRequestCreate(BaseModel):
    requestType: str
    preferredDate: str
    preferredTime: str
    notes: str | None = None


class UpdateStatus(BaseModel):
    status: str


@router.post("/call-requests")
async def create_call_request(call_data: CallRequestCreate, current_user: dict = Depends(get_current_user)):
    call_dict = {
        "userId": ObjectId(current_user["_id"]),
        "requestType": call_data.requestType,
        "preferredDate": call_data.preferredDate,
        "preferredTime": call_data.preferredTime,
        "notes": call_data.notes,
        "status": "pending",
        "createdAt": datetime.utcnow(),
    }
    result = await db.call_requests.insert_one(call_dict)
    return {"id": str(result.inserted_id), "message": "Call request submitted successfully"}


@router.get("/call-requests/my")
async def get_my_call_requests(current_user: dict = Depends(get_current_user)):
    requests = (
        await db.call_requests.find({"userId": ObjectId(current_user["_id"])})
        .sort("createdAt", -1)
        .to_list(100)
    )
    for req in requests:
        req["userId"] = str(req["userId"])
    return [serialize_doc(r) for r in requests]


@router.get("/call-requests", dependencies=[Depends(get_admin_user)])
async def get_all_call_requests():
    requests = await db.call_requests.find({}).sort("createdAt", -1).to_list(500)
    for req in requests:
        req["userId"] = str(req["userId"])
        user = await db.users.find_one({"_id": ObjectId(req["userId"])})
        if user:
            req["userName"] = user.get("fullName", "Unknown")
            req["userEmail"] = user.get("email", "")
            req["userPhone"] = user.get("phone", "")
    return [serialize_doc(r) for r in requests]


@router.put("/call-requests/{request_id}/status", dependencies=[Depends(get_admin_user)])
async def update_call_request_status(request_id: str, status_data: UpdateStatus):
    result = await db.call_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": status_data.status}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Call request not found")
    return {"message": "Call request status updated successfully"}
