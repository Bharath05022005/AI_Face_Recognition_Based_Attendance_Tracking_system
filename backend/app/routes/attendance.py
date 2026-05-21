"""
attendance.py — Attendance log routes using MongoDB directly.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from app.database.db import get_db
from app.models.schemas import AttendanceLogResponse
from app.utils.security import get_current_user
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/attendance", tags=["Attendance Tracking"])


def _log_to_response(log: dict, db) -> dict:
    """Enrich an attendance_log document with employee & department names."""
    emp = db.employees.find_one({"id": log["employee_id"]})
    dept = db.departments.find_one({"id": emp.get("department_id")}) if emp and emp.get("department_id") else None
    return {
        "id":                log.get("id", 0),
        "employee_id":       log["employee_id"],
        "employee_name":     emp["name"] if emp else "Unknown",
        "department_name":   dept["name"] if dept else None,
        "date":              log["date"],
        "check_in_time":     log.get("check_in_time"),
        "check_out_time":    log.get("check_out_time"),
        "attendance_status": log["attendance_status"],
        "late_minutes":      int(log.get("late_minutes") or 0),
        "work_duration":     float(log.get("work_duration") or 0.0),
        "created_at":        str(log.get("created_at", "")),
    }


@router.get("/logs", response_model=List[AttendanceLogResponse])
def get_attendance_logs(
    employee_id:   Optional[str]   = Query(None),
    name:          Optional[str]   = Query(None),
    department_id: Optional[int]   = Query(None),
    status:        Optional[str]   = Query(None),
    start_date:    Optional[str]   = Query(None),
    end_date:      Optional[str]   = Query(None),
    current_user:  dict            = Depends(get_current_user),
):
    """Fetch attendance logs with optional multi-parameter filtering."""
    with get_db() as db:
        # Build employee filter first if needed
        emp_filter: dict = {}
        if name:
            import re
            emp_filter["name"] = {"$regex": re.escape(name.strip()), "$options": "i"}
        if department_id is not None:
            emp_filter["department_id"] = department_id

        allowed_emp_ids: list | None = None
        if emp_filter or employee_id:
            if employee_id:
                emp_filter["id"] = employee_id.strip()
            emp_docs = list(db.employees.find(emp_filter, {"id": 1}))
            allowed_emp_ids = [e["id"] for e in emp_docs]

        # Build log query
        log_query: dict = {}
        if allowed_emp_ids is not None:
            log_query["employee_id"] = {"$in": allowed_emp_ids}
        if status:
            log_query["attendance_status"] = status.strip()
        if start_date:
            log_query.setdefault("date", {})["$gte"] = start_date
        if end_date:
            log_query.setdefault("date", {})["$lte"] = end_date

        logs = list(
            db.attendance_logs.find(log_query).sort([("date", -1), ("check_in_time", -1)])
        )
        return [_log_to_response(l, db) for l in logs]


@router.post("/check-in", status_code=status.HTTP_200_OK)
def manual_check_in(
    employee_id:    str,
    check_in_time:  Optional[str] = Query(None),
    current_user:   dict          = Depends(get_current_user),
):
    """Manual administrator check-in override."""
    with get_db() as db:
        if not db.employees.find_one({"id": employee_id, "is_active": True}):
            raise HTTPException(status_code=404, detail="Employee not found or inactive")

    if check_in_time:
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            dt = datetime.strptime(f"{today_str} {check_in_time}", "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM:SS")
    else:
        dt = datetime.now()

    res = AttendanceService.record_check_in(employee_id, dt)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/check-out", status_code=status.HTTP_200_OK)
def manual_check_out(
    employee_id:     str,
    check_out_time:  Optional[str] = Query(None),
    current_user:    dict          = Depends(get_current_user),
):
    """Manual administrator check-out override."""
    with get_db() as db:
        if not db.employees.find_one({"id": employee_id, "is_active": True}):
            raise HTTPException(status_code=404, detail="Employee not found or inactive")

    if check_out_time:
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            dt = datetime.strptime(f"{today_str} {check_out_time}", "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM:SS")
    else:
        dt = datetime.now()

    res = AttendanceService.record_check_out(employee_id, dt)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.put("/logs/{log_id}", response_model=AttendanceLogResponse)
def edit_attendance_log(
    log_id:            int,
    attendance_status: Optional[str]   = Query(None),
    check_in_time:     Optional[str]   = Query(None),
    check_out_time:    Optional[str]   = Query(None),
    late_minutes:      Optional[int]   = Query(None),
    work_duration:     Optional[float] = Query(None),
    current_user:      dict            = Depends(get_current_user),
):
    """Administratively override an attendance log entry."""
    VALID_STATUSES = {"Present", "Late", "Absent", "Half Day", "On Leave", "Early Checkout"}

    with get_db() as db:
        log = db.attendance_logs.find_one({"id": log_id})
        if not log:
            raise HTTPException(status_code=404, detail="Attendance log not found")

        updates: dict = {}
        if attendance_status is not None:
            if attendance_status not in VALID_STATUSES:
                raise HTTPException(status_code=400, detail="Invalid attendance status")
            updates["attendance_status"] = attendance_status
        if check_in_time is not None:
            updates["check_in_time"] = check_in_time if check_in_time != "" else None
        if check_out_time is not None:
            updates["check_out_time"] = check_out_time if check_out_time != "" else None
        if late_minutes is not None:
            updates["late_minutes"] = late_minutes
        if work_duration is not None:
            updates["work_duration"] = work_duration

        if not updates:
            raise HTTPException(status_code=400, detail="No update values provided")

        db.attendance_logs.update_one({"id": log_id}, {"$set": updates})
        updated_log = db.attendance_logs.find_one({"id": log_id})
        return _log_to_response(updated_log, db)
