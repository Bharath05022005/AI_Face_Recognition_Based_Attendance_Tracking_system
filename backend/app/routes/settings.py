import cv2
import os
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.schemas import SettingsResponse, SettingsUpdateRequest
from app.utils.security import get_current_user
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["System Settings"])

@router.get("", response_model=SettingsResponse)
def get_system_settings(current_user: dict = Depends(get_current_user)):
    """Fetch current system timings and business rule settings."""
    return SettingsService.get_settings()

@router.put("", response_model=SettingsResponse)
def update_system_settings(payload: SettingsUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update dynamic settings in the database."""
    return SettingsService.update_settings(payload)

@router.get("/camera-list", response_model=List[str])
def get_camera_list(current_user: dict = Depends(get_current_user)):
    """
    Scan available camera indexes locally using OpenCV.
    Enables direct drop-down hardware selection in the Settings UI!
    """
    available_cameras = []
    
    # Try the first 5 indices to find active USB/integrated cameras
    for index in range(5):
        try:
            # On Windows, CAP_DSHOW is much faster for checking availability
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    available_cameras.append(f"Camera Device {index}")
                cap.release()
        except Exception:
            pass
            
    # Fallback to at least Camera 0 if none found (e.g. mock camera)
    if not available_cameras:
        available_cameras = ["Camera Device 0"]
        
    return available_cameras
