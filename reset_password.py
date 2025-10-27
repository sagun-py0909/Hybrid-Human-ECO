"""
Script to reset a user's password
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

# Try to load from root .env if backend .env doesn't exist
if not os.getenv('MONGO_URL'):
    load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.getenv('MONGO_URL')
db_name = os.getenv('DB_NAME', 'hybrid-human-eco')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_password(username_or_email: str, new_password: str):
    """Reset password for a user"""
    user = await db.users.find_one({
        "$or": [{"username": username_or_email}, {"email": username_or_email}]
    })
    
    if not user:
        print(f"\n❌ User '{username_or_email}' not found!")
        return False
    
    # Hash the new password
    hashed_password = pwd_context.hash(new_password)
    
    # Update the password
    result = await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count > 0:
        print(f"\n✅ Password reset successfully!")
        print(f"   Username: {user['username']}")
        print(f"   Email: {user['email']}")
        print(f"   New Password: {new_password}")
        return True
    else:
        print(f"\n⚠️  Password update failed")
        return False

async def main():
    print("=" * 60)
    print("🔐 Reset User Password")
    print("=" * 60)
    
    # List existing users
    print("\n📋 Existing users:")
    async for user in db.users.find({}, {"username": 1, "email": 1, "role": 1, "_id": 0}):
        print(f"  - Username: {user.get('username')}, Email: {user.get('email')}, Role: {user.get('role')}")
    
    print("\n" + "=" * 60)
    username = input("Enter username or email to reset password: ").strip()
    new_password = input("Enter new password: ").strip()
    
    if username and new_password:
        await reset_password(username, new_password)
    else:
        print("\n❌ Username and password cannot be empty!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
