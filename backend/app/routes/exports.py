"""
exports.py — Excel attendance report export using MongoDB directly.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import re
from app.database.db import get_db
from app.utils.security import get_current_user
from app.services.export_service import ExportService

router = APIRouter(prefix="/exports", tags=["Report Exports"])


@router.get("/attendance-excel")
def export_attendance_excel(
    employee_id:   Optional[str] = Query(None),
    name:          Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    status:        Optional[str] = Query(None),
    start_date:    Optional[str] = Query(None),
    end_date:      Optional[str] = Query(None),
    current_user:  dict          = Depends(get_current_user),
):
    """Export attendance logs as a styled Excel file."""
    with get_db() as db:
        # Employee filter
        emp_filter: dict = {}
        if employee_id:
            emp_filter["id"] = employee_id.strip()
        if name:
            emp_filter["name"] = {"$regex": re.escape(name.strip()), "$options": "i"}
        if department_id is not None:
            emp_filter["department_id"] = department_id

        allowed_emp_ids: list | None = None
        if emp_filter:
            emp_docs = list(db.employees.find(emp_filter, {"id": 1}))
            allowed_emp_ids = [e["id"] for e in emp_docs]

        # Log filter
        log_query: dict = {}
        if allowed_emp_ids is not None:
            log_query["employee_id"] = {"$in": allowed_emp_ids}
        elif employee_id:
            log_query["employee_id"] = employee_id.strip()
        if status:
            log_query["attendance_status"] = status.strip()
        if start_date:
            log_query.setdefault("date", {})["$gte"] = start_date
        if end_date:
            log_query.setdefault("date", {})["$lte"] = end_date

        raw_logs = list(db.attendance_logs.find(log_query).sort([("date", -1), ("check_in_time", -1)]))

        # Enrich each log
        logs = []
        for l in raw_logs:
            emp = db.employees.find_one({"id": l["employee_id"]})
            dept = db.departments.find_one({"id": emp.get("department_id")}) if emp and emp.get("department_id") else None
            logs.append({
                "employee_id":       l["employee_id"],
                "employee_name":     emp["name"] if emp else "Unknown",
                "department_name":   dept["name"] if dept else "N/A",
                "date":              l["date"],
                "check_in_time":     l.get("check_in_time"),
                "check_out_time":    l.get("check_out_time"),
                "attendance_status": l["attendance_status"],
                "late_minutes":      int(l.get("late_minutes") or 0),
                "work_duration":     float(l.get("work_duration") or 0.0),
            })

    if not logs:
        raise HTTPException(status_code=400, detail="No matching attendance logs found to export.")

    # Title
    excel_title = "Attendance_Report"
    if start_date and end_date:
        excel_title += f"_{start_date}_to_{end_date}"
    elif start_date:
        excel_title += f"_from_{start_date}"
    else:
        excel_title += f"_{datetime.now().strftime('%Y-%m-%d')}"

    excel_file = ExportService.generate_excel_report(logs, title=excel_title)

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={excel_title}.xlsx"},
    )
