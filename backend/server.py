from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "hybrid-human-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Hybrid Human API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ============= MODELS =============

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    fullName: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str  # username or email
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    fullName: str
    phone: Optional[str] = None
    role: str
    devices: List[str] = []
    createdAt: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TaskItem(BaseModel):
    taskId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    deviceType: str
    duration: str
    completed: bool = False
    completedAt: Optional[datetime] = None

class Program(BaseModel):
    userId: str
    title: str
    description: str
    tasks: List[TaskItem]
    date: str  # YYYY-MM-DD format
    createdBy: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class ProgramCreate(BaseModel):
    userId: str
    title: str
    description: str
    tasks: List[TaskItem]
    date: str

class TaskComplete(BaseModel):
    programId: str
    taskId: str

class Ticket(BaseModel):
    userId: str
    type: str  # "program" or "machine"
    subject: str
    description: str
    status: str = "open"
    priority: str = "medium"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    resolvedAt: Optional[datetime] = None

class TicketCreate(BaseModel):
    type: str
    subject: str
    description: str
    productId: Optional[str] = None

class CallRequest(BaseModel):
    userId: str
    requestType: str  # "program" or "test"
    preferredDate: str
    preferredTime: str
    notes: Optional[str] = None
    status: str = "pending"
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class CallRequestCreate(BaseModel):
    requestType: str
    preferredDate: str
    preferredTime: str
    notes: Optional[str] = None

class DeviceUsage(BaseModel):
    userId: str
    deviceType: str
    duration: int  # in minutes
    date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

class DeviceUsageCreate(BaseModel):
    deviceType: str
    duration: int  # in minutes
    notes: Optional[str] = None

class Report(BaseModel):
    userId: str
    title: str
    reportType: str
    pdfData: str  # base64 encoded
    date: datetime = Field(default_factory=datetime.utcnow)
    createdBy: str

class ReportUpload(BaseModel):
    userId: str
    title: str
    reportType: str
    pdfData: str  # base64 encoded

class UpdateStatus(BaseModel):
    status: str

class BulkProgramCreate(BaseModel):
    userIds: List[str]
    title: str
    description: str
    tasks: List[TaskItem]
    startDate: str
    weeks: int  # Duration in weeks

class Product(BaseModel):
    name: str
    description: str
    category: str
    serialNumber: Optional[str] = None
    purchaseDate: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: str
    category: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    fullName: str
    phone: Optional[str] = None
    role: str = "user"
    devices: List[str] = []

class UserDevicesUpdate(BaseModel):
    devices: List[str]

class UserStats(BaseModel):
    totalTasks: int
    completedTasks: int
    completionRate: int
    currentStreak: int
    totalDeviceUsage: int


# ============= ONBOARDING SYSTEM MODELS =============

class LifecycleFormStep1(BaseModel):
    name: str
    age: int
    gender: str
    height: float  # in cm
    weight: float  # in kg
    email: EmailStr
    phone: str

class LifecycleFormStep2(BaseModel):
    sleepHours: float
    sleepQuality: int  # 1-5
    sleepIssues: Optional[str] = None
    stressLevel: int  # 1-5
    fitnessLevel: str  # beginner/intermediate/advanced

class LifecycleFormStep3(BaseModel):
    dietType: str  # veg/non-veg/vegan
    allergies: Optional[str] = None
    supplementUse: Optional[str] = None
    hydrationLevel: str  # low/medium/high

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

class ShipmentStage(BaseModel):
    stage: str  # ordered/shipped/out_for_delivery/installed
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    note: Optional[str] = None
    eta: Optional[str] = None  # estimated delivery date

class ShipmentTracking(BaseModel):
    userId: str
    currentStage: str = "ordered"
    stages: List[ShipmentStage] = []

class DNAStage(BaseModel):
    stage: str  # collection_scheduled/sample_collected/analysis_in_progress/report_ready
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    labName: Optional[str] = None
    adminNotes: Optional[str] = None

class DNATracking(BaseModel):
    userId: str
    currentStage: str = "collection_scheduled"
    stages: List[DNAStage] = []

class UserModeUpdate(BaseModel):
    mode: str  # onboarding/unlocked

class TicketWithVideo(BaseModel):
    type: str  # machine/program/test
    subject: str
    description: str
    productId: Optional[str] = None
    videoUrl: Optional[str] = None  # S3 URL placeholder

class OnboardingStats(BaseModel):
    totalUsers: int
    onboardingUsers: int
    unlockedUsers: int
    shipmentStages: dict
    dnaStages: dict
    activeTickets: int

# ============= AUTH UTILITIES =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return serialize_doc(user)

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data.username}, {"email": user_data.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Create user
    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "fullName": user_data.fullName,
        "phone": user_data.phone,
        "role": "user",
        "devices": [],
        "mode": "onboarding",  # New: Default to onboarding mode
        "lifecycleForm": None,  # New: Will be filled after registration
        "onboardingStartDate": datetime.utcnow(),  # New: Track onboarding start
        "onboardingCompletedDate": None,  # New: Set when unlocked
        "autoUnlockAfter25Days": True,  # New: Enable auto-unlock
        "createdAt": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Create token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    user_response = UserResponse(
        id=str(result.inserted_id),
        username=user_dict["username"],
        email=user_dict["email"],
        fullName=user_dict["fullName"],
        phone=user_dict.get("phone"),
        role=user_dict["role"],
        devices=user_dict["devices"],
        createdAt=user_dict["createdAt"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Find user by username or email
    user = await db.users.find_one({
        "$or": [{"username": credentials.identifier}, {"email": credentials.identifier}]
    })
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    user_response = UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        fullName=user["fullName"],
        phone=user.get("phone"),
        role=user["role"],
        devices=user.get("devices", []),
        createdAt=user["createdAt"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        username=current_user["username"],
        email=current_user["email"],
        fullName=current_user["fullName"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        devices=current_user.get("devices", []),
        createdAt=current_user["createdAt"]
    )

@api_router.post("/auth/password-reset-request")
async def password_reset_request(email: EmailStr):
    # Mock implementation for now
    return {"message": "Password reset email sent (mock)"}

# ============= USER ROUTES =============

@api_router.get("/user/profile", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        username=current_user["username"],
        email=current_user["email"],
        fullName=current_user["fullName"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        devices=current_user.get("devices", []),
        createdAt=current_user["createdAt"]
    )

@api_router.get("/user/stats", response_model=UserStats)
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    # Get all programs for user
    programs = await db.programs.find({"userId": user_id}).to_list(1000)
    
    total_tasks = 0
    completed_tasks = 0
    
    for program in programs:
        for task in program.get("tasks", []):
            total_tasks += 1
            if task.get("completed"):
                completed_tasks += 1
    
    completion_rate = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
    
    # Calculate streak (simplified)
    streak = 0
    today = datetime.utcnow().date()
    for i in range(30):  # Check last 30 days
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
    
    # Total device usage
    usage_records = await db.device_usage.find({"userId": ObjectId(user_id)}).to_list(1000)
    total_usage = sum(record.get("duration", 0) for record in usage_records)
    
    return UserStats(
        totalTasks=total_tasks,
        completedTasks=completed_tasks,
        completionRate=completion_rate,
        currentStreak=streak,
        totalDeviceUsage=total_usage
    )

# ============= PROGRAM ROUTES =============

@api_router.get("/programs/today")
async def get_today_programs(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    programs = await db.programs.find({
        "userId": current_user["_id"],
        "date": today
    }).to_list(100)
    return [serialize_doc(p) for p in programs]

@api_router.get("/programs/upcoming")
async def get_upcoming_programs(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    programs = await db.programs.find({
        "userId": current_user["_id"],
        "date": {"$gte": today}
    }).sort("date", 1).limit(10).to_list(10)
    return [serialize_doc(p) for p in programs]

@api_router.get("/programs/history")
async def get_program_history(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    programs = await db.programs.find({
        "userId": current_user["_id"],
        "date": {"$lt": today}
    }).sort("date", -1).limit(30).to_list(30)
    return [serialize_doc(p) for p in programs]

@api_router.get("/programs/date/{date}")
async def get_programs_by_date(date: str, current_user: dict = Depends(get_current_user)):
    programs = await db.programs.find({
        "userId": current_user["_id"],
        "date": date
    }).to_list(100)
    return [serialize_doc(p) for p in programs]

@api_router.put("/programs/task/complete")
async def complete_task(task_data: TaskComplete, current_user: dict = Depends(get_current_user)):
    program = await db.programs.find_one({"_id": ObjectId(task_data.programId)})
    if not program or program["userId"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Check if the program is for today
    today = datetime.utcnow().date().isoformat()
    program_date = program.get("date")
    
    if program_date != today:
        raise HTTPException(
            status_code=400, 
            detail="Tasks can only be completed on their scheduled date"
        )
    
    # Update task
    tasks = program.get("tasks", [])
    task_found = False
    for task in tasks:
        if task["taskId"] == task_data.taskId:
            task["completed"] = True
            task["completedAt"] = datetime.utcnow()
            task_found = True
            break
    
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.programs.update_one(
        {"_id": ObjectId(task_data.programId)},
        {"$set": {"tasks": tasks}}
    )
    
    return {"message": "Task completed successfully"}

@api_router.post("/programs", dependencies=[Depends(get_admin_user)])
async def create_program(program: ProgramCreate, current_user: dict = Depends(get_admin_user)):
    program_dict = program.dict()
    program_dict["createdBy"] = current_user["_id"]
    program_dict["createdAt"] = datetime.utcnow()
    
    result = await db.programs.insert_one(program_dict)
    return {"id": str(result.inserted_id), "message": "Program created successfully"}

@api_router.get("/programs/user/{user_id}", dependencies=[Depends(get_admin_user)])
async def get_user_programs(user_id: str):
    programs = await db.programs.find({"userId": user_id}).sort("date", -1).to_list(100)
    return [serialize_doc(p) for p in programs]

# ============= TICKET ROUTES =============

@api_router.post("/tickets")
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
        "resolvedAt": None
    }
    
    result = await db.tickets.insert_one(ticket_dict)
    return {"id": str(result.inserted_id), "message": "Ticket created successfully"}

@api_router.get("/tickets/my")
async def get_my_tickets(current_user: dict = Depends(get_current_user)):
    tickets = await db.tickets.find({"userId": ObjectId(current_user["_id"])}).sort("createdAt", -1).to_list(100)
    for ticket in tickets:
        ticket["userId"] = str(ticket["userId"])
    return [serialize_doc(t) for t in tickets]

@api_router.get("/tickets", dependencies=[Depends(get_admin_user)])
async def get_all_tickets():
    tickets = await db.tickets.find({}).sort("createdAt", -1).to_list(500)
    for ticket in tickets:
        user_id = ticket["userId"]
        ticket["userId"] = str(ticket["userId"])
        # Get user info
        user = await db.users.find_one({"_id": user_id})
        if user:
            ticket["userName"] = user.get("fullName", "Unknown")
    return [serialize_doc(t) for t in tickets]

@api_router.put("/tickets/{ticket_id}/status", dependencies=[Depends(get_admin_user)])
async def update_ticket_status(ticket_id: str, status_data: UpdateStatus):
    update_data = {"status": status_data.status}
    if status_data.status == "resolved":
        update_data["resolvedAt"] = datetime.utcnow()
    
    result = await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Ticket status updated successfully"}

# ============= CALL REQUEST ROUTES =============

@api_router.post("/call-requests")
async def create_call_request(call_data: CallRequestCreate, current_user: dict = Depends(get_current_user)):
    call_dict = {
        "userId": ObjectId(current_user["_id"]),
        "requestType": call_data.requestType,
        "preferredDate": call_data.preferredDate,
        "preferredTime": call_data.preferredTime,
        "notes": call_data.notes,
        "status": "pending",
        "createdAt": datetime.utcnow()
    }
    
    result = await db.call_requests.insert_one(call_dict)
    return {"id": str(result.inserted_id), "message": "Call request submitted successfully"}

@api_router.get("/call-requests/my")
async def get_my_call_requests(current_user: dict = Depends(get_current_user)):
    requests = await db.call_requests.find({"userId": ObjectId(current_user["_id"])}).sort("createdAt", -1).to_list(100)
    for req in requests:
        req["userId"] = str(req["userId"])
    return [serialize_doc(r) for r in requests]

@api_router.get("/call-requests", dependencies=[Depends(get_admin_user)])
async def get_all_call_requests():
    requests = await db.call_requests.find({}).sort("createdAt", -1).to_list(500)
    for req in requests:
        req["userId"] = str(req["userId"])
        # Get user info
        user = await db.users.find_one({"_id": ObjectId(req["userId"])}) 
        if user:
            req["userName"] = user.get("fullName", "Unknown")
            req["userEmail"] = user.get("email", "")
            req["userPhone"] = user.get("phone", "")
    return [serialize_doc(r) for r in requests]

@api_router.put("/call-requests/{request_id}/status", dependencies=[Depends(get_admin_user)])
async def update_call_request_status(request_id: str, status_data: UpdateStatus):
    result = await db.call_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": status_data.status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Call request not found")
    
    return {"message": "Call request status updated successfully"}

# ============= REPORT ROUTES =============

@api_router.get("/reports/my")
async def get_my_reports(current_user: dict = Depends(get_current_user)):
    reports = await db.reports.find({"userId": ObjectId(current_user["_id"])}).sort("date", -1).to_list(100)
    for report in reports:
        report["userId"] = str(report["userId"])
        report["createdBy"] = str(report["createdBy"])
    return [serialize_doc(r) for r in reports]

@api_router.post("/reports", dependencies=[Depends(get_admin_user)])
async def create_report(report: Report, current_user: dict = Depends(get_admin_user)):
    report_dict = report.dict()
    report_dict["userId"] = ObjectId(report_dict["userId"])
    report_dict["createdBy"] = ObjectId(current_user["_id"])
    report_dict["date"] = datetime.utcnow()
    
    result = await db.reports.insert_one(report_dict)
    return {"id": str(result.inserted_id), "message": "Report created successfully"}

# ============= DEVICE USAGE ROUTES =============

@api_router.get("/device-usage/my")
async def get_my_device_usage(current_user: dict = Depends(get_current_user)):
    usage = await db.device_usage.find({"userId": ObjectId(current_user["_id"])}).sort("date", -1).limit(50).to_list(50)
    for record in usage:
        record["userId"] = str(record["userId"])
    return [serialize_doc(u) for u in usage]

@api_router.post("/device-usage")
async def log_device_usage(usage: DeviceUsageCreate, current_user: dict = Depends(get_current_user)):
    usage_dict = usage.dict()
    usage_dict["userId"] = ObjectId(current_user["_id"])
    usage_dict["date"] = datetime.utcnow()
    
    result = await db.device_usage.insert_one(usage_dict)
    return {"id": str(result.inserted_id), "message": "Device usage logged successfully"}

# ============= ADMIN ROUTES =============

@api_router.get("/admin/users", dependencies=[Depends(get_admin_user)])
async def get_all_users():
    users = await db.users.find({}).to_list(1000)
    return [serialize_doc(u) for u in users]

@api_router.put("/admin/users/{user_id}/role", dependencies=[Depends(get_admin_user)])
async def update_user_role(user_id: str, role_data: dict):
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_data.get("role")}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User role updated successfully"}

@api_router.delete("/admin/users/{user_id}", dependencies=[Depends(get_admin_user)])
async def delete_user(user_id: str):
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.get("/admin/analytics", dependencies=[Depends(get_admin_user)])
async def get_analytics():
    total_users = await db.users.count_documents({"role": "user"})
    total_admins = await db.users.count_documents({"role": "admin"})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    pending_calls = await db.call_requests.count_documents({"status": "pending"})
    total_programs = await db.programs.count_documents({})
    
    # Recent activity
    recent_users = await db.users.find({}).sort("createdAt", -1).limit(5).to_list(5)
    
    return {
        "totalUsers": total_users,
        "totalAdmins": total_admins,
        "openTickets": open_tickets,
        "pendingCalls": pending_calls,
        "totalPrograms": total_programs,
        "recentUsers": [serialize_doc(u) for u in recent_users]
    }

@api_router.post("/admin/programs/bulk", dependencies=[Depends(get_admin_user)])
async def create_bulk_programs(bulk_data: BulkProgramCreate, current_user: dict = Depends(get_admin_user)):
    """Create programs for multiple users over specified weeks"""
    from datetime import timedelta
    
    start_date = datetime.fromisoformat(bulk_data.startDate).date()
    total_days = bulk_data.weeks * 7
    created_count = 0
    
    for user_id in bulk_data.userIds:
        # Create daily programs for the duration
        for day in range(total_days):
            program_date = (start_date + timedelta(days=day)).isoformat()
            
            program_dict = {
                "userId": user_id,
                "title": f"{bulk_data.title} - Day {day + 1}",
                "description": bulk_data.description,
                "tasks": [task.dict() for task in bulk_data.tasks],
                "date": program_date,
                "createdBy": current_user["_id"],
                "createdAt": datetime.utcnow()
            }
            
            await db.programs.insert_one(program_dict)
            created_count += 1
    
    return {
        "message": f"Successfully created {created_count} programs for {len(bulk_data.userIds)} users",
        "programsCreated": created_count,
        "usersAssigned": len(bulk_data.userIds),
        "duration": f"{bulk_data.weeks} weeks"
    }

@api_router.get("/admin/templates", dependencies=[Depends(get_admin_user)])
async def get_program_templates():
    """Get predefined program templates"""
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
                    "duration": "3 minutes"
                }
            ]
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
                    "duration": "20 minutes"
                }
            ]
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
                    "duration": "30 minutes"
                }
            ]
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
                    "duration": "3 minutes"
                },
                {
                    "title": "Red Light Therapy",
                    "description": "Infrared sauna session",
                    "deviceType": "Red Light Sauna",
                    "duration": "20 minutes"
                },
                {
                    "title": "Compression Recovery",
                    "description": "Pneumatic compression",
                    "deviceType": "Compression Therapy",
                    "duration": "30 minutes"
                }
            ]
        }
    ]
    return templates

@api_router.get("/admin/user/{user_id}/progress", dependencies=[Depends(get_admin_user)])
async def get_user_progress(user_id: str):
    """Get detailed progress for a specific user"""
    # Get user info
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all programs
    programs = await db.programs.find({"userId": user_id}).sort("date", -1).to_list(1000)
    
    # Calculate stats
    total_tasks = 0
    completed_tasks = 0
    task_history = []
    
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
                "completedAt": task.get("completedAt")
            }
            task_history.append(task_entry)
            
            if task.get("completed"):
                completed_tasks += 1
    
    completion_rate = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
    
    # Calculate streak
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
    
    # Get device usage
    usage = await db.device_usage.find({"userId": ObjectId(user_id)}).to_list(1000)
    total_usage = sum(record.get("duration", 0) for record in usage)
    
    return {
        "user": serialize_doc(user),
        "stats": {
            "totalTasks": total_tasks,
            "completedTasks": completed_tasks,
            "completionRate": completion_rate,
            "currentStreak": streak,
            "totalDeviceUsage": total_usage
        },
        "taskHistory": task_history,
        "programCount": len(programs)
    }

@api_router.post("/admin/reports/upload", dependencies=[Depends(get_admin_user)])
async def upload_report(report_data: ReportUpload, current_user: dict = Depends(get_admin_user)):
    """Upload a report for a user"""
    # Validate user exists
    user = await db.users.find_one({"_id": ObjectId(report_data.userId)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    report_dict = {
        "userId": ObjectId(report_data.userId),
        "title": report_data.title,
        "reportType": report_data.reportType,
        "pdfData": report_data.pdfData,
        "date": datetime.utcnow(),
        "createdBy": ObjectId(current_user["_id"])
    }
    
    result = await db.reports.insert_one(report_dict)
    return {"id": str(result.inserted_id), "message": "Report uploaded successfully"}

# ============= PRODUCT MANAGEMENT ROUTES =============

@api_router.get("/admin/products", dependencies=[Depends(get_admin_user)])
async def get_all_products():
    """Get all products"""
    products = await db.products.find({}).to_list(1000)
    return [serialize_doc(p) for p in products]

@api_router.post("/admin/products", dependencies=[Depends(get_admin_user)])
async def create_product(product: ProductCreate, current_user: dict = Depends(get_admin_user)):
    """Create a new product"""
    product_dict = product.dict()
    product_dict["createdAt"] = datetime.utcnow()
    product_dict["createdBy"] = current_user["_id"]
    
    result = await db.products.insert_one(product_dict)
    return {"id": str(result.inserted_id), "message": "Product created successfully"}

@api_router.put("/admin/products/{product_id}", dependencies=[Depends(get_admin_user)])
async def update_product(product_id: str, product: ProductCreate):
    """Update a product"""
    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": product.dict()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product updated successfully"}

@api_router.delete("/admin/products/{product_id}", dependencies=[Depends(get_admin_user)])
async def delete_product(product_id: str):
    """Delete a product"""
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted successfully"}

@api_router.put("/admin/users/{user_id}/devices", dependencies=[Depends(get_admin_user)])
async def update_user_devices(user_id: str, devices_data: UserDevicesUpdate):
    """Update user's devices"""
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"devices": devices_data.devices}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User devices updated successfully"}

@api_router.post("/admin/users/create", dependencies=[Depends(get_admin_user)])
async def create_user_by_admin(user_data: UserCreate, current_user: dict = Depends(get_admin_user)):
    """Create a new user (admin only)"""
    # Check if user exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data.username}, {"email": user_data.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Create user
    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "fullName": user_data.fullName,
        "phone": user_data.phone,
        "role": user_data.role,
        "devices": user_data.devices,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    return {
        "id": str(result.inserted_id),
        "message": "User created successfully",
        "username": user_data.username,
        "email": user_data.email
    }

@api_router.get("/user/devices")
async def get_user_devices(current_user: dict = Depends(get_current_user)):
    """Get current user's devices with details"""
    device_names = current_user.get("devices", [])
    devices_with_info = []
    
    for device_name in device_names:
        # Get product info
        product = await db.products.find_one({"name": device_name})
        
        # Get usage stats for this device
        usage_records = await db.device_usage.find({
            "userId": ObjectId(current_user["_id"]),
            "deviceType": device_name
        }).to_list(1000)
        
        total_sessions = len(usage_records)
        total_minutes = sum(record.get("duration", 0) for record in usage_records)
        
        device_info = {
            "name": device_name,
            "description": product.get("description", "") if product else "",
            "category": product.get("category", "Other") if product else "Other",
            "totalSessions": total_sessions,
            "totalMinutes": total_minutes
        }
        devices_with_info.append(device_info)
    
    return {"devices": devices_with_info}

@api_router.get("/user/devices/{device_name}/usage")
async def get_device_usage_logs(device_name: str, current_user: dict = Depends(get_current_user)):
    """Get usage logs for a specific device"""
    usage_records = await db.device_usage.find({
        "userId": ObjectId(current_user["_id"]),
        "deviceType": device_name
    }).sort("date", -1).limit(100).to_list(100)
    
    # Get product info
    product = await db.products.find_one({"name": device_name})
    
    for record in usage_records:
        record["userId"] = str(record["userId"])
    
    return {
        "deviceName": device_name,
        "product": serialize_doc(product) if product else None,
        "usageLogs": [serialize_doc(r) for r in usage_records]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ============= SEED DATA =============

@app.on_event("startup")

# ============= ONBOARDING SYSTEM ENDPOINTS =============

@api_router.post("/lifecycle-form")
async def submit_lifecycle_form(form_data: LifecycleFormComplete, current_user: dict = Depends(get_current_user)):
    """Submit complete lifecycle form after registration"""
    # Update user with lifecycle form data
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"lifecycleForm": form_data.dict()}}
    )
    
    # Initialize shipment tracking
    shipment_tracking = {
        "userId": current_user["_id"],
        "currentStage": "ordered",
        "stages": [
            {
                "stage": "ordered",
                "timestamp": datetime.utcnow(),
                "note": "Order placed",
                "eta": None
            }
        ]
    }
    await db.shipment_tracking.insert_one(shipment_tracking)
    
    # Initialize DNA tracking
    dna_tracking = {
        "userId": current_user["_id"],
        "currentStage": "collection_scheduled",
        "stages": [
            {
                "stage": "collection_scheduled",
                "timestamp": datetime.utcnow(),
                "labName": None,
                "adminNotes": "DNA collection kit will be scheduled soon"
            }
        ]
    }
    await db.dna_tracking.insert_one(dna_tracking)
    
    return {"message": "Lifecycle form submitted successfully", "status": "onboarding"}

@api_router.get("/user/mode")
async def get_user_mode(current_user: dict = Depends(get_current_user)):
    """Get current user's mode"""
    return {
        "mode": current_user.get("mode", "unlocked"),  # Default to unlocked for existing users
        "onboardingStartDate": current_user.get("onboardingStartDate"),
        "lifecycleFormCompleted": current_user.get("lifecycleForm") is not None
    }

@api_router.get("/shipment-tracking")
async def get_shipment_tracking(current_user: dict = Depends(get_current_user)):
    """Get current user's shipment tracking"""
    tracking = await db.shipment_tracking.find_one({"userId": current_user["_id"]})
    if not tracking:
        return {"currentStage": None, "stages": []}
    
    tracking["_id"] = str(tracking["_id"])
    return tracking

@api_router.get("/dna-tracking")
async def get_dna_tracking(current_user: dict = Depends(get_current_user)):
    """Get current user's DNA tracking"""
    tracking = await db.dna_tracking.find_one({"userId": current_user["_id"]})
    if not tracking:
        return {"currentStage": None, "stages": []}
    
    tracking["_id"] = str(tracking["_id"])
    return tracking

@api_router.post("/tickets/with-video")
async def create_ticket_with_video(ticket: TicketWithVideo, current_user: dict = Depends(get_current_user)):
    """Create ticket with optional video URL (S3 placeholder)"""
    ticket_dict = {
        "userId": ObjectId(current_user["_id"]),
        "type": ticket.type,
        "subject": ticket.subject,
        "description": ticket.description,
        "productId": ticket.productId,
        "videoUrl": ticket.videoUrl,  # S3 URL placeholder
        "status": "open",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.tickets.insert_one(ticket_dict)
    return {"message": "Ticket created successfully", "ticketId": str(result.inserted_id)}

# ============= ADMIN ONBOARDING MANAGEMENT ENDPOINTS =============

@api_router.get("/admin/users-with-mode")
async def get_users_with_mode(current_user: dict = Depends(get_admin_user)):
    """Get all users with their mode status"""
    users = await db.users.find({}, {
        "password": 0
    }).to_list(1000)
    
    users_list = []
    for user in users:
        user_dict = serialize_doc(user)
        # Add default mode for existing users
        if "mode" not in user_dict:
            user_dict["mode"] = "unlocked"
        users_list.append(user_dict)
    
    return {"users": users_list}

@api_router.put("/admin/user/{user_id}/mode")
async def update_user_mode(user_id: str, mode_update: UserModeUpdate, current_user: dict = Depends(get_admin_user)):
    """Update user's mode (onboarding/unlocked)"""
    update_data = {"mode": mode_update.mode}
    
    # If unlocking, set completion date
    if mode_update.mode == "unlocked":
        update_data["onboardingCompletedDate"] = datetime.utcnow()
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User mode updated to {mode_update.mode}"}

@api_router.get("/admin/lifecycle-form/{user_id}")
async def get_user_lifecycle_form(user_id: str, current_user: dict = Depends(get_admin_user)):
    """Get user's submitted lifecycle form"""
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"lifecycleForm": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"lifecycleForm": user.get("lifecycleForm")}

@api_router.put("/admin/shipment-tracking/{user_id}")
async def update_shipment_tracking(
    user_id: str, 
    stage_update: ShipmentStage, 
    current_user: dict = Depends(get_admin_user)
):
    """Update user's shipment tracking stage"""
    # Get existing tracking
    tracking = await db.shipment_tracking.find_one({"userId": user_id})
    
    if not tracking:
        # Create new tracking if doesn't exist
        tracking = {
            "userId": user_id,
            "currentStage": stage_update.stage,
            "stages": [stage_update.dict()]
        }
        await db.shipment_tracking.insert_one(tracking)
    else:
        # Update existing tracking
        await db.shipment_tracking.update_one(
            {"userId": user_id},
            {
                "$set": {"currentStage": stage_update.stage},
                "$push": {"stages": stage_update.dict()}
            }
        )
    
    return {"message": "Shipment tracking updated successfully"}

@api_router.get("/admin/shipment-tracking/{user_id}")
async def get_user_shipment_tracking(user_id: str, current_user: dict = Depends(get_admin_user)):
    """Get user's shipment tracking"""
    tracking = await db.shipment_tracking.find_one({"userId": user_id})
    if not tracking:
        return {"currentStage": None, "stages": []}
    
    tracking["_id"] = str(tracking["_id"])
    return tracking

@api_router.put("/admin/dna-tracking/{user_id}")
async def update_dna_tracking(
    user_id: str, 
    stage_update: DNAStage, 
    current_user: dict = Depends(get_admin_user)
):
    """Update user's DNA tracking stage"""
    # Get existing tracking
    tracking = await db.dna_tracking.find_one({"userId": user_id})
    
    if not tracking:
        # Create new tracking if doesn't exist
        tracking = {
            "userId": user_id,
            "currentStage": stage_update.stage,
            "stages": [stage_update.dict()]
        }
        await db.dna_tracking.insert_one(tracking)
    else:
        # Update existing tracking
        await db.dna_tracking.update_one(
            {"userId": user_id},
            {
                "$set": {"currentStage": stage_update.stage},
                "$push": {"stages": stage_update.dict()}
            }
        )
    
    return {"message": "DNA tracking updated successfully"}

@api_router.get("/admin/dna-tracking/{user_id}")
async def get_user_dna_tracking(user_id: str, current_user: dict = Depends(get_admin_user)):
    """Get user's DNA tracking"""
    tracking = await db.dna_tracking.find_one({"userId": user_id})
    if not tracking:
        return {"currentStage": None, "stages": []}
    
    tracking["_id"] = str(tracking["_id"])
    return tracking

@api_router.get("/admin/onboarding-stats")
async def get_onboarding_stats(current_user: dict = Depends(get_admin_user)):
    """Get onboarding statistics for admin dashboard"""
    # Count users by mode
    total_users = await db.users.count_documents({})
    onboarding_users = await db.users.count_documents({"mode": "onboarding"})
    # Count existing users without mode field as unlocked
    unlocked_users = total_users - onboarding_users
    
    # Get shipment stage distribution
    shipment_stages = {}
    shipments = await db.shipment_tracking.find({}).to_list(1000)
    for shipment in shipments:
        stage = shipment.get("currentStage", "unknown")
        shipment_stages[stage] = shipment_stages.get(stage, 0) + 1
    
    # Get DNA stage distribution
    dna_stages = {}
    dna_trackings = await db.dna_tracking.find({}).to_list(1000)
    for dna in dna_trackings:
        stage = dna.get("currentStage", "unknown")
        dna_stages[stage] = dna_stages.get(stage, 0) + 1
    
    # Get active tickets count
    active_tickets = await db.tickets.count_documents({"status": {"$ne": "closed"}})
    
    return {
        "totalUsers": total_users,
        "onboardingUsers": onboarding_users,
        "unlockedUsers": unlocked_users,
        "shipmentStages": shipment_stages,
        "dnaStages": dna_stages,
        "activeTickets": active_tickets
    }


async def seed_database():
    # Check if admin exists
    admin_exists = await db.users.find_one({"username": "admin"})
    
    if not admin_exists:
        # Create admin user
        admin_dict = {
            "username": "admin",
            "email": "admin@hybridhuman.com",
            "password": hash_password("admin123"),
            "fullName": "Admin User",
            "phone": "+1234567890",
            "role": "admin",
            "devices": ["Cryotherapy Chamber", "Red Light Sauna"],
            "createdAt": datetime.utcnow()
        }
        admin_result = await db.users.insert_one(admin_dict)
        logger.info(f"Admin user created: admin@hybridhuman.com / admin123")
        
        # Create sample user
        user_dict = {
            "username": "johndoe",
            "email": "john@example.com",
            "password": hash_password("password123"),
            "fullName": "John Doe",
            "phone": "+1987654321",
            "role": "user",
            "devices": ["Cryotherapy Chamber", "Red Light Sauna", "Compression Therapy"],
            "createdAt": datetime.utcnow()
        }
        user_result = await db.users.insert_one(user_dict)
        user_id = str(user_result.inserted_id)
        logger.info(f"Sample user created: john@example.com / password123")
        
        # Create sample programs for the user
        today = datetime.utcnow().date()
        for i in range(7):
            program_date = (today + timedelta(days=i)).isoformat()
            program = {
                "userId": user_id,
                "title": f"Day {i+1} Wellness Program",
                "description": "Your personalized anti-aging protocol",
                "tasks": [
                    {
                        "taskId": str(uuid.uuid4()),
                        "title": "Cryotherapy Session",
                        "description": "Full body cryotherapy for recovery and anti-aging benefits",
                        "deviceType": "Cryotherapy Chamber",
                        "duration": "3 minutes",
                        "completed": i < 2,  # Mark first 2 days as completed
                        "completedAt": datetime.utcnow() if i < 2 else None
                    },
                    {
                        "taskId": str(uuid.uuid4()),
                        "title": "Red Light Therapy",
                        "description": "Infrared sauna session for cellular regeneration",
                        "deviceType": "Red Light Sauna",
                        "duration": "20 minutes",
                        "completed": i < 2,
                        "completedAt": datetime.utcnow() if i < 2 else None
                    },
                    {
                        "taskId": str(uuid.uuid4()),
                        "title": "Compression Recovery",
                        "description": "Pneumatic compression for circulation",
                        "deviceType": "Compression Therapy",
                        "duration": "30 minutes",
                        "completed": i < 1,
                        "completedAt": datetime.utcnow() if i < 1 else None
                    }
                ],
                "date": program_date,
                "createdBy": str(admin_result.inserted_id),
                "createdAt": datetime.utcnow()
            }
            await db.programs.insert_one(program)
        
        logger.info(f"Sample programs created for user: {user_id}")
        
        # Create sample device usage logs
        for i in range(10):
            usage = {
                "userId": ObjectId(user_id),
                "deviceType": ["Cryotherapy Chamber", "Red Light Sauna", "Compression Therapy"][i % 3],
                "duration": [3, 20, 30][i % 3],
                "date": datetime.utcnow() - timedelta(days=i),
                "notes": "Session completed successfully"
            }
            await db.device_usage.insert_one(usage)
        
        logger.info("Sample device usage logs created")
        
        # Create default products
        products_exist = await db.products.count_documents({})
        if products_exist == 0:
            default_products = [
                {
                    "name": "Cryotherapy Chamber",
                    "description": "Full body cryotherapy chamber for recovery and anti-aging",
                    "category": "Cryotherapy",
                    "createdAt": datetime.utcnow()
                },
                {
                    "name": "Red Light Sauna",
                    "description": "Infrared red light therapy sauna for cellular regeneration",
                    "category": "Light Therapy",
                    "createdAt": datetime.utcnow()
                },
                {
                    "name": "Compression Therapy System",
                    "description": "Pneumatic compression device for circulation and recovery",
                    "category": "Recovery",
                    "createdAt": datetime.utcnow()
                },
                {
                    "name": "Hyperbaric Oxygen Chamber",
                    "description": "Pressurized oxygen therapy chamber",
                    "category": "Oxygen Therapy",
                    "createdAt": datetime.utcnow()
                },
                {
                    "name": "Cold Plunge Pool",
                    "description": "Temperature-controlled cold water immersion therapy",
                    "category": "Cold Therapy",
                    "createdAt": datetime.utcnow()
                }
            ]
            await db.products.insert_many(default_products)
            logger.info("Default products created")
        
        logger.info("Database seeding completed!")
