from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    full_name: str

class UserProfileResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str

# --- Department Schemas ---
class DepartmentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]

# --- Employee Schemas ---
class EmployeeCreateRequest(BaseModel):
    id: str = Field(..., pattern=r"^EMP-\d{3,6}$", description="ID in format EMP-XXXX")
    name: str = Field(..., min_length=2, max_length=100)
    department_id: Optional[int] = None
    designation: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    email: EmailStr
    address: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: str
    name: str
    department_id: Optional[int]
    department_name: Optional[str] = None
    designation: str
    phone: Optional[str]
    email: str
    address: Optional[str]
    is_active: bool
    created_at: str

class EmployeeUpdateRequest(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

# --- Face Enrollment Schemas ---
class FaceEnrollmentFrameRequest(BaseModel):
    employee_id: str
    frame_b64: str  # Base64 string of the camera frame
    angle: str = Field(..., pattern="^(front|left|right|up|down)$")

class FaceEnrollmentResponse(BaseModel):
    success: bool
    message: str
    samples_captured: int
    is_blurry: bool
    blur_score: float

# --- Attendance Settings Schemas ---
class SettingsResponse(BaseModel):
    login_start_time: str
    grace_end_time: str
    attendance_close_time: str
    checkout_time: str
    late_mark_enabled: bool
    auto_absent_enabled: bool
    working_hours_threshold: float
    camera_source: str

class SettingsUpdateRequest(BaseModel):
    login_start_time: Optional[str] = None
    grace_end_time: Optional[str] = None
    attendance_close_time: Optional[str] = None
    checkout_time: Optional[str] = None
    late_mark_enabled: Optional[bool] = None
    auto_absent_enabled: Optional[bool] = None
    working_hours_threshold: Optional[float] = None
    camera_source: Optional[str] = None

# --- Attendance Logs Schemas ---
class AttendanceLogResponse(BaseModel):
    id: int
    employee_id: str
    employee_name: str
    department_name: Optional[str] = None
    date: str
    check_in_time: Optional[str]
    check_out_time: Optional[str]
    attendance_status: str
    late_minutes: int
    work_duration: float
    created_at: str

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: str
