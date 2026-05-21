"""
face.py — Face registration and video-feed streaming routes using MongoDB directly.
"""
import base64
import json
import cv2
import numpy as np
import logging
import time as pytime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.database.db import get_db
from app.models.schemas import FaceEnrollmentFrameRequest, FaceEnrollmentResponse
from app.utils.security import get_current_user
from app.utils.face_utils import is_blurry, apply_clahe, align_face
from app.services.recognition_service import RecognitionService

router = APIRouter(tags=["AI Face Engine"])
logger = logging.getLogger(__name__)


def _next_embedding_id(db) -> int:
    last = db.face_embeddings.find_one(sort=[("id", -1)])
    return (last["id"] + 1) if last else 1


@router.post("/face/register-frame", response_model=FaceEnrollmentResponse)
def register_frame(payload: FaceEnrollmentFrameRequest, current_user: dict = Depends(get_current_user)):
    """
    Process a single frame for employee face enrollment.
    Pipeline: decode → blur check → CLAHE → detect → align → embed → save.
    """
    import face_recognition

    # 1. Decode base64 frame
    try:
        frame_b64 = payload.frame_b64
        if "," in frame_b64:
            frame_b64 = frame_b64.split(",")[1]
        img_bytes = base64.b64decode(frame_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Decoded frame is None")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 frame data")

    # 2. Blur check
    blurry, blur_score = is_blurry(frame, threshold=80.0)
    if blurry:
        return {
            "success": False,
            "message": "Image is too blurry. Please hold still.",
            "samples_captured": 0,
            "is_blurry": True,
            "blur_score": blur_score,
        }

    # 3. CLAHE normalisation + face detection
    normalized = apply_clahe(frame)
    rgb_frame = cv2.cvtColor(normalized, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_frame)

    if not face_locations:
        return {
            "success": False,
            "message": "No face detected. Adjust lighting or distance.",
            "samples_captured": 0,
            "is_blurry": False,
            "blur_score": blur_score,
        }
    if len(face_locations) > 1:
        return {
            "success": False,
            "message": "Multiple faces detected. Ensure only one person is in view.",
            "samples_captured": 0,
            "is_blurry": False,
            "blur_score": blur_score,
        }

    # 4. Horizontal alignment
    landmarks = face_recognition.face_landmarks(rgb_frame, face_locations)
    aligned = align_face(normalized, landmarks[0] if landmarks else {})
    aligned_rgb = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)

    # 5. Extract 128-D embedding
    aligned_locations = face_recognition.face_locations(aligned_rgb) or face_locations
    encodings = face_recognition.face_encodings(aligned_rgb, aligned_locations)
    if not encodings:
        return {
            "success": False,
            "message": "Could not extract face features. Try again.",
            "samples_captured": 0,
            "is_blurry": False,
            "blur_score": blur_score,
        }

    embedding_json = json.dumps(encodings[0].tolist())

    # 6. Save to MongoDB
    with get_db() as db:
        emp = db.employees.find_one({"id": payload.employee_id, "is_active": True})
        if not emp:
            raise HTTPException(status_code=400, detail="Employee not found or inactive")

        from datetime import datetime
        db.face_embeddings.insert_one({
            "id":          _next_embedding_id(db),
            "employee_id": payload.employee_id,
            "embedding":   embedding_json,
            "angle":       payload.angle,
            "created_at":  datetime.utcnow(),
        })
        samples_count = db.face_embeddings.count_documents({"employee_id": payload.employee_id})

    # Refresh recognition cache
    RecognitionService.load_embeddings_cache()

    return {
        "success":          True,
        "message":          f"Sample registered for {payload.angle} profile.",
        "samples_captured": samples_count,
        "is_blurry":        False,
        "blur_score":       blur_score,
    }


@router.get("/recognition/video-feed")
def get_video_feed():
    """MJPEG streaming endpoint — live camera with real-time face recognition overlay."""
    if RecognitionService.is_camera_running:
        RecognitionService.stop_camera()
        pytime.sleep(0.5)

    return StreamingResponse(
        RecognitionService.generate_video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.post("/recognition/stop-feed")
def stop_video_feed(current_user: dict = Depends(get_current_user)):
    """Stop the camera capture stream."""
    RecognitionService.stop_camera()
    return {"message": "Camera feed stopped successfully."}


@router.get("/recognition/mode")
def get_recognition_mode(current_user: dict = Depends(get_current_user)):
    """Get the current recognition mode (check-in / check-out)."""
    return {"mode": RecognitionService.attendance_mode}


@router.post("/recognition/mode")
def set_recognition_mode(payload: dict, current_user: dict = Depends(get_current_user)):
    """Set the recognition mode: 'check-in' or 'check-out'."""
    mode = payload.get("mode")
    if mode not in ("check-in", "check-out"):
        raise HTTPException(status_code=400, detail="Invalid recognition mode. Use 'check-in' or 'check-out'.")
    RecognitionService.attendance_mode = mode
    return {"success": True, "message": f"Recognition mode set to {mode}."}
