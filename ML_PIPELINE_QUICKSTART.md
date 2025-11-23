# Real ML Pipeline - Quick Start

## 5-Minute Setup

### 1. Start Backend

```bash
cd mangamotion/backend
npm start
```

### 2. Start Pipeline Worker (Mock Mode)

```bash
cd worker
MODEL_ADAPTER_TYPE=mock npm run worker:pipeline
```

Or from root:
```bash
npm run worker:pipeline
```

### 3. Create a Job

```bash
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"prompt":"turn this into anime, cinematic"}'
```

### 4. Monitor Progress

```bash
curl -X GET "http://localhost:3000/api/status/{jobId}" \
  -H "Authorization: Bearer {accessToken}"
```

Watch the progress increase from 0 to 100 as the pipeline stages execute.

## Pipeline Stages

| Stage | Progress | Description |
|-------|----------|-------------|
| Preprocess | 10-15% | Validate and normalize input |
| Inference | 15-65% | Run ML model |
| Postprocess | 65-75% | Apply filters and effects |
| Stitch | 75-85% | Combine frames into video |
| Thumbnails | 85-95% | Generate preview images |

## Model Adapters

### Mock Adapter (Testing)

```bash
MODEL_ADAPTER_TYPE=mock npm run worker:pipeline
```

- Simulates inference
- No ML model required
- Fast execution
- Perfect for testing

### Python Adapter (Local)

```bash
# Install dependencies
pip install -r worker/requirements.txt

# Start worker
MODEL_ADAPTER_TYPE=python npm run worker:pipeline
```

Requires:
- Python 3.7+
- `worker/model.py` script
- Model dependencies

### HTTP Adapter (Remote)

```bash
# Start model service
python -m flask --app model_service run --port 5000

# Start worker
MODEL_ADAPTER_TYPE=http \
  MODEL_API_URL=http://localhost:5000 \
  npm run worker:pipeline
```

Requires:
- Model HTTP service running
- Proper request/response format

## Environment Variables

```bash
# Model adapter type
MODEL_ADAPTER_TYPE=mock

# Python adapter
PYTHON_PATH=python3

# HTTP adapter
MODEL_API_URL=http://localhost:5000
MODEL_API_TIMEOUT=300000

# Database
DATABASE_FILE=/path/to/db.sqlite3

# MinIO
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672
```

## Key Files

| File | Purpose |
|------|---------|
| `worker/pipeline.js` | Pipeline stages |
| `worker/model-adapter.js` | Model adapters |
| `worker/worker-pipeline.js` | Pipeline worker |
| `worker/model.py` | Python model stub |

## Features

✅ 5-stage pipeline architecture
✅ Pluggable model adapters
✅ Real-time progress tracking
✅ Error handling and recovery
✅ Automatic cleanup
✅ Retry logic
✅ Thumbnail generation
✅ MinIO integration

## Workflow

1. **Job Created** → POST /api/generate-from-prompt
2. **Message Published** → RabbitMQ queue
3. **Worker Receives** → Starts processing
4. **Pipeline Executes** → 5 stages in sequence
5. **Progress Updates** → Stored in database
6. **Video Uploaded** → To MinIO
7. **Job Completed** → Status updated
8. **Frontend Displays** → Video with thumbnail

## Testing

### Create Test Job

```bash
# Register user
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get access token (from response)
ACCESS_TOKEN=...

# Create job
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"prompt":"anime style, cinematic"}'

# Get job ID (from response)
JOB_ID=...

# Monitor progress
curl -X GET "http://localhost:3000/api/status/$JOB_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### View Logs

```bash
# Backend logs
npm start

# Worker logs
npm run worker:pipeline

# Model logs (Python)
tail -f /tmp/model.log
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Worker not starting | Check RabbitMQ is running |
| Progress not updating | Check database connection |
| Model not found | Verify MODEL_ADAPTER_TYPE |
| Python errors | Check Python version and dependencies |
| HTTP timeout | Increase MODEL_API_TIMEOUT |

## Next Steps

1. Implement real ML model in Python
2. Deploy model service (HTTP adapter)
3. Configure GPU support
4. Add quality metrics
5. Implement batch processing

## Documentation

- Full docs: `ML_PIPELINE_README.md`
- Pipeline: `worker/pipeline.js`
- Adapters: `worker/model-adapter.js`
- Worker: `worker/worker-pipeline.js`
