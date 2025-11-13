import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    MONGO_URL: str = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/hybrid_human_db')
    DB_NAME: str = os.environ.get('DB_NAME', 'hybrid_human_db')
    JWT_SECRET_KEY: str = os.environ.get('JWT_SECRET_KEY', 'hybrid-human-secret-key-change-in-production')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', '10080'))  # 7 days default
    CORS_ORIGINS: str = os.environ.get('CORS_ORIGINS', '*')

settings = Settings()
