from datetime import datetime
from app.database.db import get_db
from app.models.schemas import SettingsUpdateRequest

import logging
logger = logging.getLogger(__name__)


class SettingsService:
    @staticmethod
    def get_settings() -> dict:
        """Fetch current attendance configuration from MongoDB."""
        with get_db() as db:
            doc = db.attendance_settings.find_one({})
            if not doc:
                return {
                    "login_start_time": "09:00",
                    "grace_end_time": "09:15",
                    "attendance_close_time": "09:30",
                    "checkout_time": "18:00",
                    "late_mark_enabled": True,
                    "auto_absent_enabled": True,
                    "working_hours_threshold": 8.0,
                    "camera_source": "0",
                }
            return {
                "login_start_time": doc.get("login_start_time", "09:00"),
                "grace_end_time": doc.get("grace_end_time", "09:15"),
                "attendance_close_time": doc.get("attendance_close_time", "09:30"),
                "checkout_time": doc.get("checkout_time", "18:00"),
                "late_mark_enabled": bool(doc.get("late_mark_enabled", True)),
                "auto_absent_enabled": bool(doc.get("auto_absent_enabled", True)),
                "working_hours_threshold": float(doc.get("working_hours_threshold", 8.0)),
                "camera_source": str(doc.get("camera_source", "0")),
            }

    @staticmethod
    def update_settings(payload: SettingsUpdateRequest) -> dict:
        """Update system configurations in MongoDB."""
        current = SettingsService.get_settings()

        updated = {
            "login_start_time":       payload.login_start_time       if payload.login_start_time       is not None else current["login_start_time"],
            "grace_end_time":         payload.grace_end_time         if payload.grace_end_time         is not None else current["grace_end_time"],
            "attendance_close_time":  payload.attendance_close_time  if payload.attendance_close_time  is not None else current["attendance_close_time"],
            "checkout_time":          payload.checkout_time          if payload.checkout_time          is not None else current["checkout_time"],
            "late_mark_enabled":      payload.late_mark_enabled      if payload.late_mark_enabled      is not None else current["late_mark_enabled"],
            "auto_absent_enabled":    payload.auto_absent_enabled    if payload.auto_absent_enabled    is not None else current["auto_absent_enabled"],
            "working_hours_threshold":payload.working_hours_threshold if payload.working_hours_threshold is not None else current["working_hours_threshold"],
            "camera_source":          str(payload.camera_source)     if payload.camera_source          is not None else current["camera_source"],
            "updated_at":             datetime.utcnow(),
        }

        with get_db() as db:
            db.attendance_settings.update_one({}, {"$set": updated}, upsert=True)

        return SettingsService.get_settings()
