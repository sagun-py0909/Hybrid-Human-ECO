"""
Script to check if users exist in the database and optionally create a test user
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

# Try to load from root .env if backend .env doesn't exist
if not os.getenv('MONGO_URL'):
    load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.getenv('MONGO_URL')
db_name = os.getenv('DB_NAME', 'hybrid-human-eco')

if not mongo_url:
    print("ERROR: MONGO_URL not found in environment variables!")
    print("Please create a backend/.env file or .env file with MONGO_URL")
    exit(1)

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def check_users():
    """Check how many users exist in the database"""
    users_count = await db.users.count_documents({})
    print(f"\n📊 Total users in database: {users_count}")
    
    if users_count > 0:
        print("\n👥 Existing users:")
        async for user in db.users.find({}, {"username": 1, "email": 1, "role": 1, "_id": 0}):
            print(f"  - Username: {user.get('username')}, Email: {user.get('email')}, Role: {user.get('role')}")
    
    return users_count

async def create_test_user():
    """Create a test user for login"""
    test_user = {
        "username": "testuser",
        "email": "test@example.com",
        "password": pwd_context.hash("password123"),
        "fullName": "Test User",
        "phone": "1234567890",
        "role": "user",
        "devices": [],
        "mode": "onboarding",
        "lifecycleForm": None,
        "onboardingStartDate": datetime.utcnow(),
        "onboardingCompletedDate": None,
        "autoUnlockAfter25Days": True,
        "createdAt": datetime.utcnow()
    }
    
    # Check if user already exists
    existing = await db.users.find_one({"$or": [{"username": "testuser"}, {"email": "test@example.com"}]})
    if existing:
        print("\n⚠️  Test user already exists!")
        return
    
    result = await db.users.insert_one(test_user)
    print(f"\n✅ Test user created successfully!")
    print(f"   Username: testuser")
    print(f"   Password: password123")
    print(f"   Email: test@example.com")

async def create_admin_user():
    """Create an admin user"""
    admin_user = {
        "username": "admin",
        "email": "admin@example.com",
        "password": pwd_context.hash("admin123"),
        "fullName": "Admin User",
        "phone": "0987654321",
        "role": "admin",
        "devices": [],
        "mode": "normal",  # Admins don't need onboarding
        "lifecycleForm": None,
        "onboardingStartDate": None,
        "onboardingCompletedDate": None,
        "autoUnlockAfter25Days": False,
        "createdAt": datetime.utcnow()
    }
    
    # Check if admin already exists
    existing = await db.users.find_one({"$or": [{"username": "admin"}, {"email": "admin@example.com"}]})
    if existing:
        print("\n⚠️  Admin user already exists!")
        return
    
    result = await db.users.insert_one(admin_user)
    print(f"\n✅ Admin user created successfully!")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print(f"   Email: admin@example.com")

async def main():
    print("=" * 60)
    print("🔍 Checking Hybrid Human ECO Database")
    print("=" * 60)
    
    users_count = await check_users()
    
    if users_count == 0:
        print("\n❌ No users found in the database!")
        create_choice = input("\nWould you like to create test users? (y/n): ").strip().lower()
        
        if create_choice == 'y':
            await create_test_user()
            await create_admin_user()
            print("\n" + "=" * 60)
            print("🎉 You can now login with either:")
            print("   Test User - username: testuser, password: password123")
            print("   Admin User - username: admin, password: admin123")
            print("=" * 60)
    else:
        print("\n✅ Users exist in the database. You should be able to login.")
        create_more = input("\nWould you like to create additional test users anyway? (y/n): ").strip().lower()
        if create_more == 'y':
            await create_test_user()
            await create_admin_user()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
