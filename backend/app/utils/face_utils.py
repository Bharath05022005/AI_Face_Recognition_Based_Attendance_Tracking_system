import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

def is_blurry(image: np.ndarray, threshold: float = 80.0) -> tuple[bool, float]:
    """
    Check if an image is blurry using the variance of the Laplacian method.
    Returns:
        (is_blurry, variance)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance < threshold, variance

def apply_clahe(image: np.ndarray) -> np.ndarray:
    """
    Apply Contrast Limited Adaptive Histogram Equalization (CLAHE) on the L-channel
    of the image in the LAB color space to normalize lighting conditions.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    # Grid size 8x8, clip limit 2.0
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l_channel)
    
    merged = cv2.merge((cl, a_channel, b_channel))
    normalized = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    return normalized

def align_face(image: np.ndarray, landmarks: dict) -> np.ndarray:
    """
    Rotate and scale the face image so that the eyes are perfectly aligned horizontally.
    landmarks is a dict containing 'left_eye' and 'right_eye' points from face_recognition.
    """
    if not landmarks or 'left_eye' not in landmarks or 'right_eye' not in landmarks:
        return image  # Fallback to original image if eye landmarks are not detected

    left_eye_pts = landmarks['left_eye']
    right_eye_pts = landmarks['right_eye']

    # Compute eye centers
    left_eye_center = np.mean(left_eye_pts, axis=0)
    right_eye_center = np.mean(right_eye_pts, axis=0)

    # Compute angle between eye centers
    dy = right_eye_center[1] - left_eye_center[1]
    dx = right_eye_center[0] - left_eye_center[0]
    
    # Calculate angle in degrees
    angle = np.degrees(np.arctan2(dy, dx))

    # We want left eye center and right eye center to be perfectly horizontal, so angle should be 0
    # Rotation center is the midpoint between eyes
    eye_midpoint = (
        int((left_eye_center[0] + right_eye_center[0]) / 2),
        int((left_eye_center[1] + right_eye_center[1]) / 2)
    )

    # Get rotation matrix
    h, w = image.shape[:2]
    rot_matrix = cv2.getRotationMatrix2D(eye_midpoint, angle, scale=1.0)
    
    # Rotate the image
    aligned_image = cv2.warpAffine(image, rot_matrix, (w, h), flags=cv2.INTER_CUBIC)
    return aligned_image
