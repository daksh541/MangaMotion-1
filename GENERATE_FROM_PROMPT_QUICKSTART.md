# Generate from Prompt - Quick Start

## 5-Minute Setup

### 1. Start Services

```bash
# Terminal 1: Start MinIO and RabbitMQ
docker-compose up -d minio rabbitmq

# Terminal 2: Run migrations
cd mangamotion/backend
npm run migrate

# Terminal 3: Start backend
npm start

# Terminal 4: Start worker
npm run worker
```

### 2. Create a Job

```bash
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"turn this into anime, cinematic","style":"studio","seed":42}'
```

**Response:**
```json
{"jobId":"550e8400-e29b-41d4-a716-446655440000"}
```

### 3. Check Status

```bash
curl "http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000"
```

**Response (processing):**
```json
{
  "jobId":"550e8400-e29b-41d4-a716-446655440000",
  "status":"processing",
  "progress":50,
  "error":null,
  "createdAt":"2025-11-23T18:30:00.000Z",
  "updatedAt":"2025-11-23T18:32:00.000Z"
}
```

**Response (completed):**
```json
{
  "jobId":"550e8400-e29b-41d4-a716-446655440000",
  "status":"completed",
  "progress":100,
  "error":null,
  "createdAt":"2025-11-23T18:30:00.000Z",
  "updatedAt":"2025-11-23T18:35:00.000Z",
  "resultUrl":"https://minio.example.com/outputs/550e8400-e29b-41d4-a716-446655440000/video.mp4?..."
}
```

## API Endpoint

**POST /api/generate-from-prompt**

```json
{
  "prompt": "string (required, max 2000 chars)",
  "style": "string (optional)",
  "seed": "number (optional)",
  "userId": "string (optional)"
}
```

Returns: `202 { jobId }`

## Run Tests

```bash
cd mangamotion/backend
npm test -- generate-from-prompt.test.js
```

## Key Files

| File | Purpose |
|------|---------|
| `mangamotion/backend/src/routes/generate-from-prompt.js` | Endpoint handler |
| `mangamotion/backend/src/routes/generate-from-prompt.test.js` | Jest tests |
| `worker/worker.js` | Job processor (updated to handle prompt-only jobs) |
| `mangamotion/backend/src/server.js` | Route registration (line 395-397) |

## Database

Jobs are stored in SQLite `jobs` table:

```bash
sqlite3 db.sqlite3 "SELECT id, prompt, status, progress FROM jobs ORDER BY created_at DESC LIMIT 5;"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Job stuck in 'queued' | Ensure worker is running: `npm run worker` |
| 400 error on request | Check prompt is non-empty and <= 2000 chars |
| 500 error | Check MinIO/RabbitMQ are running: `docker-compose ps` |
| Worker can't find test file | Verify `/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov` exists |

## Next Steps

1. Integrate with frontend (Phase 2: ResultPage.jsx)
2. Add user authentication (Phase 3)
3. Implement credit system (Phase 5)
4. Replace worker simulation with real ML pipeline (Phase 6)

## Documentation

- Full docs: `GENERATE_FROM_PROMPT_README.md`
- Backend integration: `mangamotion/backend/src/routes/generate-from-prompt.js`
- Worker integration: `worker/worker.js`
