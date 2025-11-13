from fastapi import APIRouter, Depends

from backend.app.core.database import db
from backend.app.core.dependencies import get_admin_user

router = APIRouter(prefix="/api", tags=["analytics"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/admin/analytics", dependencies=[Depends(get_admin_user)])
async def get_analytics():
    total_users = await db.users.count_documents({"role": "user"})
    total_admins = await db.users.count_documents({"role": "admin"})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    pending_calls = await db.call_requests.count_documents({"status": "pending"})
    total_programs = await db.programs.count_documents({})

    recent_users = await db.users.find({}).sort("createdAt", -1).limit(5).to_list(5)

    return {
        "totalUsers": total_users,
        "totalAdmins": total_admins,
        "openTickets": open_tickets,
        "pendingCalls": pending_calls,
        "totalPrograms": total_programs,
        "recentUsers": [serialize_doc(u) for u in recent_users],
    }
