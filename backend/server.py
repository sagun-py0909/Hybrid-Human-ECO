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

class Report(BaseModel):
    userId: str
    title: str
    reportType: str
    pdfData: str  # base64 encoded
    date: datetime = Field(default_factory=datetime.utcnow)
    createdBy: str

class UpdateStatus(BaseModel):
    status: str

class UserStats(BaseModel):
    totalTasks: int
    completedTasks: int
    completionRate: int
    currentStreak: int
    totalDeviceUsage: int

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
    
    # Update task
    tasks = program.get("tasks", [])
    for task in tasks:
        if task["taskId"] == task_data.taskId:
            task["completed"] = True
            task["completedAt"] = datetime.utcnow()
            break
    
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
        ticket["userId"] = str(ticket["userId"])
        # Get user info
        user = await db.users.find_one({"_id": ticket["userId"]})
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
async def log_device_usage(usage: DeviceUsage, current_user: dict = Depends(get_current_user)):
    usage_dict = usage.dict()
    usage_dict["userId"] = ObjectId(current_user["_id"])
    
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
    
    # Recent activity
    recent_users = await db.users.find({}).sort("createdAt", -1).limit(5).to_list(5)
    
    return {
        "totalUsers": total_users,
        "totalAdmins": total_admins,
        "openTickets": open_tickets,
        "pendingCalls": pending_calls,
        "recentUsers": [serialize_doc(u) for u in recent_users]
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
        logger.info("Database seeding completed!")
