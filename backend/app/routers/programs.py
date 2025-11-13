from datetime import datetime, timedelta
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.database import db
from backend.app.core.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/api", tags=["programs"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


class TaskItem(BaseModel):
    taskId: str
    title: str
    description: str
    deviceType: str
    duration: str
    completed: bool = False
    completedAt: Optional[datetime] = None


class ProgramCreate(BaseModel):
    userId: str
    title: str
    description: str
    tasks: List[TaskItem]
    date: str


class TaskComplete(BaseModel):
    programId: str
    taskId: str


class TaskReschedule(BaseModel):
    programId: str
    taskId: str
    newDate: str


class BulkProgramCreate(BaseModel):
    userIds: List[str]
    title: str
    description: str
    tasks: List[TaskItem]
    startDate: str
    weeks: int


@router.get("/programs/today")
async def get_today_programs(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    programs = await db.programs.find({"userId": current_user["_id"], "date": today}).to_list(100)
    return [serialize_doc(p) for p in programs]


@router.get("/programs/upcoming")
async def get_upcoming_programs(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    programs = (
        await db.programs.find({"userId": current_user["_id"], "date": {"$gte": today}})
        .sort("date", 1)
        .limit(10)
        .to_list(10)
    )
    return [serialize_doc(p) for p in programs]


@router.get("/programs/history")
async def get_program_history(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    programs = (
        await db.programs.find({"userId": current_user["_id"], "date": {"$lt": today}})
        .sort("date", -1)
        .limit(30)
        .to_list(30)
    )
    return [serialize_doc(p) for p in programs]


@router.get("/programs/date/{date}")
async def get_programs_by_date(date: str, current_user: dict = Depends(get_current_user)):
    programs = await db.programs.find({"userId": current_user["_id"], "date": date}).to_list(100)
    return [serialize_doc(p) for p in programs]


@router.put("/programs/task/complete")
async def complete_task(task_data: TaskComplete, current_user: dict = Depends(get_current_user)):
    program = await db.programs.find_one({"_id": ObjectId(task_data.programId)})
    if not program or program["userId"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Program not found")

    today = datetime.utcnow().date().isoformat()
    if program.get("date") != today:
        raise HTTPException(status_code=400, detail="Tasks can only be completed on their scheduled date")

    tasks = program.get("tasks", [])
    for task in tasks:
        if task["taskId"] == task_data.taskId:
            task["completed"] = True
            task["completedAt"] = datetime.utcnow()
            break
    else:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.programs.update_one({"_id": ObjectId(task_data.programId)}, {"$set": {"tasks": tasks}})
    return {"message": "Task completed successfully"}


@router.put("/programs/task/reschedule")
async def reschedule_task(task_data: TaskReschedule, current_user: dict = Depends(get_current_user)):
    program = await db.programs.find_one({"_id": ObjectId(task_data.programId)})
    if not program or program["userId"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Program not found")

    tasks = program.get("tasks", [])
    task_to_reschedule = None
    for task in tasks:
        if task["taskId"] == task_data.taskId:
            if task.get("completed"):
                raise HTTPException(status_code=400, detail="Cannot reschedule completed task")
            task_to_reschedule = task
            break

    if not task_to_reschedule:
        raise HTTPException(status_code=404, detail="Task not found")

    existing_program = await db.programs.find_one({"userId": current_user["_id"], "date": task_data.newDate})
    if existing_program:
        existing_tasks = existing_program.get("tasks", [])
        if any(t["taskId"] == task_to_reschedule["taskId"] for t in existing_tasks):
            raise HTTPException(status_code=400, detail="Task already exists on this date")
        existing_tasks.append(task_to_reschedule)
        await db.programs.update_one({"_id": existing_program["_id"]}, {"$set": {"tasks": existing_tasks}})
    else:
        new_program = {
            "userId": current_user["_id"],
            "title": f"Rescheduled Tasks - {task_data.newDate}",
            "description": "Tasks rescheduled from other dates",
            "tasks": [task_to_reschedule],
            "date": task_data.newDate,
            "createdBy": current_user["_id"],
            "createdAt": datetime.utcnow(),
        }
        await db.programs.insert_one(new_program)

    updated_tasks = [t for t in tasks if t["taskId"] != task_data.taskId]
    if len(updated_tasks) == 0:
        await db.programs.delete_one({"_id": ObjectId(task_data.programId)})
    else:
        await db.programs.update_one({"_id": ObjectId(task_data.programId)}, {"$set": {"tasks": updated_tasks}})

    return {"message": "Task rescheduled successfully", "newDate": task_data.newDate}


@router.post("/programs", dependencies=[Depends(get_admin_user)])
async def create_program(program: ProgramCreate, current_user: dict = Depends(get_admin_user)):
    program_dict = program.dict()
    program_dict["createdBy"] = current_user["_id"]
    program_dict["createdAt"] = datetime.utcnow()
    result = await db.programs.insert_one(program_dict)
    return {"id": str(result.inserted_id), "message": "Program created successfully"}


@router.get("/programs/user/{user_id}", dependencies=[Depends(get_admin_user)])
async def get_user_programs(user_id: str):
    programs = await db.programs.find({"userId": user_id}).sort("date", -1).to_list(100)
    return [serialize_doc(p) for p in programs]


@router.post("/admin/programs/bulk", dependencies=[Depends(get_admin_user)])
async def create_bulk_programs(bulk_data: BulkProgramCreate, current_user: dict = Depends(get_admin_user)):
    start_date = datetime.fromisoformat(bulk_data.startDate).date()
    total_days = bulk_data.weeks * 7
    created_count = 0
    for user_id in bulk_data.userIds:
        for day in range(total_days):
            program_date = (start_date + timedelta(days=day)).isoformat()
            program_dict = {
                "userId": user_id,
                "title": f"{bulk_data.title} - Day {day + 1}",
                "description": bulk_data.description,
                "tasks": [task.dict() for task in bulk_data.tasks],
                "date": program_date,
                "createdBy": current_user["_id"],
                "createdAt": datetime.utcnow(),
            }
            await db.programs.insert_one(program_dict)
            created_count += 1
    return {
        "message": f"Successfully created {created_count} programs for {len(bulk_data.userIds)} users",
        "programsCreated": created_count,
        "usersAssigned": len(bulk_data.userIds),
        "duration": f"{bulk_data.weeks} weeks",
    }


@router.get("/admin/templates", dependencies=[Depends(get_admin_user)])
async def get_program_templates():
    templates = [
        {
            "id": "cryo-basic",
            "name": "Cryotherapy Basic",
            "description": "Basic cryotherapy protocol for beginners",
            "tasks": [
                {
                    "title": "Cryotherapy Session",
                    "description": "Full body cryotherapy",
                    "deviceType": "Cryotherapy Chamber",
                    "duration": "3 minutes",
                }
            ],
        },
        {
            "id": "redlight-recovery",
            "name": "Red Light Recovery",
            "description": "Red light therapy for cellular regeneration",
            "tasks": [
                {
                    "title": "Red Light Therapy",
                    "description": "Infrared sauna session",
                    "deviceType": "Red Light Sauna",
                    "duration": "20 minutes",
                }
            ],
        },
        {
            "id": "compression-recovery",
            "name": "Compression Recovery",
            "description": "Pneumatic compression therapy",
            "tasks": [
                {
                    "title": "Compression Therapy",
                    "description": "Full body compression for circulation",
                    "deviceType": "Compression Therapy",
                    "duration": "30 minutes",
                }
            ],
        },
        {
            "id": "full-protocol",
            "name": "Complete Wellness Protocol",
            "description": "Comprehensive daily wellness routine",
            "tasks": [
                {
                    "title": "Cryotherapy Session",
                    "description": "Full body cryotherapy",
                    "deviceType": "Cryotherapy Chamber",
                    "duration": "3 minutes",
                },
                {
                    "title": "Red Light Therapy",
                    "description": "Infrared sauna session",
                    "deviceType": "Red Light Sauna",
                    "duration": "20 minutes",
                },
                {
                    "title": "Compression Recovery",
                    "description": "Pneumatic compression",
                    "deviceType": "Compression Therapy",
                    "duration": "30 minutes",
                },
            ],
        },
    ]
    return templates


@router.get("/admin/user/{user_id}/progress", dependencies=[Depends(get_admin_user)])
async def get_user_progress(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    programs = await db.programs.find({"userId": user_id}).sort("date", -1).to_list(1000)

    total_tasks = 0
    completed_tasks = 0
    task_history: list[dict] = []
    for program in programs:
        for task in program.get("tasks", []):
            total_tasks += 1
            task_entry = {
                "date": program["date"],
                "programTitle": program["title"],
                "taskTitle": task["title"],
                "deviceType": task["deviceType"],
                "duration": task["duration"],
                "completed": task.get("completed", False),
                "completedAt": task.get("completedAt"),
            }
            task_history.append(task_entry)
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

    usage = await db.device_usage.find({"userId": ObjectId(user_id)}).to_list(1000)
    total_usage = sum(record.get("duration", 0) for record in usage)

    return {
        "user": serialize_doc(user),
        "stats": {
            "totalTasks": total_tasks,
            "completedTasks": completed_tasks,
            "completionRate": completion_rate,
            "currentStreak": streak,
            "totalDeviceUsage": total_usage,
        },
        "taskHistory": task_history,
        "programCount": len(programs),
    }
