# MangaMotion Developer Onboarding Guide

Welcome to MangaMotion! This guide will help you get up and running with the system in minutes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [End-to-End Job Processing](#end-to-end-job-processing)
4. [Project Structure](#project-structure)
5. [Key Concepts](#key-concepts)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker & Docker Compose** - For running the full stack
  ```bash
  docker --version
  docker-compose --version
  ```

- **Node.js 18+** - For backend development
  ```bash
  node --version
  npm --version
  ```

- **curl or Postman** - For testing APIs

### Optional Tools

- **k6** - For load testing
- **Redis CLI** - For debugging queue
- **PostgreSQL Client** - For database queries
- **jq** - For JSON formatting

### System Requirements

- **Disk Space:** 10GB minimum
- **Memory:** 4GB minimum (8GB recommended)
- **CPU:** 2 cores minimum (4 cores recommended)

---

## Quick Start (5 minutes)

### 1. Clone Repository

```bash
cd ~/Desktop
git clone https://github.com/mangamotion/mangamotion.git
cd mangamotion
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Review and adjust if needed
cat .env
```

### 3. Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (database)
- Redis (queue)
- MinIO (S3 storage)
- API server (port 3000)
- Worker (job processing)
- Prometheus (metrics)
- Grafana (dashboards)
- Jaeger (tracing)

### 4. Verify Services

```bash
# Check all services are running
docker-compose ps

# Should show all services with "Up" status
```

### 5. Test API

```bash
# Health check
curl http://localhost:3000/api/health

# Should return: {"status":"healthy",...}
```

---

## End-to-End Job Processing

### Complete Workflow

Follow these steps to process a job from start to finish:

#### Step 1: Prepare a Test File

```bash
# Create a test image
curl -o test-image.jpg https://via.placeholder.com/300x300.jpg

# Or use an existing image
ls -la test-image.jpg
```

#### Step 2: Upload File and Create Job

```bash
# Upload file
curl -X POST \
  -H "X-User-ID: dev-user-1" \
  -F "pages=@test-image.jpg" \
  http://localhost:3000/api/upload

# Response:
# {"jobId":"550e8400-e29b-41d4-a716-446655440000"}

# Save the jobId
export JOB_ID="550e8400-e29b-41d4-a716-446655440000"
```

#### Step 3: Check Job Status

```bash
# Check status immediately
curl http://localhost:3000/api/status/$JOB_ID

# Response:
# {"status":"pending","progress":0,...}

# Wait a few seconds and check again
sleep 5
curl http://localhost:3000/api/status/$JOB_ID

# Response:
# {"status":"processing","progress":50,...}
```

#### Step 4: Monitor Progress

```bash
# Watch status in real-time
watch -n 1 "curl -s http://localhost:3000/api/status/$JOB_ID | jq ."

# Or use a loop
for i in {1..30}; do
  echo "Check $i:"
  curl -s http://localhost:3000/api/status/$JOB_ID | jq '.status, .progress'
  sleep 2
done
```

#### Step 5: Verify Completion

```bash
# When job completes
curl http://localhost:3000/api/status/$JOB_ID | jq .

# Should show:
# {
#   "status": "completed",
#   "progress": 100,
#   "returnvalue": {...}
# }
```

#### Step 6: Check Metrics

```bash
# View system metrics
curl http://localhost:3000/api/metrics | jq .

# Check alerts
curl http://localhost:3000/api/alerts/active | jq .

# Check SLOs
curl http://localhost:3000/api/slos | jq .summary
```

---

## Project Structure

```
mangamotion/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── server.js          # Express app and routes
│   │   ├── config.js          # Configuration
│   │   ├── queue/
│   │   │   ├── queues.js      # Job queue setup
│   │   │   └── workers/       # Job processors
│   │   ├── metrics.js         # Prometheus metrics
│   │   ├── alert-manager.js   # Alert system
│   │   ├── slo.js             # SLO tracking
│   │   ├── logger.js          # Structured logging
│   │   └── tracing.js         # Distributed tracing
│   ├── package.json
│   └── Dockerfile
│
├── worker/                     # Python job processor
│   ├── thumbnail_worker.py    # Thumbnail generation
│   ├── prometheus_metrics.py  # Metrics collection
│   └── Dockerfile
│
├── docker-compose.yml         # Full stack definition
├── openapi.yaml              # API specification
├── DEVELOPER_ONBOARDING.md   # This file
├── API_RUNBOOK.md            # Common failures
└── README.md                 # Project overview
```

---

## Key Concepts

### Jobs

A **job** represents a unit of work to be processed.

```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  type: "process_manga",
  status: "processing",
  progress: 50,
  files: ["file1.jpg", "file2.jpg"],
  user_id: "user-123",
  created_at: "2024-01-01T12:00:00Z"
}
```

**Job Lifecycle:**
1. **Created** - Job created via upload
2. **Pending** - Waiting in queue
3. **Processing** - Worker is processing
4. **Completed** - Successfully finished
5. **Failed** - Error occurred

### Queues

Jobs are stored in **Redis queues** for processing.

```bash
# View queue depth
redis-cli LLEN ai-job:queue

# View pending jobs
redis-cli LRANGE ai-job:queue 0 -1

# View failed jobs
redis-cli LRANGE failed-jobs 0 -1
```

### Workers

**Workers** are processes that consume jobs from queues and process them.

```bash
# View worker logs
docker logs mangamotion-worker -f

# Check worker status
docker stats mangamotion-worker
```

### Metrics

System metrics are collected and exposed via Prometheus.

```bash
# View metrics
curl http://localhost:3000/metrics

# View metrics summary (JSON)
curl http://localhost:3000/api/metrics | jq .
```

### Alerts

**Alerts** are triggered when metrics exceed thresholds.

```bash
# View active alerts
curl http://localhost:3000/api/alerts/active | jq .

# View alert statistics
curl http://localhost:3000/api/alerts | jq .
```

### SLOs

**Service Level Objectives** define performance targets.

```bash
# View SLO status
curl http://localhost:3000/api/slos | jq .

# View error budget
curl http://localhost:3000/api/slos/error-budget | jq .
```

---

## Common Tasks

### View Logs

```bash
# API server logs
docker logs mangamotion-api -f

# Worker logs
docker logs mangamotion-worker -f

# All logs
docker-compose logs -f

# Specific service with tail
docker logs mangamotion-api --tail 50
```

### Check Database

```bash
# Connect to PostgreSQL
psql -h localhost -U mmuser -d mangamotion

# View jobs table
SELECT id, status, progress, created_at FROM jobs ORDER BY created_at DESC LIMIT 10;

# View failed jobs
SELECT * FROM jobs WHERE status = 'failed' LIMIT 5;

# Exit
\q
```

### Check Redis

```bash
# Connect to Redis
redis-cli

# View queue depth
LLEN ai-job:queue

# View queue contents
LRANGE ai-job:queue 0 -1

# View failed jobs
LRANGE failed-jobs 0 -1

# Monitor in real-time
MONITOR

# Exit
EXIT
```

### Check MinIO Storage

```bash
# Access MinIO console
open http://localhost:9001

# Login with credentials from .env
# Default: minioadmin / minioadmin

# Or use CLI
mc ls minio/mm-bucket
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- alert-manager.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run load-tests/concurrent-uploads.js

# Run all load tests
bash load-tests/run-all-tests.sh
```

---

## Troubleshooting

### Services Won't Start

**Problem:** `docker-compose up` fails

**Solution:**
```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Remove old containers
docker-compose down -v

# Start fresh
docker-compose up -d
```

### API Not Responding

**Problem:** `curl http://localhost:3000/api/health` fails

**Solution:**
```bash
# Check if container is running
docker ps | grep api

# View logs
docker logs mangamotion-api

# Restart API
docker-compose restart api

# Wait for startup
sleep 5
curl http://localhost:3000/api/health
```

### Jobs Not Processing

**Problem:** Jobs stay in "pending" status

**Solution:**
```bash
# Check worker is running
docker ps | grep worker

# View worker logs
docker logs mangamotion-worker -f

# Check queue depth
redis-cli LLEN ai-job:queue

# Check for errors
docker logs mangamotion-worker | grep -i error

# Restart worker
docker-compose restart worker
```

### Database Connection Error

**Problem:** "Cannot connect to database"

**Solution:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database is ready
docker logs mangamotion-postgres | tail -20

# Test connection
psql -h localhost -U mmuser -d mangamotion -c "SELECT 1;"

# Restart database
docker-compose restart postgres
```

### Redis Connection Error

**Problem:** "Cannot connect to Redis"

**Solution:**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping

# Should respond: PONG

# Restart Redis
docker-compose restart redis
```

### Out of Memory

**Problem:** Services crash with OOM errors

**Solution:**
```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Edit docker-compose.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 4G

# Restart services
docker-compose down
docker-compose up -d
```

### High CPU Usage

**Problem:** Services using excessive CPU

**Solution:**
```bash
# Check which service is using CPU
docker stats

# Check logs for errors
docker logs <service-name> | grep -i error

# Restart service
docker-compose restart <service-name>

# Check for stuck jobs
redis-cli LLEN ai-job:queue
```

---

## API Examples

### Upload File

```bash
curl -X POST \
  -H "X-User-ID: dev-user-1" \
  -F "pages=@test-image.jpg" \
  http://localhost:3000/api/upload
```

### Get Presigned URL

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "fileSizeBytes": 1048576
  }' \
  http://localhost:3000/api/presign
```

### Check Job Status

```bash
curl http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000
```

### Get Metrics

```bash
curl http://localhost:3000/api/metrics | jq .
```

### Get Alerts

```bash
curl http://localhost:3000/api/alerts/active | jq .
```

### Get SLO Status

```bash
curl http://localhost:3000/api/slos | jq .
```

### Health Check

```bash
curl http://localhost:3000/api/health | jq .
```

---

## Development Workflow

### 1. Make Code Changes

```bash
# Edit source files
nano mangamotion/backend/src/server.js
```

### 2. Rebuild Container (if needed)

```bash
# Rebuild API container
docker-compose build api

# Restart service
docker-compose restart api
```

### 3. Test Changes

```bash
# Run tests
npm test

# Test API
curl http://localhost:3000/api/health
```

### 4. View Logs

```bash
# Follow logs
docker logs mangamotion-api -f
```

### 5. Commit Changes

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

---

## Next Steps

1. **Read the API Spec** - `openapi.yaml` for detailed endpoint documentation
2. **Review Runbooks** - `API_RUNBOOK.md` for common failure scenarios
3. **Explore Code** - Start with `mangamotion/backend/src/server.js`
4. **Run Tests** - `npm test` to verify everything works
5. **Try Load Testing** - `bash load-tests/run-all-tests.sh`

---

## Getting Help

### Documentation

- **API Specification:** `openapi.yaml`
- **API Runbook:** `API_RUNBOOK.md`
- **Architecture:** `CONTAINERIZATION.md`
- **Monitoring:** `MONITORING_ALERTS_SLOS.md`
- **Load Testing:** `LOAD_TESTING.md`

### Debugging

```bash
# Check all services
docker-compose ps

# View all logs
docker-compose logs

# Check specific service
docker logs <service-name>

# Test connectivity
curl http://localhost:3000/api/health
```

### Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart service
docker-compose restart <service>

# Rebuild container
docker-compose build <service>

# Run tests
npm test

# Load test
k6 run load-tests/concurrent-uploads.js
```

---

## Summary

You now have:
- ✅ All services running locally
- ✅ Understanding of key concepts
- ✅ Ability to process jobs end-to-end
- ✅ Knowledge of common tasks
- ✅ Troubleshooting guide

**Next:** Follow the API Runbook for common failure scenarios and solutions.
