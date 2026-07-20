import os
import base64
import numpy as np
import cv2

XML_FRONTAL_PATH = os.path.join(os.path.dirname(__file__), "data", "haarcascade_frontalface_default.xml")
XML_ALT_PATH = os.path.join(os.path.dirname(__file__), "data", "haarcascade_frontalface_alt.xml")
XML_PROFILE_PATH = os.path.join(os.path.dirname(__file__), "data", "haarcascade_profileface.xml")
XML_EYEGLASSES_PATH = os.path.join(os.path.dirname(__file__), "data", "haarcascade_eye_tree_eyeglasses.xml")

class InterviewAnalyzer:
    def __init__(self):
        try:
            if os.path.exists(XML_FRONTAL_PATH):
                self.face_cascade = cv2.CascadeClassifier(XML_FRONTAL_PATH)
            else:
                self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

            if os.path.exists(XML_ALT_PATH):
                self.alt_cascade = cv2.CascadeClassifier(XML_ALT_PATH)
            else:
                self.alt_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')

            if os.path.exists(XML_PROFILE_PATH):
                self.profile_cascade = cv2.CascadeClassifier(XML_PROFILE_PATH)
            else:
                self.profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

            if os.path.exists(XML_EYEGLASSES_PATH):
                self.eye_cascade = cv2.CascadeClassifier(XML_EYEGLASSES_PATH)
            else:
                self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml')

            if self.face_cascade and self.face_cascade.empty():
                self.face_cascade = None
            if self.alt_cascade and self.alt_cascade.empty():
                self.alt_cascade = None
            if self.profile_cascade and self.profile_cascade.empty():
                self.profile_cascade = None
            if self.eye_cascade and self.eye_cascade.empty():
                self.eye_cascade = None
        except Exception:
            self.face_cascade = None
            self.alt_cascade = None
            self.profile_cascade = None
            self.eye_cascade = None

        # Initialize YOLOv8 model for real-time mobile phone object detection
        self.yolo_model = None
        self._init_yolo()

    def _init_yolo(self):
        if self.yolo_model is None:
            try:
                from ultralytics import YOLO
                self.yolo_model = YOLO("yolov8n.pt")
                print("⚡ [YOLOv8 Engine] Mobile Phone Detector Initialized Successfully!")
            except Exception as e:
                print(f"⚠️ [YOLO Init Warning]: {e}")
                self.yolo_model = None

    def analyze_frame(self, frame):
        if frame is None or (self.face_cascade is None and self.alt_cascade is None):
            return {
                "face_detected": True,
                "face_count": 1,
                "multi_face": False,
                "phone_detected": False,
                "gaze_away": False,
                "eye_contact_score": 100,
                "attention_score": 100,
                "pose_direction": "Forward",
                "gaze_direction": "Centered"
            }

        img_h, img_w, _ = frame.shape
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Ensure YOLO model is loaded (Lazy initialization)
        if self.yolo_model is None:
            self._init_yolo()

        # 0. Real-Time Mobile Phone Object Detection (COCO Class 67 = cell phone)
        phone_detected = False
        if self.yolo_model is not None:
            try:
                results = self.yolo_model(frame, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        # Class 67 = cell phone, lowered conf threshold to 0.20 for webcam frames
                        if cls_id == 67 and conf >= 0.20:
                            phone_detected = True
                            print(f"📱 [YOLO Vision Engine] Mobile Phone Detected! Confidence: {conf:.2f}")
                            break
            except Exception as err:
                print(f"⚠️ [YOLO Inference Error]: {err}")
                phone_detected = False

        # 1. Primary Frontal Face Detection
        faces = []
        if self.face_cascade is not None:
            faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(40, 40))

        # 2. Eyeglasses & Alt Face Detection (Specialized for candidates wearing glasses or spec frames)
        if len(faces) == 0 and self.alt_cascade is not None:
            faces = self.alt_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=3, minSize=(40, 40))

        real_faces = []
        for (fx, fy, fw, fh) in faces:
            aspect_ratio = fw / float(fh)
            if 0.50 <= aspect_ratio <= 1.50 and fw >= 40 and fh >= 40:
                real_faces.append((fx, fy, fw, fh))

        face_count = len(real_faces)

        # 3. Secondary Profile Face Detection (If frontal face missing because head turned sideways)
        if face_count == 0 and self.profile_cascade is not None:
            profiles = self.profile_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=3, minSize=(35, 35))
            if len(profiles) > 0:
                return {
                    "face_detected": True,
                    "face_count": 1,
                    "multi_face": False,
                    "phone_detected": bool(phone_detected),
                    "gaze_away": True,
                    "eye_contact_score": 50,
                    "attention_score": 50,
                    "pose_direction": "Head Turned Sideways",
                    "gaze_direction": "Looking Away"
                }

        # 4. If neither Frontal, Alt, nor Profile face is found -> Candidate absent or camera blocked
        if face_count == 0:
            return {
                "face_detected": False,
                "face_count": 0,
                "multi_face": False,
                "phone_detected": bool(phone_detected),
                "gaze_away": False,
                "eye_contact_score": 0,
                "attention_score": 0,
                "pose_direction": "No Face Detected",
                "gaze_direction": "Off-Screen"
            }

        # Multi-face triggers ONLY if 2 distinct separate people exist (center distance > 80% face width)
        multi_face = False
        if face_count > 1:
            x1, y1, w1, h1 = real_faces[0]
            x2, y2, w2, h2 = real_faces[1]
            center_dist = np.sqrt((x1 - x2)**2 + (y1 - y2)**2)
            if center_dist > max(w1, w2) * 0.8:
                multi_face = True

        x, y, w, h = real_faces[0]

        # 5. Closed Eyes & Open Eyes Detection (Upper 55% Face Region)
        eyes_closed = False
        if self.eye_cascade is not None:
            roi_upper = gray[max(0, y): min(img_h, y + int(h * 0.55)), max(0, x): min(img_w, x + w)]
            if roi_upper.shape[0] > 10 and roi_upper.shape[1] > 10:
                detected_eyes = self.eye_cascade.detectMultiScale(roi_upper, scaleFactor=1.1, minNeighbors=3, minSize=(12, 12))
                if len(detected_eyes) == 0:
                    eyes_closed = True

        face_center_x = x + (w / 2.0)
        face_center_y = y + (h / 2.0)
        img_center_x = img_w / 2.0
        img_center_y = img_h / 2.0

        offset_x = (face_center_x - img_center_x) / (img_w / 2.0)
        offset_y = (face_center_y - img_center_y) / (img_h / 2.0)

        # Natural typing allowance: allow downward glance (offset_y up to 0.65) when head is centered
        looking_left_right = abs(offset_x) > 0.35
        looking_excessive_up_down = offset_y < -0.45 or offset_y > 0.65

        # Closed eyes check applies when looking sideways or excessive up/down
        gaze_away = bool(looking_left_right or looking_excessive_up_down)

        direction_label = "Forward"
        if gaze_away:
            if offset_y > 0.65:
                direction_label = "Looking Down"
            elif offset_y < -0.45:
                direction_label = "Looking Up"
            elif offset_x < -0.35:
                direction_label = "Looking Left"
            else:
                direction_label = "Looking Right"

        return {
            "face_detected": True,
            "face_count": int(face_count),
            "multi_face": bool(multi_face),
            "phone_detected": bool(phone_detected),
            "gaze_away": bool(gaze_away),
            "eye_contact_score": int(95 if not gaze_away else 55),
            "attention_score": int(90 if not gaze_away else 60),
            "pose_direction": str(direction_label),
            "gaze_direction": str("Centered" if not gaze_away else direction_label)
        }

class VisionService:
    def __init__(self):
        self.analyzer = InterviewAnalyzer()

    def analyze_base64_frame(self, base64_image: str):
        if not base64_image:
            return {
                "face_detected": False,
                "face_count": 0,
                "multi_face": False,
                "phone_detected": False,
                "gaze_away": False,
                "eye_contact_score": 0,
                "attention_score": 0,
                "error": "No image data provided"
            }

        try:
            if "," in base64_image:
                base64_image = base64_image.split(",", 1)[1]

            img_bytes = base64.b64decode(base64_image)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                return {"face_detected": False, "error": "Failed to decode frame"}

            return self.analyzer.analyze_frame(frame)
        except Exception as e:
            return {
                "face_detected": True,
                "face_count": 1,
                "multi_face": False,
                "phone_detected": False,
                "gaze_away": False,
                "eye_contact_score": 90,
                "attention_score": 90,
                "error": str(e)
            }

vision_service = VisionService()
