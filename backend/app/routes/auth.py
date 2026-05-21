"""
auth.py — Authentication routes using MongoDB directly.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.database.db import get_db
from app.models.schemas import AdminLoginRequest, TokenResponse, UserProfileResponse
from app.utils.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_admin_by_username(db, username: str) -> dict | None:
    doc = db.admin_users.find_one({"username": username})
    if not doc:
        return None
    return {
        "id":            str(doc.get("_id", "")),
        "username":      doc["username"],
        "password_hash": doc["password_hash"],
        "full_name":     doc.get("full_name", ""),
        "role":          doc.get("role", "admin"),
    }


@router.post("/login", response_model=TokenResponse)
def login(payload: AdminLoginRequest):
    """Authenticate an admin and return a JWT token."""
    with get_db() as db:
        user = _get_admin_by_username(db, payload.username)

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user["username"])
    return {
        "access_token": token,
        "token_type":   "bearer",
        "username":     user["username"],
        "role":         user["role"],
        "full_name":    user["full_name"],
    }


@router.post("/login-form", response_model=TokenResponse)
def login_form(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 password-flow login (for Swagger UI)."""
    with get_db() as db:
        user = _get_admin_by_username(db, form_data.username)

    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user["username"])
    return {
        "access_token": token,
        "token_type":   "bearer",
        "username":     user["username"],
        "role":         user["role"],
        "full_name":    user["full_name"],
    }


@router.get("/me", response_model=UserProfileResponse)
def read_current_user(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated admin's profile."""
    return current_user
