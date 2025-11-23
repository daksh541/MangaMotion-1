# MangaMotion Upload → Enqueue → Respond Implementation

This document describes the end-to-end implementation of the upload → enqueue → respond flow for MangaMotion using Node.js + Express, MinIO, RabbitMQ, and SQLite.

## Architecture Overview

```
┌─────────────────┐
│   Client        │
│  (curl/React)   │
└────────┬────────┘
         │ POST /api/upload (multipart/form-data)
         │
    ┌────▼──────────────────────────────────────┐
    │  Backend (Express)                         │
    │  - Validate file (ext, size)               │
    │  - Upload to MinIO                         │
    │  - Insert job into SQLite                  │
    │  - Publish to RabbitMQ                     │
    │  - Return 202 { jobId }                    │
    └────┬──────────────────────────────────────┘
         │
    ┌────┴──────────────────────────────────────┐
    │  RabbitMQ Queue (mangamotion_jobs)         │
    │  Message: { jobId, filePath, prompt }     │
    └────┬──────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │  Worker (Node.js Consumer)                 │
    │  - Consume job from queue                  │
    │  - Download input from MinIO               │
    │  - Process (simulate AI pipeline)          │
    │  - Upload result to MinIO                  │
    │  - Update job status in SQLite             │
    └────────────────────────────────────────────┘

Database (SQLite):
┌─────────────────────────────────────────────┐
│  jobs table                                  │
│  - id (UUID)                                │
│  - file_path (MinIO key)                    │
│  - result_path (MinIO key)                  │
│  - prompt (text)                            │
│  - status (queued/processing/completed)     │
│  - progress (0-100)                         │
│  - error (text)                             │
│  - created_at, updated_at (ISO timestamps)  │
└─────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 14+ and npm
- Docker (for MinIO and RabbitMQ)
- curl (for testing)

## Installation & Setup

### 1. Install Dependencies

```bash
cd mangamotion/backend
npm install
```

This installs:
- `express` - Web framework
- `multer` - File upload handling
- `minio` - MinIO client
- `amqplib` - RabbitMQ client
- `better-sqlite3` - SQLite database
- `uuid` - UUID generation
- `dotenv` - Environment variable loading

### 2. Start MinIO (Docker)

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  --name minio \
  minio/minio server /data --console-address ":9001"
```

MinIO will be available at:
- API: http://localhost:9000
- Console: http://localhost:9001 (user: minioadmin, pass: minioadmin)

### 3. Start RabbitMQ (Docker)

```bash
docker run -d \
  -p 5672:5672 \
  -p 15672:15672 \
  --name rabbitmq \
  rabbitmq:3-management
```

RabbitMQ will be available at:
- AMQP: amqp://guest:guest@127.0.0.1:5672
- Management UI: http://localhost:15672 (user: guest, pass: guest)

### 4. Initialize Database

```bash
cd mangamotion/backend
npm run migrate
```

This creates the SQLite database and `jobs` table.

### 5. Configure Environment

Copy `.env.example` to `.env` and update if needed:

```bash
cp .env.example .env
```

Key variables for this feature:
```env
PORT=3000
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
S3_BUCKET=mangamotion
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672
DATABASE_FILE=./db.sqlite3
MAX_UPLOAD_BYTES=209715200
```

## Running the Application

### Terminal 1: Start Backend Server

```bash
cd mangamotion/backend
npm start
```

Expected output:
```
Server listening on 3000
✓ MinIO bucket 'mangamotion' ready
```

### Terminal 2: Start Worker

```bash
cd mangamotion/backend
npm run worker
```

Expected output:
```
[Worker] Connected to RabbitMQ, waiting for jobs...
```

## Testing the Flow

### Test 1: Upload File (curl)

Using the provided sample file:

```bash
curl -v -X POST "http://localhost:3000/api/upload" \
  -F "file=@/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov" \
  -F "prompt=make this anime-style, add subtle camera parallax, 24fps" \
  -H "Content-Type: multipart/form-data"
```

Expected response (202 Accepted):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Note:** If the sample file path is different on your system, adjust accordingly. The endpoint accepts:
- `.jpg`, `.jpeg`, `.png`, `.webp` (images)
- `.mp4`, `.mov` (videos)
- Max 200MB per file

### Test 2: Check Job Status

Using the jobId from Test 1:

```bash
curl "http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000"
```

Response while processing:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 50,
  "error": null,
  "createdAt": "2025-11-23T18:30:00.000Z",
  "updatedAt": "2025-11-23T18:30:05.000Z"
}
```

Response when completed:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "error": null,
  "createdAt": "2025-11-23T18:30:00.000Z",
  "updatedAt": "2025-11-23T18:30:15.000Z",
  "resultUrl": "http://localhost:9000/mangamotion/outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4?X-Amz-Algorithm=..."
}
```

### Test 3: Error Cases

**Invalid file extension:**
```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "file=@/path/to/file.txt" \
  -H "Content-Type: multipart/form-data"
```

Response (400 Bad Request):
```json
{
  "error": "invalid_file_type",
  "message": "Allowed extensions: .jpg, .jpeg, .png, .webp, .mp4, .mov"
}
```

**File too large:**
```bash
# Create a 201MB file and upload
curl -X POST "http://localhost:3000/api/upload" \
  -F "file=@/path/to/large_file.mp4" \
  -H "Content-Type: multipart/form-data"
```

Response (413 Payload Too Large):
```json
{
  "error": "file_too_large",
  "message": "Max file size: 209715200 bytes"
}
```

**Missing file:**
```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "prompt=test" \
  -H "Content-Type: multipart/form-data"
```

Response (400 Bad Request):
```json
{
  "error": "file_required",
  "message": "file is required"
}
```

## File Structure

```
mangamotion/
├── backend/
│   ├── src/
│   │   ├── migrate.js              # Database migration script
│   │   ├── routes/
│   │   │   └── upload-enqueue.js   # Upload & status endpoints
│   │   └── server.js               # Main Express server
│   ├── migrations/
│   │   └── create_jobs.sql         # Database schema
│   ├── package.json                # Dependencies & scripts
│   └── tmp_uploads/                # Temporary upload directory
├── worker/
│   └── worker.js                   # RabbitMQ consumer & processor
└── db.sqlite3                      # SQLite database (created after migrate)
```

## API Endpoints

### POST /api/upload

Upload a file and enqueue a processing job.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file` (required): File to upload (multipart file)
  - `prompt` (optional): Processing prompt (string)

**Response:**
- Status: `202 Accepted`
- Body: `{ "jobId": "uuid" }`

**Error Responses:**
- `400 Bad Request`: Missing file or invalid extension
- `413 Payload Too Large`: File exceeds 200MB
- `500 Internal Server Error`: Server error

### GET /api/status/:jobId

Get the status of a processing job.

**Request:**
- Method: `GET`
- Path: `/api/status/{jobId}`

**Response:**
- Status: `200 OK`
- Body:
  ```json
  {
    "jobId": "uuid",
    "status": "queued|processing|completed|failed",
    "progress": 0-100,
    "error": null|"error message",
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp",
    "resultUrl": "presigned MinIO URL (if completed)"
  }
  ```

**Error Responses:**
- `404 Not Found`: Job not found
- `500 Internal Server Error`: Server error

## Database Schema

### jobs table

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,                    -- UUID
  file_path TEXT NOT NULL,                -- MinIO key (uploads/{jobId}/original.ext)
  result_path TEXT,                       -- MinIO key (outputs/{jobId}/video.mp4)
  prompt TEXT,                            -- Processing prompt
  status TEXT NOT NULL DEFAULT 'queued',  -- queued|processing|completed|failed
  progress INTEGER DEFAULT 0,             -- 0-100
  error TEXT,                             -- Error message if failed
  created_at TEXT NOT NULL,               -- ISO timestamp
  updated_at TEXT NOT NULL                -- ISO timestamp
);
```

## Logging

The backend logs important events to console:

```
[Backend] Uploading file for job 550e8400-e29b-41d4-a716-446655440000: uploads/550e8400-e29b-41d4-a716-446655440000/original.mov
[Backend] Job 550e8400-e29b-41d4-a716-446655440000 inserted into database
[Backend] Job 550e8400-e29b-41d4-a716-446655440000 published to queue

[Worker] Received job 550e8400-e29b-41d4-a716-446655440000
[Worker]   - File: uploads/550e8400-e29b-41d4-a716-446655440000/original.mov
[Worker]   - Prompt: make this anime-style, add subtle camera parallax, 24fps
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 marked as processing
[Worker] Downloading uploads/550e8400-e29b-41d4-a716-446655440000/original.mov to /path/to/tmp_worker/550e8400-e29b-41d4-a716-446655440000_input.mov
[Worker] Download complete
[Worker] Simulating processing for job 550e8400-e29b-41d4-a716-446655440000...
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 30%
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 50%
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 70%
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 90%
[Worker] Uploading result to outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4
[Worker] Upload complete
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 completed. Result: outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4
```

## Troubleshooting

### Connection Refused (MinIO)
- Ensure MinIO is running: `docker ps | grep minio`
- Check MinIO endpoint in `.env`: `MINIO_ENDPOINT=127.0.0.1`
- Verify MinIO port: `MINIO_PORT=9000`

### Connection Refused (RabbitMQ)
- Ensure RabbitMQ is running: `docker ps | grep rabbitmq`
- Check RabbitMQ URL in `.env`: `RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672`

### Database Locked
- Ensure only one process accesses the database at a time
- If stuck, delete `db.sqlite3` and re-run `npm run migrate`

### Worker Not Processing Jobs
- Check RabbitMQ Management UI: http://localhost:15672
- Verify queue `mangamotion_jobs` exists and has messages
- Check worker logs for errors

### File Not Found in MinIO
- Check MinIO Console: http://localhost:9001
- Verify bucket `mangamotion` exists
- Check that file was uploaded to `uploads/{jobId}/original.ext`

## Integration with React Frontend

See `frontend/src/components/Upload.jsx` for a complete React component that:
- Accepts file input and optional prompt
- Uploads to `/api/upload`
- Polls `/api/status/:jobId` for progress
- Displays progress bar and result URL

## Performance Considerations

- **Max file size**: 200MB (configurable via `MAX_UPLOAD_BYTES`)
- **Upload timeout**: Default 30 seconds (multer default)
- **Worker concurrency**: Single worker processes jobs sequentially
- **Database**: SQLite suitable for dev; use PostgreSQL for production

## Production Deployment

For production:

1. **Database**: Migrate to PostgreSQL
2. **Queue**: Use managed RabbitMQ or AWS SQS
3. **Storage**: Use AWS S3 instead of MinIO
4. **Worker**: Run multiple worker instances
5. **Monitoring**: Add Prometheus metrics and Jaeger tracing
6. **Security**: Enable TLS, add authentication, use secrets management

## Next Steps

1. Replace simulated processing with real AI pipeline
2. Add file validation (malware scanning)
3. Implement retry logic and dead-letter queue
4. Add progress webhooks
5. Implement result cleanup/expiration
6. Add user authentication and job ownership
