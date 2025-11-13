from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from bson import ObjectId
import jwt
from jwt import DecodeError, ExpiredSignatureError, InvalidTokenError
from backend.app.core.config import settings
from backend.app.core.database import db
from backend.app.core.security import security


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except (DecodeError, InvalidTokenError, Exception):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return serialize_doc(user)


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
