from datetime import datetime, date
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.settings_service import SettingsService
from app.services.attendance_service import AttendanceService

logger = logging.getLogger(__name__)

# State to prevent multiple runs in a single day
scheduler_state = {
    "last_absent_date": None,      # Format: 'YYYY-MM-DD'
    "last_finalize_date": None     # Format: 'YYYY-MM-DD'
}

def tick_scheduler_job():
    """
    Every 30 seconds, evaluate if time matches the criteria to trigger jobs.
    Allows dynamic updates in settings without needing to restart APScheduler!
    """
    try:
        settings = SettingsService.get_settings()
        now = datetime.now()
        current_date_str = now.strftime("%Y-%m-%d")
        current_time_str = now.strftime("%H:%M")

        close_time = settings["attendance_close_time"]
        checkout_time = settings["checkout_time"]

        # 1. Trigger Auto-Absent
        if settings["auto_absent_enabled"]:
            # If current time is past closing time, and we haven't run it today yet
            if current_time_str >= close_time and scheduler_state["last_absent_date"] != current_date_str:
                logger.info(f"Triggering auto-absent job at {current_time_str} (closing setting: {close_time})")
                AttendanceService.run_auto_absent_job()
                scheduler_state["last_absent_date"] = current_date_str

        # 2. Trigger Checkout Finalization
        if current_time_str >= checkout_time and scheduler_state["last_finalize_date"] != current_date_str:
            logger.info(f"Triggering checkout finalize job at {current_time_str} (checkout setting: {checkout_time})")
            AttendanceService.finalize_attendance_logs()
            scheduler_state["last_finalize_date"] = current_date_str

    except Exception as e:
        logger.error(f"Error in scheduler tick job: {e}")

class SchedulerService:
    _scheduler = None

    @classmethod
    def start(cls):
        """Start the background scheduler."""
        if cls._scheduler and cls._scheduler.running:
            logger.warning("Scheduler is already running.")
            return

        cls._scheduler = BackgroundScheduler()
        # Run every 30 seconds
        cls._scheduler.add_job(tick_scheduler_job, "interval", seconds=30, id="attendance_tick_job")
        cls._scheduler.start()
        logger.info("Background scheduler started successfully.")

    @classmethod
    def stop(cls):
        """Stop the background scheduler."""
        if cls._scheduler and cls._scheduler.running:
            cls._scheduler.shutdown()
            logger.info("Background scheduler stopped.")
