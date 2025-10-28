import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "hybrideco")

async def check_admin():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    # Find all admin users
    admin_users = await db.users.find({"role": "admin"}).to_list(100)
    
    print(f"Found {len(admin_users)} admin users:")
    for user in admin_users:
        print(f"  - Username: {user.get('username')}, Email: {user.get('email')}, ID: {user.get('_id')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_admin())
