# AI-Based Smart Attendance System

    frontend/      React (Vite) - the user interface
    backend/       Node.js + Express + MongoDB (Mongoose) - REST API
    face-service/  Python + OpenCV + face_recognition - face detection and recognition

Flow: React -> Node/Express -> MongoDB, and Node -> Python for faces.
React never talks to MongoDB or Python directly.

## Prerequisites
- Node.js 18 or newer
- MongoDB running locally (or a MongoDB Atlas connection string)
- Python 3.9+. The `face_recognition` package needs `dlib`, which needs CMake and a C++ compiler
  (Windows: Visual Studio Build Tools; Ubuntu: `sudo apt install build-essential cmake`; macOS: `brew install cmake`).

## Run (three terminals)

**1. Python face service**

    cd face-service
    python -m venv venv
    source venv/bin/activate          # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    python app.py                     # http://127.0.0.1:8000

**2. Backend**

    cd backend
    npm install
    cp .env.example .env              # then edit .env (admin password, AUTH_SECRET)
    npm start                         # http://localhost:5000

**3. Frontend**

    cd frontend
    npm install
    cp .env.example .env
    npm run dev                       # http://localhost:5173

Log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in `backend/.env`.
Check all three services at once: open http://localhost:5000/api/health

## Environment variables
backend/.env: `PORT`, `MONGODB_URI`, `CORS_ORIGIN`, `FACE_SERVICE_URL`, `FACE_SERVICE_TIMEOUT_MS`,
`MAX_IMAGE_MB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`
frontend/.env: `VITE_API_URL`
face-service (optional, see face-service/.env.example): `FACE_MATCH_THRESHOLD`, `FACE_DETECTION_MODEL`,
`FACE_UPSAMPLE`, `MAX_IMAGE_SIDE`, `MAX_IMAGE_MB`, `FACE_SERVICE_HOST`, `FACE_SERVICE_PORT`

## Workflow
1. **Students** page: register a student with one clear face photo. The Python service turns the photo
   into a 128-number encoding; only the encoding is stored (in a hidden field), not the photo.
2. **Mark Attendance**: upload a classroom photo -> Python detects faces and compares them to the stored encodings.
3. Review the result table. Correct any status by hand. Nothing is saved yet.
4. **Save Attendance** writes to MongoDB. A student can have only one record per date; students who already have one are skipped.
5. **Records** and **Reports** read the saved data from MongoDB.

## API (all except login and health need `Authorization: Bearer <token>`)
| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/login | `{ email, password }` -> `{ token, user }` |
| GET | /api/health | status of backend, database, face service |
| GET / POST | /api/students | list / register `{ studentId, name, classSection }` |
| GET / PUT / DELETE | /api/students/:id | one student / update / delete (also deletes their attendance) |
| POST | /api/students/:id/face | multipart field `image` -> registers the face encoding |
| POST | /api/attendance/process | multipart `image` (+ optional `classSection`) -> `{ totalFaces, unknownFaces, recognized, errors }`. Saves nothing |
| POST | /api/attendance/confirm | `{ date, records: [{ student, status, source }] }` -> saves |
| GET | /api/attendance | filters: `date`, `from`, `to`, `student`, `classSection` |
| GET | /api/attendance/:id | one record |
| GET | /api/attendance/reports | per-student totals and percentage, same filters |
| GET | /api/dashboard/stats | `{ totalStudents, totalSessions, presentToday, recent }` |

Python service: `GET /health`, `POST /encode` (image), `POST /recognize` (image + `known` JSON).

## Design decisions (good to explain in an interview)
- **Recognition is never automatic.** `/process` only returns suggestions; `/confirm` saves what the user approved.
- **Match threshold** (`FACE_MATCH_THRESHOLD`, default 0.5) is the maximum face distance for a match.
  Lower is stricter. The default is a starting point, not a measured accuracy. Test it on your own photos.
- **If two faces match the same student**, only the closer one counts and the other is reported as unknown.
- **Duplicate prevention:** unique index on (student, date) in MongoDB, enforced with an upsert.
- **Privacy:** photos are processed in memory and never saved. Encodings are `select: false` in Mongoose and are never in API responses.
- **Errors:** user-safe messages only. Stack traces and internal details are never sent to the browser.
- **Login:** one admin account from `.env`, signed token valid for 8 hours. It is basic: no user table, no roles, no password hashing, no rate limiting.

## Limits
- One attendance record per student per day (no separate morning/afternoon sessions).
- Dashboard "sessions" = distinct (date, class/section) pairs.
- Face recognition quality depends on photo quality, face size, lighting and angle. Small faces in large group photos may be missed; try `FACE_UPSAMPLE=2`.
- Use HTTPS and a stronger auth system before putting this on the internet.
