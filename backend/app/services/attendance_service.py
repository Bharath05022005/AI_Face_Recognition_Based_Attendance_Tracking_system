"""
attendance_service.py — Pure MongoDB attendance business logic.
"""
from datetime import datetime, time, date
import logging
from app.database.db import get_db
from app.services.settings_service import SettingsService

logger = logging.getLogger(__name__)


def _next_log_id(db) -> int:
    """Generate a sequential integer ID for attendance_logs."""
    last = db.attendance_logs.find_one(sort=[("id", -1)])
    return (last["id"] + 1) if last else 1


def _next_notif_id(db) -> int:
    last = db.notifications.find_one(sort=[("id", -1)])
    return (last["id"] + 1) if last else 1


class AttendanceService:

    @staticmethod
    def parse_time_str(time_str: str) -> time:
        """Parse 'HH:MM' or 'HH:MM:SS' string → datetime.time."""
        try:
            parts = [int(x) for x in time_str.split(":")]
            if len(parts) == 2:
                return time(parts[0], parts[1])
            elif len(parts) == 3:
                return time(parts[0], parts[1], parts[2])
        except Exception as e:
            logger.error(f"Error parsing time string '{time_str}': {e}")
        return time(9, 0)

    @staticmethod
    def get_time_diff_minutes(t1: time, t2: time) -> int:
        """Minutes difference: t1 − t2 (clamped to ≥ 0)."""
        today = date.today()
        diff = datetime.combine(today, t1) - datetime.combine(today, t2)
        return max(0, int(diff.total_seconds() / 60))

    # ─────────────────────────────────────────────
    # Check-In
    # ─────────────────────────────────────────────
    @staticmethod
    def record_check_in(employee_id: str, check_in_dt: datetime) -> dict:
        """
        Record a check-in log based on face recognition or manual trigger.
        Business rules:
          - Before grace_end_time           → 'Present'
          - Between grace_end and close     → 'Late'
          - After attendance_close_time     → 'Half Day'
        """
        cfg = SettingsService.get_settings()
        current_date_str = check_in_dt.strftime("%Y-%m-%d")
        current_time_str = check_in_dt.strftime("%H:%M:%S")
        current_time = check_in_dt.time()

        grace_end  = AttendanceService.parse_time_str(cfg["grace_end_time"])
        close_time = AttendanceService.parse_time_str(cfg["attendance_close_time"])
        login_start = AttendanceService.parse_time_str(cfg["login_start_time"])

        if current_time <= grace_end:
            status = "Present"
            late_minutes = 0
        elif current_time <= close_time:
            status = "Late"
            late_minutes = (
                AttendanceService.get_time_diff_minutes(current_time, login_start)
                if cfg["late_mark_enabled"] else 0
            )
        else:
            status = "Half Day"
            late_minutes = 0

        with get_db() as db:
            emp = db.employees.find_one({"id": employee_id, "is_active": True})
            if not emp:
                return {"success": False, "message": "Employee not found or inactive"}

            existing_log = db.attendance_logs.find_one({
                "employee_id": employee_id, "date": current_date_str
            })

            if existing_log:
                if existing_log["attendance_status"] in ("Present", "Late", "Half Day"):
                    return {
                        "success": True,
                        "message": f"{emp['name']} already checked in as {existing_log['attendance_status']}",
                        "already_exists": True,
                    }
                # Was marked Absent by scheduler — upgrade to Half Day
                if existing_log["attendance_status"] == "Absent":
                    db.attendance_logs.update_one(
                        {"_id": existing_log["_id"]},
                        {"$set": {"check_in_time": current_time_str, "attendance_status": "Half Day", "late_minutes": 0}}
                    )
                    db.notifications.insert_one({
                        "id": _next_notif_id(db),
                        "type": "warning",
                        "title": "Late Check-in (Half Day)",
                        "message": f"{emp['name']} checked in late at {current_time_str} → Half Day.",
                        "is_read": False,
                        "created_at": datetime.utcnow(),
                    })
                    return {"success": True, "message": f"{emp['name']} checked in late. Status upgraded to Half Day."}
            else:
                # Fresh check-in
                db.attendance_logs.insert_one({
                    "id": _next_log_id(db),
                    "employee_id": employee_id,
                    "date": current_date_str,
                    "check_in_time": current_time_str,
                    "check_out_time": None,
                    "attendance_status": status,
                    "late_minutes": late_minutes,
                    "work_duration": 0.0,
                    "created_at": datetime.utcnow(),
                })
                notif_type = "success" if status == "Present" else "warning"
                msg = f"{emp['name']} checked in at {current_time_str}."
                if status == "Late":
                    msg += f" Marked Late ({late_minutes} min late)."
                db.notifications.insert_one({
                    "id": _next_notif_id(db),
                    "type": notif_type,
                    "title": f"Successful Check-in ({status})",
                    "message": msg,
                    "is_read": False,
                    "created_at": datetime.utcnow(),
                })
                return {"success": True, "message": f"Successfully registered check-in for {emp['name']} as {status}"}

    # ─────────────────────────────────────────────
    # Check-Out
    # ─────────────────────────────────────────────
    @staticmethod
    def record_check_out(employee_id: str, check_out_dt: datetime) -> dict:
        """Record a check-out time and compute work duration."""
        current_date_str = check_out_dt.strftime("%Y-%m-%d")
        current_time_str = check_out_dt.strftime("%H:%M:%S")

        with get_db() as db:
            emp = db.employees.find_one({"id": employee_id, "is_active": True})
            if not emp:
                return {"success": False, "message": "Employee not found or inactive"}

            log = db.attendance_logs.find_one({
                "employee_id": employee_id, "date": current_date_str
            })

            if not log:
                # Checking out without checking in
                db.attendance_logs.insert_one({
                    "id": _next_log_id(db),
                    "employee_id": employee_id,
                    "date": current_date_str,
                    "check_in_time": None,
                    "check_out_time": current_time_str,
                    "attendance_status": "Half Day",
                    "late_minutes": 0,
                    "work_duration": 0.0,
                    "created_at": datetime.utcnow(),
                })
                return {"success": True, "message": f"Checked out without check-in for {emp['name']}. Marked as Half Day."}

            check_in_time_str = log.get("check_in_time")
            work_duration = 0.0
            status = log["attendance_status"]

            if check_in_time_str:
                in_t = AttendanceService.parse_time_str(check_in_time_str)
                out_t = check_out_dt.time()
                diff_min = AttendanceService.get_time_diff_minutes(out_t, in_t)
                work_duration = round(diff_min / 60.0, 2)

                cfg = SettingsService.get_settings()
                checkout_scheduled = AttendanceService.parse_time_str(cfg["checkout_time"])
                if (
                    out_t < checkout_scheduled
                    and work_duration < cfg["working_hours_threshold"]
                    and status in ("Present", "Late")
                ):
                    status = "Early Checkout"

            db.attendance_logs.update_one(
                {"_id": log["_id"]},
                {"$set": {
                    "check_out_time": current_time_str,
                    "work_duration": work_duration,
                    "attendance_status": status,
                }}
            )
            db.notifications.insert_one({
                "id": _next_notif_id(db),
                "type": "success",
                "title": "Successful Checkout",
                "message": f"{emp['name']} checked out at {current_time_str}. Work Duration: {work_duration} hrs.",
                "is_read": False,
                "created_at": datetime.utcnow(),
            })
            return {"success": True, "message": f"Successfully registered check-out for {emp['name']}. Work hours: {work_duration}"}

    # ─────────────────────────────────────────────
    # Scheduler Jobs
    # ─────────────────────────────────────────────
    @staticmethod
    def run_auto_absent_job() -> int:
        """Mark all active employees without a log today as Absent."""
        cfg = SettingsService.get_settings()
        if not cfg["auto_absent_enabled"]:
            logger.info("Auto-absent is disabled.")
            return 0

        current_date_str = date.today().strftime("%Y-%m-%d")
        marked_count = 0

        with get_db() as db:
            logged_ids = [
                l["employee_id"]
                for l in db.attendance_logs.find({"date": current_date_str}, {"employee_id": 1})
            ]
            absent_emps = list(db.employees.find(
                {"is_active": True, "id": {"$nin": logged_ids}},
                {"id": 1, "name": 1}
            ))

            for emp in absent_emps:
                db.attendance_logs.insert_one({
                    "id": _next_log_id(db),
                    "employee_id": emp["id"],
                    "date": current_date_str,
                    "check_in_time": None,
                    "check_out_time": None,
                    "attendance_status": "Absent",
                    "late_minutes": 0,
                    "work_duration": 0.0,
                    "created_at": datetime.utcnow(),
                })
                marked_count += 1

            if marked_count > 0:
                db.notifications.insert_one({
                    "id": _next_notif_id(db),
                    "type": "alert",
                    "title": "Auto-Absent Marking Completed",
                    "message": f"Marked {marked_count} employee(s) as Absent for {current_date_str}.",
                    "is_read": False,
                    "created_at": datetime.utcnow(),
                })

        logger.info(f"Auto-absent job: {marked_count} employees marked Absent.")
        return marked_count

    @staticmethod
    def finalize_attendance_logs() -> int:
        """Daily finalizer — note employees who checked in but never checked out."""
        current_date_str = date.today().strftime("%Y-%m-%d")

        with get_db() as db:
            logs = list(db.attendance_logs.find({
                "date": current_date_str,
                "check_out_time": None,
                "attendance_status": {"$in": ["Present", "Late", "Half Day"]},
            }))
            finalized_count = len(logs)

            if finalized_count > 0:
                db.notifications.insert_one({
                    "id": _next_notif_id(db),
                    "type": "info",
                    "title": "Daily Attendance Finalized",
                    "message": f"Verified {finalized_count} checked-in employee(s) with no checkout recorded.",
                    "is_read": False,
                    "created_at": datetime.utcnow(),
                })

        logger.info(f"Attendance finalization: {finalized_count} logs reviewed.")
        return finalized_count
