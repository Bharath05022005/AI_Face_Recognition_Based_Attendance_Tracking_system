"""
recognition_service.py — Pure MongoDB real-time face recognition service.
"""
import cv2
import json
import numpy as np
import logging
import time as pytime
from datetime import datetime
from app.database.db import get_db
from app.services.attendance_service import AttendanceService
from app.utils.face_utils import is_blurry, apply_clahe, align_face

logger = logging.getLogger(__name__)


class RecognitionService:
    # { employee_id: [np.ndarray(128,), ...] }
    _embeddings_cache: dict = {}
    # { employee_id: {"name": str, "department_name": str} }
    _employee_info_cache: dict = {}

    # Cooldown: prevent hammering check-in API
    _last_seen: dict = {}
    _recognition_cooldown_seconds: float = 10.0

    is_camera_running: bool = False
    camera_device_index: int = 0

    # Active mode: 'check-in' or 'check-out'
    attendance_mode: str = "check-in"

    # ─────────────────────────────────────────────
    # Embedding Cache
    # ─────────────────────────────────────────────
    @classmethod
    def load_embeddings_cache(cls):
        """Load all face embeddings + employee metadata from MongoDB into memory."""
        logger.info("Loading face embeddings cache from MongoDB...")
        embeddings_temp: dict = {}
        info_temp: dict = {}

        with get_db() as db:
            employees = list(db.employees.find({"is_active": True}))
            for emp in employees:
                emp_id = emp["id"]
                dept = db.departments.find_one({"id": emp.get("department_id")}) if emp.get("department_id") else None
                info_temp[emp_id] = {
                    "name": emp["name"],
                    "department_name": dept["name"] if dept else "N/A",
                }
                embeddings_docs = list(db.face_embeddings.find({"employee_id": emp_id}))
                emp_embeddings = []
                for doc in embeddings_docs:
                    try:
                        emb_list = json.loads(doc["embedding"])
                        emp_embeddings.append(np.array(emb_list, dtype=np.float64))
                    except Exception as e:
                        logger.error(f"Error parsing embedding for {emp_id}: {e}")
                if emp_embeddings:
                    embeddings_temp[emp_id] = emp_embeddings

        cls._embeddings_cache = embeddings_temp
        cls._employee_info_cache = info_temp
        logger.info(f"Loaded face templates for {len(embeddings_temp)} employee(s).")

    # ─────────────────────────────────────────────
    # Face Matching
    # ─────────────────────────────────────────────
    @classmethod
    def match_face_embedding(cls, query_embedding: np.ndarray, tolerance: float = 0.50) -> tuple[str, float]:
        """Euclidean nearest-neighbour match across cached templates."""
        if not cls._embeddings_cache:
            cls.load_embeddings_cache()
        if not cls._embeddings_cache:
            return "Unknown", 0.0

        best_id = "Unknown"
        min_dist = 999.0

        for emp_id, templates in cls._embeddings_cache.items():
            for template in templates:
                dist = float(np.linalg.norm(template - query_embedding))
                if dist < min_dist:
                    min_dist = dist
                    best_id = emp_id

        if min_dist <= tolerance:
            confidence = max(0.0, (1.0 - (min_dist / 0.6))) * 100
            return best_id, round(confidence, 1)
        return "Unknown", 0.0

    # ─────────────────────────────────────────────
    # Real-Time Attendance
    # ─────────────────────────────────────────────
    @classmethod
    def register_realtime_attendance(cls, employee_id: str) -> dict:
        """Mark attendance with cooldown guard."""
        now = pytime.time()
        if now - cls._last_seen.get(employee_id, 0.0) < cls._recognition_cooldown_seconds:
            return {"success": False, "message": "Cooldown active"}
        cls._last_seen[employee_id] = now

        current_dt = datetime.now()

        if cls.attendance_mode == "check-out":
            return AttendanceService.record_check_out(employee_id, current_dt)
        elif cls.attendance_mode == "check-in":
            return AttendanceService.record_check_in(employee_id, current_dt)
        else:
            # Auto-determine based on whether already checked in
            current_date_str = current_dt.strftime("%Y-%m-%d")
            with get_db() as db:
                log = db.attendance_logs.find_one({"employee_id": employee_id, "date": current_date_str})
                has_checked_in = bool(log and log.get("check_in_time"))
            if has_checked_in and current_dt.time() >= datetime(2000, 1, 1, 12, 0).time():
                return AttendanceService.record_check_out(employee_id, current_dt)
            else:
                return AttendanceService.record_check_in(employee_id, current_dt)

    # ─────────────────────────────────────────────
    # Video Stream
    # ─────────────────────────────────────────────
    @classmethod
    def generate_video_stream(cls):
        """
        OpenCV camera loop → MJPEG multipart stream.
        Uses DirectShow on Windows for reliable hardware access.
        """
        import face_recognition  # late import

        from app.services.settings_service import SettingsService
        cfg = SettingsService.get_settings()
        cam_src = cfg["camera_source"]
        try:
            cam_src = int(cam_src)
        except ValueError:
            pass  # keep RTSP URL string

        # Use DirectShow backend on Windows for reliable camera access
        backend = cv2.CAP_DSHOW if isinstance(cam_src, int) else cv2.CAP_ANY
        cap = cv2.VideoCapture(cam_src, backend)

        if not cap.isOpened():
            logger.error(f"Could not open camera source: {cam_src}")
            return

        # Reduce buffer to avoid stale frames
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        cls.is_camera_running = True
        logger.info(f"Camera feed started from source: {cam_src}")

        process_this_frame = True
        face_locations = []
        face_names: list[str] = []
        face_confidences: list[float] = []

        try:
            while cls.is_camera_running:
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    pytime.sleep(0.05)
                    continue

                small = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
                rgb_small = small[:, :, ::-1]

                if process_this_frame:
                    normalized_rgb = apply_clahe(small)[:, :, ::-1]
                    face_locations = face_recognition.face_locations(normalized_rgb)
                    face_encodings = face_recognition.face_encodings(normalized_rgb, face_locations)

                    face_names = []
                    face_confidences = []
                    for enc in face_encodings:
                        emp_id, conf = cls.match_face_embedding(enc)
                        if emp_id != "Unknown":
                            name = cls._employee_info_cache.get(emp_id, {}).get("name", emp_id)
                            face_names.append(name)
                            face_confidences.append(conf)
                            cls.register_realtime_attendance(emp_id)
                        else:
                            face_names.append("Unknown Face")
                            face_confidences.append(0.0)

                process_this_frame = not process_this_frame

                # Draw bounding boxes
                for (top, right, bottom, left), name, conf in zip(face_locations, face_names, face_confidences):
                    top *= 4; right *= 4; bottom *= 4; left *= 4
                    color = (52, 211, 153) if name != "Unknown Face" else (248, 113, 113)
                    cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                    cv2.rectangle(frame, (left, bottom), (right, bottom + 30), color, cv2.FILLED)
                    label = f"{name} ({int(conf)}%)" if conf > 0 else name
                    cv2.putText(frame, label, (left + 6, bottom + 20),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

                # HUD overlay
                cv2.rectangle(frame, (0, 0), (frame.shape[1], 40), (31, 41, 55), cv2.FILLED)
                mode_label = "CHECK-IN" if cls.attendance_mode == "check-in" else "CHECK-OUT"
                cv2.putText(frame, f"AI Face Attendance — Mode: {mode_label} (ACTIVE)",
                            (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
                cv2.putText(frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            (frame.shape[1] - 200, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (209, 213, 219), 1, cv2.LINE_AA)

                ret, jpeg = cv2.imencode(".jpg", frame)
                if not ret:
                    continue

                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n\r\n")
                pytime.sleep(0.04)

        finally:
            cap.release()
            cls.is_camera_running = False
            logger.info("Camera released.")

    @classmethod
    def stop_camera(cls):
        """Signal the camera loop to stop."""
        cls.is_camera_running = False
