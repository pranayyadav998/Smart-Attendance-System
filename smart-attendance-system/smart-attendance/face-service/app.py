"""Face detection and recognition service.

Node.js sends it images; it never touches MongoDB.
  GET  /health     -> {"status": "ok"}
  POST /encode     image                -> {"encoding": [128 numbers]}   (student registration)
  POST /recognize  image + known (JSON) -> faces detected, recognized ids, unknown count, errors

Detection: face_recognition (dlib HOG detector). OpenCV decodes and resizes the image.
Recognition: face_recognition's 128-number encodings, compared by Euclidean distance.
"""
import json
import os

import cv2
import face_recognition
import numpy as np
from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.5"))
DETECTION_MODEL = os.getenv("FACE_DETECTION_MODEL", "hog")
UPSAMPLE = int(os.getenv("FACE_UPSAMPLE", "1"))
MAX_IMAGE_SIDE = int(os.getenv("MAX_IMAGE_SIDE", "2000"))
MAX_IMAGE_MB = float(os.getenv("MAX_IMAGE_MB", "10"))

app = Flask(__name__)
# Room for the image plus the "known" encodings JSON
app.config["MAX_CONTENT_LENGTH"] = int((MAX_IMAGE_MB + 5) * 1024 * 1024)


class BadInput(Exception):
    """The request can be fixed by the user (bad image, no face, ...). Message is safe to show."""


def read_image():
    """Decode the uploaded image with OpenCV and return it as an RGB array."""
    upload = request.files.get("image")
    if upload is None:
        raise BadInput("No image was uploaded.")
    raw = np.frombuffer(upload.read(), np.uint8)
    image = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if image is None:
        raise BadInput("The uploaded file is not a readable image.")

    height, width = image.shape[:2]
    scale = MAX_IMAGE_SIDE / max(height, width)
    if scale < 1:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def detect_and_encode(rgb):
    locations = face_recognition.face_locations(rgb, number_of_times_to_upsample=UPSAMPLE, model=DETECTION_MODEL)
    encodings = face_recognition.face_encodings(rgb, known_face_locations=locations)
    return locations, encodings


def read_known():
    """Parse and validate the 'known' form field: [{"id": "...", "encoding": [128 numbers]}]."""
    try:
        known = json.loads(request.form.get("known", ""))
    except json.JSONDecodeError:
        raise BadInput("The 'known' field must be valid JSON.")
    if not isinstance(known, list):
        raise BadInput("The 'known' field must be a list.")
    for item in known:
        ok = (
            isinstance(item, dict)
            and isinstance(item.get("id"), str)
            and isinstance(item.get("encoding"), list)
            and len(item["encoding"]) == 128
            and all(isinstance(n, (int, float)) for n in item["encoding"])
        )
        if not ok:
            raise BadInput("Each known student needs an id and a 128-number encoding.")
    return known


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/encode")
def encode():
    _, encodings = detect_and_encode(read_image())
    if len(encodings) == 0:
        raise BadInput("No face was detected. Use a clear, front-facing photo.")
    if len(encodings) > 1:
        raise BadInput("More than one face was detected. Use a photo with only the student's face.")
    return jsonify(encoding=[float(n) for n in encodings[0]])


@app.post("/recognize")
def recognize():
    rgb = read_image()
    known = read_known()
    _, encodings = detect_and_encode(rgb)

    if len(encodings) == 0:
        return jsonify(facesDetected=0, recognized=[], unknownFaces=0, errors=["No faces were detected in the image."])

    best = {}  # student id -> smallest distance among the faces that matched that student
    if known:
        known_encodings = np.array([k["encoding"] for k in known], dtype=float)
        for face in encodings:
            distances = face_recognition.face_distance(known_encodings, face)
            closest = int(np.argmin(distances))
            if distances[closest] <= MATCH_THRESHOLD:
                student_id = known[closest]["id"]
                if student_id not in best or distances[closest] < best[student_id]:
                    best[student_id] = float(distances[closest])

    # If two faces matched the same student, only the closer one is kept; the other counts as unknown.
    errors = []
    unknown = len(encodings) - len(best)
    recognized = [{"id": sid, "distance": round(d, 4)} for sid, d in sorted(best.items(), key=lambda kv: kv[1])]
    return jsonify(facesDetected=len(encodings), recognized=recognized, unknownFaces=unknown, errors=errors)


@app.errorhandler(BadInput)
def bad_input(err):
    return jsonify(message=str(err)), 422


@app.errorhandler(RequestEntityTooLarge)
def too_large(err):
    return jsonify(message="The upload is too large."), 413


@app.errorhandler(Exception)
def unexpected(err):
    # Log the error type only: never log images or encodings.
    app.logger.error("Unexpected error: %s", type(err).__name__)
    return jsonify(message="The service could not process the image."), 500


if __name__ == "__main__":
    app.run(host=os.getenv("FACE_SERVICE_HOST", "127.0.0.1"), port=int(os.getenv("FACE_SERVICE_PORT", "8000")))
