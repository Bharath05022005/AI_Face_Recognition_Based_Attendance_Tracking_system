"""
employees.py — Employee & Department CRUD routes using MongoDB directly.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from app.database.db import get_db
from app.models.schemas import (
    EmployeeCreateRequest, EmployeeResponse,
    EmployeeUpdateRequest, DepartmentResponse, DepartmentCreateRequest,
)
from app.utils.security import get_current_user
from app.services.recognition_service import RecognitionService

router = APIRouter(tags=["Employees & Departments"])


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _emp_doc_to_response(emp: dict, db) -> dict:
    dept = db.departments.find_one({"id": emp.get("department_id")}) if emp.get("department_id") else None
    return {
        "id":              emp["id"],
        "name":            emp["name"],
        "department_id":   emp.get("department_id"),
        "department_name": dept["name"] if dept else None,
        "designation":     emp.get("designation", ""),
        "phone":           emp.get("phone"),
        "email":           emp.get("email", ""),
        "address":         emp.get("address"),
        "is_active":       bool(emp.get("is_active", True)),
        "created_at":      str(emp.get("created_at", "")),
    }


def _next_dept_id(db) -> int:
    last = db.departments.find_one(sort=[("id", -1)])
    return (last["id"] + 1) if last else 1


# ─────────────────────────────────────────────
# Departments
# ─────────────────────────────────────────────
@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(current_user: dict = Depends(get_current_user)):
    """List all departments sorted by name."""
    with get_db() as db:
        docs = list(db.departments.find({}).sort("name", 1))
        return [{"id": d["id"], "name": d["name"], "description": d.get("description")} for d in docs]


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new department."""
    with get_db() as db:
        if db.departments.find_one({"name": payload.name.strip()}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department '{payload.name}' already exists.",
            )
        new_id = _next_dept_id(db)
        doc = {"id": new_id, "name": payload.name.strip(), "description": payload.description}
        db.departments.insert_one(doc)
        return {"id": new_id, "name": doc["name"], "description": doc["description"]}


# ─────────────────────────────────────────────
# Employees
# ─────────────────────────────────────────────
@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(current_user: dict = Depends(get_current_user)):
    """List all employees with department names, newest first."""
    with get_db() as db:
        docs = list(db.employees.find({}).sort("created_at", -1))
        return [_emp_doc_to_response(e, db) for e in docs]


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch a single employee's detail record."""
    with get_db() as db:
        emp = db.employees.find_one({"id": employee_id})
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        return _emp_doc_to_response(emp, db)


@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a new employee profile in MongoDB."""
    with get_db() as db:
        if db.employees.find_one({"id": payload.id}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee ID '{payload.id}' already exists.",
            )
        if db.employees.find_one({"email": payload.email.strip()}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with email '{payload.email}' already exists.",
            )
        if payload.department_id is not None:
            if not db.departments.find_one({"id": payload.department_id}):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department ID {payload.department_id} does not exist.",
                )

        doc = {
            "id":            payload.id.strip(),
            "name":          payload.name.strip(),
            "department_id": payload.department_id,
            "designation":   payload.designation.strip(),
            "phone":         payload.phone,
            "email":         payload.email.strip(),
            "address":       payload.address,
            "is_active":     True,
            "created_at":    datetime.utcnow(),
        }
        db.employees.insert_one(doc)
        RecognitionService.load_embeddings_cache()
        return _emp_doc_to_response(doc, db)


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update employee details."""
    with get_db() as db:
        emp = db.employees.find_one({"id": employee_id})
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        new_email = payload.email if payload.email is not None else emp["email"]
        if new_email != emp["email"] and db.employees.find_one({"email": new_email, "id": {"$ne": employee_id}}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{new_email}' is already used by another employee.",
            )

        updates = {}
        if payload.name        is not None: updates["name"]          = payload.name.strip()
        if payload.department_id is not None: updates["department_id"] = payload.department_id
        if payload.designation is not None: updates["designation"]    = payload.designation.strip()
        if payload.phone       is not None: updates["phone"]          = payload.phone
        if payload.email       is not None: updates["email"]          = payload.email.strip()
        if payload.address     is not None: updates["address"]        = payload.address
        if payload.is_active   is not None: updates["is_active"]      = bool(payload.is_active)

        if updates:
            db.employees.update_one({"id": employee_id}, {"$set": updates})

        updated_emp = db.employees.find_one({"id": employee_id})
        RecognitionService.load_embeddings_cache()
        return _emp_doc_to_response(updated_emp, db)


@router.delete("/employees/{employee_id}", status_code=status.HTTP_200_OK)
def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an employee and all associated face embeddings and attendance records."""
    with get_db() as db:
        emp = db.employees.find_one({"id": employee_id})
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        db.employees.delete_one({"id": employee_id})
        db.face_embeddings.delete_many({"employee_id": employee_id})
        db.attendance_logs.delete_many({"employee_id": employee_id})

    RecognitionService.load_embeddings_cache()
    return {"message": f"Successfully deleted employee {employee_id}."}
