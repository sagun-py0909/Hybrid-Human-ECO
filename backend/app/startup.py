import logging
import uuid
from datetime import datetime, timedelta

from bson import ObjectId

from backend.app.core.database import db
from backend.app.core.security import hash_password

logger = logging.getLogger(__name__)


async def seed_database():
    admin_exists = await db.users.find_one({"username": "admin"})
    if admin_exists:
        return

    admin_dict = {
        "username": "admin",
        "email": "admin@hybridhuman.com",
        "password": hash_password("admin123"),
        "fullName": "Admin User",
        "phone": "+1234567890",
        "role": "admin",
        "devices": ["Cryotherapy Chamber", "Red Light Sauna"],
        "createdAt": datetime.utcnow(),
    }
    admin_result = await db.users.insert_one(admin_dict)
    logger.info("Admin user created: admin@hybridhuman.com / admin123")

    user_dict = {
        "username": "johndoe",
        "email": "john@example.com",
        "password": hash_password("password123"),
        "fullName": "John Doe",
        "phone": "+1987654321",
        "role": "user",
        "devices": ["Cryotherapy Chamber", "Red Light Sauna", "Compression Therapy"],
        "createdAt": datetime.utcnow(),
    }
    user_result = await db.users.insert_one(user_dict)
    user_id = str(user_result.inserted_id)
    logger.info("Sample user created: john@example.com / password123")

    onboarding_user_dict = {
        "username": "sarahdoe",
        "email": "sarah@example.com",
        "password": hash_password("password123"),
        "fullName": "Sarah Doe",
        "phone": "+1555123456",
        "role": "user",
        "devices": [],
        "mode": "onboarding",
        "lifecycleForm": None,
        "onboardingStartDate": datetime.utcnow(),
        "onboardingCompletedDate": None,
        "autoUnlockAfter25Days": True,
        "createdAt": datetime.utcnow(),
    }
    onboarding_result = await db.users.insert_one(onboarding_user_dict)
    onboarding_user_id = str(onboarding_result.inserted_id)
    logger.info("Onboarding test user created: sarah@example.com / password123")

    shipment_tracking = {
        "userId": onboarding_user_id,
        "currentStage": "ordered",
        "stages": [
            {
                "stage": "ordered",
                "timestamp": datetime.utcnow(),
                "note": "Your Hybrid Human wellness devices have been ordered",
                "eta": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
            }
        ],
    }
    await db.shipment_tracking.insert_one(shipment_tracking)
    logger.info("Shipment tracking created for Sarah")

    dna_tracking = {
        "userId": onboarding_user_id,
        "currentStage": "collection_scheduled",
        "stages": [
            {
                "stage": "collection_scheduled",
                "timestamp": datetime.utcnow(),
                "labName": "Hybrid Human Genomics Lab",
                "adminNotes": "DNA collection kit will be shipped with devices",
            }
        ],
    }
    await db.dna_tracking.insert_one(dna_tracking)
    logger.info("DNA tracking created for Sarah")

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
                    "completed": i < 2,
                    "completedAt": datetime.utcnow() if i < 2 else None,
                },
                {
                    "taskId": str(uuid.uuid4()),
                    "title": "Red Light Therapy",
                    "description": "Infrared sauna session for cellular regeneration",
                    "deviceType": "Red Light Sauna",
                    "duration": "20 minutes",
                    "completed": i < 2,
                    "completedAt": datetime.utcnow() if i < 2 else None,
                },
                {
                    "taskId": str(uuid.uuid4()),
                    "title": "Compression Recovery",
                    "description": "Pneumatic compression for circulation",
                    "deviceType": "Compression Therapy",
                    "duration": "30 minutes",
                    "completed": i < 1,
                    "completedAt": datetime.utcnow() if i < 1 else None,
                },
            ],
            "date": program_date,
            "createdBy": str(admin_result.inserted_id),
            "createdAt": datetime.utcnow(),
        }
        await db.programs.insert_one(program)

    logger.info(f"Sample programs created for user: {user_id}")

    for i in range(10):
        usage = {
            "userId": ObjectId(user_id),
            "deviceType": ["Cryotherapy Chamber", "Red Light Sauna", "Compression Therapy"][i % 3],
            "duration": [3, 20, 30][i % 3],
            "date": datetime.utcnow() - timedelta(days=i),
            "notes": "Session completed successfully",
        }
        await db.device_usage.insert_one(usage)

    logger.info("Sample device usage logs created")

    products_exist = await db.products.count_documents({})
    if products_exist == 0:
        default_products = [
            {
                "name": "Cryotherapy Chamber",
                "description": "Full body cryotherapy chamber for recovery and anti-aging",
                "category": "Cryotherapy",
                "createdAt": datetime.utcnow(),
            },
            {
                "name": "Red Light Sauna",
                "description": "Infrared red light therapy sauna for cellular regeneration",
                "category": "Light Therapy",
                "createdAt": datetime.utcnow(),
            },
            {
                "name": "Compression Therapy System",
                "description": "Pneumatic compression device for circulation and recovery",
                "category": "Recovery",
                "createdAt": datetime.utcnow(),
            },
            {
                "name": "Hyperbaric Oxygen Chamber",
                "description": "Pressurized oxygen therapy chamber",
                "category": "Oxygen Therapy",
                "createdAt": datetime.utcnow(),
            },
            {
                "name": "Cold Plunge Pool",
                "description": "Temperature-controlled cold water immersion therapy",
                "category": "Cold Therapy",
                "createdAt": datetime.utcnow(),
            },
        ]
        await db.products.insert_many(default_products)
        logger.info("Default products created")

    logger.info("Database seeding completed!")
