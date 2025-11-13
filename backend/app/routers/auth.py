from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from backend.app.core.database import db
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    fullName: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    identifier: str
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


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data.username}, {"email": user_data.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "fullName": user_data.fullName,
        "phone": user_data.phone,
        "role": "user",
        "devices": [],
        "mode": "onboarding",
        "lifecycleForm": None,
        "onboardingStartDate": datetime.utcnow(),
        "onboardingCompletedDate": None,
        "autoUnlockAfter25Days": True,
        "createdAt": datetime.utcnow()
    }

    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id

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


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({
        "$or": [{"username": credentials.identifier}, {"email": credentials.identifier}]
    })

    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

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


@router.get("/me", response_model=UserResponse)
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


@router.post("/password-reset-request")
async def password_reset_request(email: EmailStr):
    return {"message": "Password reset email sent (mock)"}
