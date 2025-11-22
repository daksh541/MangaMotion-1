# Docker Quick Start Guide

Get MangaMotion running locally in 5 minutes.

## Prerequisites

- Docker Desktop (Mac/Windows) or Docker Engine (Linux)
- Docker Compose 2.0+
- 4GB RAM available
- 10GB disk space

## Quick Start (5 minutes)

### 1. Clone and Setup

```bash
cd /path/to/MangaMotion-1

# Copy environment file
cp .env.example .env

# Verify Docker is running
docker --version
docker-compose --version
```

### 2. Start All Services

```bash
# Start all services in background
docker-compose up -d

# Watch startup progress
docker-compose logs -f

# Wait for all services to be healthy (2-3 minutes)
# Press Ctrl+C to stop watching logs
```

### 3. Verify Services

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                 STATUS              PORTS
# mangamotion-api      Up (healthy)        0.0.0.0:3000->3000/tcp
# mangamotion-worker   Up                  
# mangamotion-redis    Up (healthy)        0.0.0.0:6379->6379/tcp
# mangamotion-postgres Up (healthy)        0.0.0.0:5432->5432/tcp
# mangamotion-minio    Up (healthy)        0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp
# ... (monitoring services)
```

### 4. Access Services

Open in browser:

| Service | URL | Notes |
|---------|-----|-------|
| **API** | http://localhost:3000 | REST API |
| **Metrics** | http://localhost:3000/metrics | Prometheus format |
| **Grafana** | http://localhost:3001 | Dashboards (admin/admin) |
| **Jaeger** | http://localhost:16686 | Distributed tracing |
| **MinIO** | http://localhost:9001 | S3 console (minioadmin/minioadmin) |
| **Prometheus** | http://localhost:9090 | Metrics database |
| **AlertManager** | http://localhost:9093 | Alert management |

### 5. Test the API

```bash
# Health check
curl http://localhost:3000/api/metrics

# Presign a file
curl -X POST http://localhost:3000/api/presign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "fileSizeBytes": 1024000
  }'

# Upload a file
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-ID: test-user" \
  -F "pages=@test.jpg"

# Get job status
curl http://localhost:3000/api/status/{jobId}
```

## Common Tasks

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker

# Last 50 lines
docker-compose logs --tail=50 api
```

### Run Tests

```bash
# Backend unit tests
docker-compose exec api npm run test:unit

# Backend integration tests
docker-compose exec api npm run test:integration

# All tests with coverage
docker-compose exec api npm test

# Worker tests
docker-compose exec worker python -m pytest
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U mmuser -d mangamotion

# Useful commands:
# \dt - list tables
# \d jobs - describe jobs table
# SELECT * FROM jobs LIMIT 10; - view jobs
# \q - quit
```

### Redis Access

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Useful commands:
# KEYS * - list all keys
# LLEN bull:jobs:0 - queue length
# LRANGE bull:jobs:0 0 -1 - view queue
# MONITOR - watch commands in real-time
# QUIT - exit
```

### MinIO Access

```bash
# Open MinIO console
# http://localhost:9001
# Username: minioadmin
# Password: minioadmin

# Or use MinIO CLI
mc alias set minio http://localhost:9000 minioadmin minioadmin
mc ls minio/mm-bucket
mc cat minio/mm-bucket/file.jpg
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart worker

# Restart and rebuild
docker-compose up -d --build api
```

### Stop Services

```bash
# Stop all services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove everything including data (WARNING!)
docker-compose down -v
```

## Development Workflow

### Hot Reload (API)

The API service mounts source code as a volume, enabling hot reload:

```bash
# Edit a file
vim mangamotion/backend/src/server.js

# Changes are reflected immediately
# If not, restart the service
docker-compose restart api
```

### Add Dependencies

```bash
# Add npm package
docker-compose exec api npm install express-cors

# Add Python package
docker-compose exec worker pip install pillow

# Rebuild image to persist changes
docker-compose up -d --build api
docker-compose up -d --build worker
```

### Debug

```bash
# Interactive shell in API
docker-compose exec api sh

# Interactive shell in Worker
docker-compose exec worker bash

# Run specific command
docker-compose exec api node -e "console.log(process.env.REDIS_URL)"
```

## Monitoring

### Grafana Dashboard

1. Open http://localhost:3001
2. Login: admin/admin
3. Go to Dashboards
4. View pre-configured panels:
   - Job throughput (jobs/min)
   - Error rate (%)
   - Processing time (p50, p95, p99)
   - Queue depth
   - Active jobs
   - DLQ count

### Prometheus Queries

```bash
# Open http://localhost:9090

# Example queries:
# job_processed_total - total jobs processed
# rate(job_processed_total[5m]) - jobs per second
# job_processing_seconds_bucket - processing time buckets
# up{job="api"} - API availability
```

### Jaeger Traces

1. Open http://localhost:16686
2. Select service: "mangamotion-backend"
3. View traces for:
   - POST /api/presign
   - POST /api/upload
   - Worker processing

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs api

# Common issues:
# - Port already in use: Change port in docker-compose.yml
# - Out of memory: Increase Docker memory (Docker Desktop → Preferences)
# - Network issues: docker network inspect mangamotion
```

### Database connection failed

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# Connect directly
docker-compose exec postgres psql -U mmuser -d mangamotion

# Check connection string
echo $PGHOST $PGPORT $PGUSER
```

### Redis connection failed

```bash
# Check Redis is healthy
docker-compose ps redis

# Connect directly
docker-compose exec redis redis-cli ping

# Check connection string
echo $REDIS_URL
```

### Worker not processing jobs

```bash
# Check worker logs
docker-compose logs -f worker

# Check queue depth
docker-compose exec redis redis-cli LLEN bull:jobs:0

# Restart worker
docker-compose restart worker
```

### High memory usage

```bash
# Check memory usage
docker stats

# Reduce worker concurrency
# Edit .env: SCAN_WORKER_CONCURRENCY=1

# Restart
docker-compose restart worker
```

## Optional: Enable ClamAV

ClamAV (malware scanner) is optional and disabled by default.

```bash
# Start with ClamAV
docker-compose --profile with-clamav up -d

# Verify ClamAV is running
docker-compose ps clamav

# Test scan
docker-compose exec api curl -X POST http://localhost:3000/api/upload \
  -H "X-User-ID: test" \
  -F "pages=@test.jpg"
```

## Optional: Enable Dev Tools

Redis Commander and pgAdmin are optional dev tools.

```bash
# Start with dev tools
docker-compose --profile dev-tools up -d

# Access tools:
# Redis Commander: http://localhost:8081
# pgAdmin: http://localhost:5050 (admin@example.com/admin)
```

## Performance Tips

### Increase Resources

```bash
# Docker Desktop → Preferences → Resources
# Increase CPUs: 4 → 8
# Increase Memory: 4GB → 8GB
```

### Reduce Services

```bash
# Start only core services (no monitoring)
docker-compose up -d redis postgres minio api worker

# Or specific services
docker-compose up -d api worker
```

### Scale Workers

```bash
# Run multiple workers
docker-compose up -d --scale worker=3

# Monitor queue
docker-compose exec redis redis-cli LLEN bull:jobs:0
```

## Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Full cleanup (WARNING: deletes data)
docker-compose down -v
docker system prune -a
```

## Next Steps

1. ✅ Services running locally
2. 📝 Run integration tests: `docker-compose exec api npm run test:integration`
3. 📊 View dashboards: http://localhost:3001
4. 🔍 Explore traces: http://localhost:16686
5. 🚀 Deploy to production (see CONTAINERIZATION.md)

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Check service health: `docker-compose ps`
3. See CONTAINERIZATION.md for detailed troubleshooting
4. See KUBERNETES_DEPLOYMENT.md for production deployment

## Summary

You now have:
- ✅ Full MangaMotion stack running locally
- ✅ All services healthy and connected
- ✅ Monitoring and tracing enabled
- ✅ Ready for development and testing
- ✅ Ready for production deployment
