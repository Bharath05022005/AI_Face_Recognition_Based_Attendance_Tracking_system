"""
db.py — Pure MongoDB database layer.
Provides get_db() context manager and init_db() seeder.
No SQLite. No fallback.
"""
import logging
from contextlib import contextmanager
from datetime import datetime

import pymongo
from pymongo import MongoClient
from pymongo.database import Database
from app.config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Singleton client
# ─────────────────────────────────────────────
_mongo_client: MongoClient | None = None


import certifi

def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        logger.info(f"Connecting to MongoDB at: {settings.MONGO_URI}")
        _mongo_client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    return _mongo_client


def get_mongo_db() -> Database:
    """Return the application MongoDB database."""
    return get_mongo_client()[settings.MONGO_DB]


@contextmanager
def get_db() -> Database:
    """
    Context manager that yields the MongoDB database object.
    Usage mirrors the old SQLite pattern so call-sites need
    minimal changes (just use db directly instead of cursor).
    """
    db = get_mongo_db()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        raise


# ─────────────────────────────────────────────
# Initialiser / Seeder
# ─────────────────────────────────────────────
def init_db():
    """Connect to MongoDB, create indexes, and seed default data."""
    client = get_mongo_client()
    try:
        client.admin.command("ping")
        logger.info("MongoDB connection verified successfully.")
    except Exception as e:
        logger.critical(f"Cannot connect to MongoDB: {e}")
        raise RuntimeError(
            f"MongoDB is not reachable at {settings.MONGO_URI}. "
            "Please ensure MongoDB is running."
        ) from e

    db = get_mongo_db()
    _create_indexes(db)
    _seed(db)


def _create_indexes(db: Database):
    """Create unique and performance indexes."""
    try:
        db.employees.create_index("id", unique=True)
        db.employees.create_index("email", unique=True)
        db.departments.create_index("id", unique=True)
        db.departments.create_index("name", unique=True)
        db.attendance_logs.create_index([("employee_id", 1), ("date", 1)], unique=True)
        db.face_embeddings.create_index("employee_id")
        db.admin_users.create_index("username", unique=True)
        logger.info("MongoDB indexes created / verified.")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


def _seed(db: Database):
    """Insert default documents if collections are empty."""

    # 1. Attendance settings
    if db.attendance_settings.count_documents({}) == 0:
        db.attendance_settings.insert_one({
            "login_start_time": "09:00",
            "grace_end_time": "09:15",
            "attendance_close_time": "09:30",
            "checkout_time": "18:00",
            "late_mark_enabled": True,
            "auto_absent_enabled": True,
            "working_hours_threshold": 8.0,
            "camera_source": "0",
            "updated_at": datetime.utcnow(),
        })
        logger.info("Default attendance settings seeded.")

    # 2. Default admin user  (password: admin123)
    if db.admin_users.count_documents({}) == 0:
        default_hash = "$2b$12$V4UmMyJ2HBaSH.8Bqgndoefc4dfjJsYC3OqUBLmFOYf3w8u/AWXzi"
        db.admin_users.insert_one({
            "username": "admin",
            "password_hash": default_hash,
            "full_name": "System Administrator",
            "role": "admin",
            "created_at": datetime.utcnow(),
        })
        logger.info("Default admin user seeded (admin / admin123).")

    # 3. Default departments
    if db.departments.count_documents({}) == 0:
        default_depts = [
            {"id": 1, "name": "Engineering",     "description": "Software developers and testers"},
            {"id": 2, "name": "Human Resources", "description": "HR management and hiring"},
            {"id": 3, "name": "Operations",      "description": "Office operations and facility managers"},
            {"id": 4, "name": "Marketing",       "description": "Marketing and public relations"},
        ]
        db.departments.insert_many(default_depts)
        logger.info("Default departments seeded.")
