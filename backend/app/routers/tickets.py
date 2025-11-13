from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.app.core.database import db
from backend.app.core.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/api", tags=["tickets"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


class TicketCreate(BaseModel):
    type: str
    subject: str
    description: str
    productId: Optional[str] = None


class TicketWithVideo(BaseModel):
    type: str
    subject: str
    description: str
    productId: Optional[str] = None
    videoUrl: Optional[str] = None


class UpdateStatus(BaseModel):
    status: str


@router.post("/tickets")
async def create_ticket(ticket_data: TicketCreate, current_user: dict = Depends(get_current_user)):
    ticket_dict = {
        "userId": ObjectId(current_user["_id"]),
        "type": ticket_data.type,
        "subject": ticket_data.subject,
        "description": ticket_data.description,
        "productId": ticket_data.productId,
        "status": "open",
        "priority": "medium",
        "createdAt": datetime.utcnow(),
        "resolvedAt": None,
    }
    result = await db.tickets.insert_one(ticket_dict)
    return {"id": str(result.inserted_id), "message": "Ticket created successfully"}


@router.get("/tickets/my")
async def get_my_tickets(current_user: dict = Depends(get_current_user)):
    tickets = (
        await db.tickets.find({"userId": ObjectId(current_user["_id"])})
        .sort("createdAt", -1)
        .to_list(100)
    )
    for ticket in tickets:
        ticket["userId"] = str(ticket["userId"])
    return [serialize_doc(t) for t in tickets]


@router.get("/tickets", dependencies=[Depends(get_admin_user)])
async def get_all_tickets():
    tickets = await db.tickets.find({}).sort("createdAt", -1).to_list(500)
    for ticket in tickets:
        user_id = ticket["userId"]
        ticket["userId"] = str(ticket["userId"])
        user = await db.users.find_one({"_id": user_id})
        if user:
            ticket["userName"] = user.get("fullName", "Unknown")
    return [serialize_doc(t) for t in tickets]


@router.put("/tickets/{ticket_id}/status", dependencies=[Depends(get_admin_user)])
async def update_ticket_status(ticket_id: str, status_data: UpdateStatus):
    update_data = {"status": status_data.status}
    if status_data.status == "resolved":
        update_data["resolvedAt"] = datetime.utcnow()

    result = await db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket status updated successfully"}


@router.post("/tickets/with-video")
async def create_ticket_with_video(ticket: TicketWithVideo, current_user: dict = Depends(get_current_user)):
    ticket_dict = {
        "userId": ObjectId(current_user["_id"]),
        "type": ticket.type,
        "subject": ticket.subject,
        "description": ticket.description,
        "productId": ticket.productId,
        "videoUrl": ticket.videoUrl,
        "status": "open",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    result = await db.tickets.insert_one(ticket_dict)
    return {"message": "Ticket created successfully", "ticketId": str(result.inserted_id)}
