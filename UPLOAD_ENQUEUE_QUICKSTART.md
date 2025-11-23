# Upload → Enqueue → Respond: Quick Start

Get the end-to-end flow running in 5 minutes.

## 1. Start Infrastructure (Docker)

**Terminal 1: MinIO**
```bash
docker run -d \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  --name minio \
  minio/minio server /data --console-address ":9001"
```

**Terminal 2: RabbitMQ**
```bash
docker run -d \
  -p 5672:5672 -p 15672:15672 \
  --name rabbitmq \
  rabbitmq:3-management
```

## 2. Initialize Database

```bash
cd mangamotion/backend
npm install
npm run migrate
```

## 3. Start Backend

**Terminal 3: Backend Server**
```bash
cd mangamotion/backend
npm start
```

Expected: `Server listening on 3000`

## 4. Start Worker

**Terminal 4: Worker**
```bash
cd mangamotion/backend
npm run worker
```

Expected: `[Worker] Connected to RabbitMQ, waiting for jobs...`

## 5. Test Upload

**Terminal 5: Upload Test**
```bash
curl -v -X POST "http://localhost:3000/api/upload" \
  -F "file=@/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov" \
  -F "prompt=make this anime-style, add subtle camera parallax, 24fps"
```

Response:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 6. Check Status

```bash
curl "http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000"
```

Response (while processing):
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

Response (when completed):
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

## Monitoring

- **MinIO Console**: http://localhost:9001 (user: minioadmin, pass: minioadmin)
- **RabbitMQ Console**: http://localhost:15672 (user: guest, pass: guest)
- **Database**: `db.sqlite3` in project root

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused (MinIO) | Check `docker ps \| grep minio` |
| Connection refused (RabbitMQ) | Check `docker ps \| grep rabbitmq` |
| Database locked | Delete `db.sqlite3` and re-run `npm run migrate` |
| Worker not processing | Check RabbitMQ console for queue `mangamotion_jobs` |

## Files Created

- `mangamotion/backend/src/routes/upload-enqueue.js` - Upload & status endpoints
- `mangamotion/backend/src/migrate.js` - Database migration
- `mangamotion/backend/migrations/create_jobs.sql` - Database schema
- `worker/worker.js` - RabbitMQ consumer
- `frontend/src/components/UploadEnqueue.jsx` - React component
- `UPLOAD_ENQUEUE_README.md` - Full documentation

## Next Steps

1. Replace simulated processing in `worker/worker.js` with real AI pipeline
2. Add file validation (malware scanning)
3. Implement retry logic and dead-letter queue
4. Add progress webhooks
5. Implement result cleanup/expiration
6. Add user authentication and job ownership
