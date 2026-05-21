import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Face Recognition Employee Attendance & Monitoring System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_SECURITY_KEY_DO_NOT_SHARE_1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # MongoDB (primary and only database)
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "attendance_register")

    # Storage for registered facial assets (raw image backups)
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
    STORAGE_DIR: str = os.path.join(DATA_DIR, "faces")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
