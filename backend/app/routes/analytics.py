"""
analytics.py — Dashboard KPI and analytics routes using MongoDB directly.
"""
from fastapi import APIRouter, Depends
from typing import Dict, List
from datetime import datetime, date, timedelta
from app.database.db import get_db
from app.utils.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["Attendance Analytics"])


@router.get("/dashboard-kpis")
def get_dashboard_kpis(current_user: dict = Depends(get_current_user)):
    """
    Core metrics for the dashboard:
    total active employees, present/late/absent counts,
    average check-in time, attendance %, punctuality %.
    """
    today_str = date.today().strftime("%Y-%m-%d")

    with get_db() as db:
        total_active = db.employees.count_documents({"is_active": True})

        # Status counts via aggregation
        pipeline = [
            {"$match": {"date": today_str}},
            {"$group": {"_id": "$attendance_status", "cnt": {"$sum": 1}}},
        ]
        status_counts = {
            "Present": 0, "Late": 0, "Absent": 0,
            "Half Day": 0, "Early Checkout": 0,
        }
        for row in db.attendance_logs.aggregate(pipeline):
            if row["_id"] in status_counts:
                status_counts[row["_id"]] = row["cnt"]

        present_count  = status_counts["Present"]
        late_count     = status_counts["Late"]
        absent_count   = status_counts["Absent"]
        half_day_count = status_counts["Half Day"]
        early_checkout = status_counts["Early Checkout"]
        total_physical = present_count + late_count + half_day_count + early_checkout

        # Average check-in time
        logs_with_checkin = list(db.attendance_logs.find(
            {"date": today_str, "check_in_time": {"$ne": None}},
            {"check_in_time": 1}
        ))
        avg_check_in = "N/A"
        if logs_with_checkin:
            total_seconds = 0
            count = 0
            for l in logs_with_checkin:
                try:
                    t = datetime.strptime(l["check_in_time"], "%H:%M:%S").time()
                    total_seconds += t.hour * 3600 + t.minute * 60 + t.second
                    count += 1
                except Exception:
                    pass
            if count > 0:
                avg_s = total_seconds // count
                avg_check_in = f"{avg_s // 3600:02d}:{(avg_s % 3600) // 60:02d}"

        attendance_rate = round((total_physical / total_active) * 100, 1) if total_active > 0 else 0.0
        punctuality_rate = round((present_count / total_physical) * 100, 1) if total_physical > 0 else 100.0

    return {
        "total_active_employees": total_active,
        "physically_present":     total_physical,
        "present_on_time":        present_count,
        "late_arrivals":          late_count,
        "absent":                 absent_count,
        "half_day":               half_day_count,
        "early_checkout":         early_checkout,
        "average_check_in":       avg_check_in,
        "attendance_rate":        attendance_rate,
        "punctuality_rate":       punctuality_rate,
    }


@router.get("/department-distribution")
def get_department_distribution(current_user: dict = Depends(get_current_user)):
    """Attendance breakdown by department for today."""
    today_str = date.today().strftime("%Y-%m-%d")
    present_statuses = {"Present", "Late", "Half Day", "Early Checkout"}

    with get_db() as db:
        departments = list(db.departments.find({}))
        result = []
        for dept in departments:
            employees = list(db.employees.find({"department_id": dept["id"], "is_active": True}, {"id": 1}))
            emp_ids = [e["id"] for e in employees]
            total = len(emp_ids)

            logs = list(db.attendance_logs.find(
                {"employee_id": {"$in": emp_ids}, "date": today_str},
                {"attendance_status": 1}
            ))
            present = sum(1 for l in logs if l["attendance_status"] in present_statuses)
            absent  = sum(1 for l in logs if l["attendance_status"] == "Absent")
            rate    = round((present / total) * 100, 1) if total > 0 else 0.0

            result.append({
                "department": dept["name"],
                "total":      total,
                "present":    present,
                "absent":     absent,
                "rate":       rate,
            })
    return result


@router.get("/monthly-trend")
def get_monthly_trend(current_user: dict = Depends(get_current_user)):
    """Daily present/absent counts for the past 30 days."""
    present_statuses = {"Present", "Late", "Half Day", "Early Checkout"}
    past_30 = [(date.today() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(29, -1, -1)]

    with get_db() as db:
        pipeline = [
            {"$match": {"date": {"$in": past_30}}},
            {"$group": {
                "_id": "$date",
                "present": {"$sum": {"$cond": [{"$in": ["$attendance_status", list(present_statuses)]}, 1, 0]}},
                "absent":  {"$sum": {"$cond": [{"$eq": ["$attendance_status", "Absent"]}, 1, 0]}},
            }},
        ]
        log_map = {row["_id"]: {"present": row["present"], "absent": row["absent"]}
                   for row in db.attendance_logs.aggregate(pipeline)}

    result = []
    for d in past_30:
        counts = log_map.get(d, {"present": 0, "absent": 0})
        formatted = datetime.strptime(d, "%Y-%m-%d").strftime("%b %d")
        result.append({"date": formatted, "full_date": d, **counts})
    return result
