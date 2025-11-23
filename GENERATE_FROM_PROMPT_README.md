# Generate from Prompt Endpoint

## Overview

The `POST /api/generate-from-prompt` endpoint allows users to create anime generation jobs from a text prompt only, without uploading a file. The endpoint validates the prompt, creates a job record in SQLite, and enqueues it for processing via RabbitMQ.

## Endpoint Specification

### Request

**URL:** `POST /api/generate-from-prompt`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "prompt": "turn this into anime, cinematic",
  "style": "studio",
  "seed": 42,
  "userId": "user-123"
}
```

**Parameters:**
- `prompt` (required, string): The generation prompt. Must be non-empty, max 2000 characters.
- `style` (optional, string): Art style (e.g., "studio", "manga", "anime"). Passed to worker.
- `seed` (optional, number): Random seed for reproducibility. Passed to worker.
- `userId` (optional, string): User identifier for tracking. Stored in job record.

### Response

**Status:** `202 Accepted`

**Response Body:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

The `jobId` is a UUIDv4 that uniquely identifies the job. Use this to poll status via `GET /api/status/:jobId`.

### Error Responses

**400 Bad Request** - Invalid prompt:
```json
{
  "error": "invalid_prompt",
  "message": "prompt must be a non-empty string"
}
```

**500 Internal Server Error** - Database or RabbitMQ failure:
```json
{
  "error": "internal_error",
  "message": "error details"
}
```

## Validation Rules

1. **Prompt Required:** Must be a non-empty string.
2. **Whitespace:** Prompt cannot be only whitespace.
3. **Length:** Maximum 2000 characters.
4. **Sanitization:** Shell metacharacters (`;`, `&`, `|`, `` ` ``, `$`, `()`, `{}`, `[]`, `<>`, `\`) are removed.

## Database Schema

Jobs created via this endpoint are stored in the `jobs` table:

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  file_path TEXT,                    -- NULL for prompt-only jobs
  result_path TEXT,                  -- Set by worker when complete
  prompt TEXT,                       -- Sanitized prompt
  status TEXT NOT NULL,              -- 'queued', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0,        -- 0-100
  error TEXT,                        -- Error message if failed
  created_at TEXT NOT NULL,          -- ISO 8601 timestamp
  updated_at TEXT NOT NULL           -- ISO 8601 timestamp
);
```

## RabbitMQ Message Format

When a job is enqueued, the following message is published to the `mangamotion_jobs` queue:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "turn this into anime, cinematic",
  "style": "studio",
  "seed": 42,
  "testFileUrl": "/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov",
  "userId": "user-123"
}
```

**Key Fields:**
- `jobId`: Unique job identifier.
- `prompt`: Sanitized user prompt.
- `style`, `seed`: Optional parameters for the model.
- `testFileUrl`: Path to a local test file used by the worker (for simulation/demo).
- `userId`: Optional user identifier.

## Worker Integration

The worker (`worker/worker.js`) processes these jobs:

1. **Receives Message:** Consumes from `mangamotion_jobs` queue.
2. **Handles Prompt-Only Jobs:** If `filePath` is null, uses `testFileUrl` as input.
3. **Simulates Processing:** Updates progress in DB (10% → 30% → 50% → 70% → 90% → 100%).
4. **Uploads Result:** Saves output to MinIO at `outputs/{jobId}/video.mp4`.
5. **Updates DB:** Sets status to 'completed' and stores `result_path`.

### Example Worker Log Output

```
[Worker] Received job 550e8400-e29b-41d4-a716-446655440000
[Worker]   - File: (none - prompt-only)
[Worker]   - Prompt: turn this into anime, cinematic
[Worker]   - Style: studio
[Worker]   - Seed: 42
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 marked as processing
[Worker] Using test file: /mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov
[Worker] Test file copied to /path/to/tmp_worker/550e8400-e29b-41d4-a716-446655440000_input.mov
[Worker] Simulating processing for job 550e8400-e29b-41d4-a716-446655440000...
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 30%
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 50%
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 70%
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 progress: 90%
[Worker] Uploading result to outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4
[Worker] Upload complete
[Worker] Job 550e8400-e29b-41d4-a716-446655440000 completed. Result: outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4
```

## Usage Examples

### cURL Example

```bash
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "turn this into anime, cinematic",
    "style": "studio",
    "seed": 42
  }'
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### JavaScript/Node.js Example

```javascript
const jobId = await fetch('http://localhost:3000/api/generate-from-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'turn this into anime, cinematic',
    style: 'studio',
    seed: 42
  })
}).then(r => r.json()).then(d => d.jobId);

console.log('Job created:', jobId);

// Poll for status
const checkStatus = async () => {
  const status = await fetch(`http://localhost:3000/api/status/${jobId}`)
    .then(r => r.json());
  console.log('Status:', status);
};

setInterval(checkStatus, 2000);
```

### Python Example

```python
import requests
import json
import time

response = requests.post(
    'http://localhost:3000/api/generate-from-prompt',
    json={
        'prompt': 'turn this into anime, cinematic',
        'style': 'studio',
        'seed': 42
    }
)

job_id = response.json()['jobId']
print(f'Job created: {job_id}')

# Poll for status
while True:
    status = requests.get(f'http://localhost:3000/api/status/{job_id}').json()
    print(f"Status: {status['status']}, Progress: {status['progress']}%")
    if status['status'] in ['completed', 'failed']:
        break
    time.sleep(2)
```

## Testing

### Unit Tests

Run the Jest test suite:

```bash
npm test -- generate-from-prompt.test.js
```

**Test Coverage:**
- Request validation (empty, whitespace, length, type)
- Database operations (insert, timestamps, sanitization)
- RabbitMQ publishing (message format, queue, persistence)
- Error handling (DB errors, RabbitMQ failures)
- Prompt sanitization (shell metacharacters, trimming, truncation)

### Integration Test with Sample File

1. **Start Services:**
   ```bash
   docker-compose up -d minio rabbitmq
   npm run migrate
   npm start
   npm run worker
   ```

2. **Create Job:**
   ```bash
   curl -X POST "http://localhost:3000/api/generate-from-prompt" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"turn this into anime, cinematic"}'
   ```

3. **Monitor Progress:**
   ```bash
   # Replace with actual jobId from response
   curl "http://localhost:3000/api/status/{jobId}"
   ```

4. **Verify Result:**
   - Check MinIO: `outputs/{jobId}/video.mp4` should exist
   - Check DB: `SELECT * FROM jobs WHERE id = '{jobId}'` should show status='completed'

## Security Considerations

### Prompt Sanitization

Prompts are sanitized to prevent shell injection:
- Removes shell metacharacters: `;`, `&`, `|`, `` ` ``, `$`, `()`, `{}`, `[]`, `<>`, `\`
- Trims whitespace
- Truncates to 2000 characters

### Rate Limiting

Future versions should implement rate limiting (e.g., 5 requests/min per IP) to prevent abuse.

### Authentication

Optional `userId` parameter can be used to track jobs per user. Future versions should enforce JWT authentication.

## Deployment Notes

### Environment Variables

```bash
DATABASE_FILE=/path/to/db.sqlite3
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=mangamotion
```

### Reliability

- **Database Failure:** Job is still inserted before RabbitMQ publish. If RabbitMQ fails, endpoint returns 202 and worker will eventually process the job.
- **RabbitMQ Failure:** Endpoint returns 202 anyway. Worker will pick up the job when RabbitMQ recovers.
- **Worker Failure:** Job status remains 'processing' until worker updates it. Implement timeout logic to mark jobs as failed after X minutes.

## Future Enhancements

1. **Rate Limiting:** Implement per-IP and per-user rate limits.
2. **Authentication:** Require JWT token for job creation.
3. **Credit System:** Deduct credits on job creation.
4. **Webhook Notifications:** Notify client when job completes.
5. **Advanced Prompt Features:** Support prompt templates, variables, and conditional logic.
6. **Model Selection:** Allow users to choose between multiple models.
7. **Quality Settings:** Expose resolution, FPS, codec options.

## Troubleshooting

### Job Stuck in 'queued' Status

**Cause:** Worker is not running or not consuming from queue.

**Solution:**
```bash
npm run worker
```

### Job Marked as 'failed' with Error

**Check:** Look at the `error` field in the job record:
```bash
sqlite3 db.sqlite3 "SELECT error FROM jobs WHERE id = '{jobId}';"
```

**Common Errors:**
- `Test file not found`: Verify `/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov` exists
- `Connection refused`: Check MinIO and RabbitMQ are running

### Prompt Not Sanitized Correctly

**Check:** Verify the prompt in the database:
```bash
sqlite3 db.sqlite3 "SELECT prompt FROM jobs WHERE id = '{jobId}';"
```

**If dangerous characters remain:** Update the sanitization regex in `generate-from-prompt.js`.

## API Reference

### GET /api/status/:jobId

Retrieve job status and progress.

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "error": null,
  "createdAt": "2025-11-23T18:30:00.000Z",
  "updatedAt": "2025-11-23T18:35:00.000Z",
  "resultUrl": "https://minio.example.com/outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4?..."
}
```

## Files

- **Backend Route:** `mangamotion/backend/src/routes/generate-from-prompt.js`
- **Tests:** `mangamotion/backend/src/routes/generate-from-prompt.test.js`
- **Worker:** `worker/worker.js`
- **Database Migration:** `mangamotion/backend/migrations/create_jobs.sql`
- **Server Integration:** `mangamotion/backend/src/server.js` (line 395-397)

## Support

For issues or questions, refer to the main project README or contact the development team.
