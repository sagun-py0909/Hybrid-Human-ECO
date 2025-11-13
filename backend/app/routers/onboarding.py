from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from bson import ObjectId

from backend.app.core.database import db
from backend.app.core.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/api", tags=["onboarding"])


# Models (scoped to this router to avoid circular imports)
class ShipmentStage(BaseModel):
    stage: str  # ordered/shipped/out_for_delivery/installed
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    note: Optional[str] = None
    eta: Optional[str] = None


class DNAStage(BaseModel):
    stage: str  # collection_scheduled/sample_collected/analysis_in_progress/report_ready
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    labName: Optional[str] = None
    adminNotes: Optional[str] = None


class LifecycleFormStep1(BaseModel):
    fullName: str
    phone: Optional[str] = None
    age: int
    gender: str
    height: float
    weight: float


class LifecycleFormStep2(BaseModel):
    sleepHours: float
    stressLevel: int
    fitnessLevel: str


class LifecycleFormStep3(BaseModel):
    dietType: str
    allergies: Optional[str] = None
    supplementUse: Optional[str] = None
    hydrationLevel: str


class LifecycleFormStep4(BaseModel):
    conditions: Optional[str] = None
    medications: Optional[str] = None
    familyHistory: Optional[str] = None
    healthGoals: str


class LifecycleFormComplete(BaseModel):
    step1: LifecycleFormStep1
    step2: LifecycleFormStep2
    step3: LifecycleFormStep3
    step4: LifecycleFormStep4


@router.post("/lifecycle-form")
async def submit_lifecycle_form(form_data: LifecycleFormComplete, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"lifecycleForm": form_data.dict()}},
    )

    shipment_tracking = {
        "userId": current_user["_id"],
        "currentStage": "ordered",
        "stages": [
            {"stage": "ordered", "timestamp": datetime.utcnow(), "note": "Order placed", "eta": None}
        ],
    }
    await db.shipment_tracking.insert_one(shipment_tracking)

    dna_tracking = {
        "userId": current_user["_id"],
        "currentStage": "collection_scheduled",
        "stages": [
            {
                "stage": "collection_scheduled",
                "timestamp": datetime.utcnow(),
                "labName": None,
                "adminNotes": "DNA collection kit will be scheduled soon",
            }
        ],
    }
    await db.dna_tracking.insert_one(dna_tracking)

    return {"message": "Lifecycle form submitted successfully", "status": "onboarding"}


@router.get("/user/mode")
async def get_user_mode(current_user: dict = Depends(get_current_user)):
    return {
        "mode": current_user.get("mode", "unlocked"),
        "onboardingStartDate": current_user.get("onboardingStartDate"),
        "lifecycleFormCompleted": current_user.get("lifecycleForm") is not None,
    }


@router.get("/shipment-tracking")
async def get_shipment_tracking(current_user: dict = Depends(get_current_user)):
    tracking = await db.shipment_tracking.find_one({"userId": current_user["_id"]})
    if not tracking:
        return {"currentStage": None, "stages": []}
    tracking["_id"] = str(tracking["_id"])
    return tracking


@router.get("/dna-tracking")
async def get_dna_tracking(current_user: dict = Depends(get_current_user)):
    tracking = await db.dna_tracking.find_one({"userId": current_user["_id"]})
    if not tracking:
        return {"currentStage": None, "stages": []}
    tracking["_id"] = str(tracking["_id"])
    return tracking


@router.post("/dna-collection-request")
async def request_dna_collection(
    address: str,
    preferredDate: str,
    preferredTime: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    request_dict = {
        "userId": current_user["_id"],
        "fullName": current_user["fullName"],
        "email": current_user["email"],
        "phone": current_user.get("phone", ""),
        "address": address,
        "preferredDate": preferredDate,
        "preferredTime": preferredTime,
        "notes": notes,
        "status": "pending",
        "createdAt": datetime.utcnow(),
    }
    result = await db.dna_collection_requests.insert_one(request_dict)
    return {"message": "DNA collection request submitted successfully", "requestId": str(result.inserted_id)}


@router.get("/dna-collection-request/my")
async def get_my_dna_collection_request(current_user: dict = Depends(get_current_user)):
    request_ = await db.dna_collection_requests.find_one({"userId": current_user["_id"]})
    if request_:
        request_["_id"] = str(request_["_id"])
    return request_ or {}


# Admin endpoints
@router.put("/admin/shipment-tracking/{user_id}")
async def update_shipment_tracking(user_id: str, stage_update: ShipmentStage, current_user: dict = Depends(get_admin_user)):
    tracking = await db.shipment_tracking.find_one({"userId": user_id})
    if not tracking:
        tracking = {"userId": user_id, "currentStage": stage_update.stage, "stages": [stage_update.dict()]}
        await db.shipment_tracking.insert_one(tracking)
    else:
        await db.shipment_tracking.update_one(
            {"userId": user_id},
            {"$set": {"currentStage": stage_update.stage}, "$push": {"stages": stage_update.dict()}},
        )
    return {"message": "Shipment tracking updated successfully"}


@router.get("/admin/shipment-tracking/{user_id}")
async def get_user_shipment_tracking(user_id: str, current_user: dict = Depends(get_admin_user)):
    tracking = await db.shipment_tracking.find_one({"userId": user_id})
    if not tracking:
        return {"currentStage": None, "stages": []}
    tracking["_id"] = str(tracking["_id"])
    return tracking


@router.put("/admin/dna-tracking/{user_id}")
async def update_dna_tracking(user_id: str, stage_update: DNAStage, current_user: dict = Depends(get_admin_user)):
    tracking = await db.dna_tracking.find_one({"userId": user_id})
    if not tracking:
        tracking = {"userId": user_id, "currentStage": stage_update.stage, "stages": [stage_update.dict()]}
        await db.dna_tracking.insert_one(tracking)
    else:
        await db.dna_tracking.update_one(
            {"userId": user_id},
            {"$set": {"currentStage": stage_update.stage}, "$push": {"stages": stage_update.dict()}},
        )
    return {"message": "DNA tracking updated successfully"}


@router.get("/admin/dna-tracking/{user_id}")
async def get_user_dna_tracking(user_id: str, current_user: dict = Depends(get_admin_user)):
    tracking = await db.dna_tracking.find_one({"userId": user_id})
    if not tracking:
        return {"currentStage": None, "stages": []}
    tracking["_id"] = str(tracking["_id"])
    return tracking


@router.get("/admin/onboarding-stats")
async def get_onboarding_stats(current_user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    onboarding_users = await db.users.count_documents({"mode": "onboarding"})
    unlocked_users = total_users - onboarding_users

    shipment_stages: dict[str, int] = {}
    shipments = await db.shipment_tracking.find({}).to_list(1000)
    for shipment in shipments:
        stage = shipment.get("currentStage", "unknown")
        shipment_stages[stage] = shipment_stages.get(stage, 0) + 1

    dna_stages: dict[str, int] = {}
    dna_trackings = await db.dna_tracking.find({}).to_list(1000)
    for dna in dna_trackings:
        stage = dna.get("currentStage", "unknown")
        dna_stages[stage] = dna_stages.get(stage, 0) + 1

    active_tickets = await db.tickets.count_documents({"status": {"$ne": "closed"}})

    return {
        "totalUsers": total_users,
        "onboardingUsers": onboarding_users,
        "unlockedUsers": unlocked_users,
        "shipmentStages": shipment_stages,
        "dnaStages": dna_stages,
        "activeTickets": active_tickets,
    }


@router.get("/admin/dna-collection-requests")
async def get_all_dna_collection_requests(current_user: dict = Depends(get_admin_user)):
    requests = await db.dna_collection_requests.find({}).sort("createdAt", -1).to_list(1000)
    return {"requests": [{**r, "_id": str(r["_id"]) } for r in requests]}


@router.put("/admin/dna-collection-request/{request_id}/status")
async def update_dna_collection_request_status(
    request_id: str,
    status: str,
    scheduledDate: Optional[str] = None,
    scheduledTime: Optional[str] = None,
    adminNotes: Optional[str] = None,
    current_user: dict = Depends(get_admin_user),
):
    update_data = {"status": status}
    if scheduledDate:
        update_data["scheduledDate"] = scheduledDate
    if scheduledTime:
        update_data["scheduledTime"] = scheduledTime
    if adminNotes:
        update_data["adminNotes"] = adminNotes

    result = await db.dna_collection_requests.update_one({"_id": ObjectId(request_id)}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or unchanged")
    return {"message": "DNA collection request updated successfully"}
