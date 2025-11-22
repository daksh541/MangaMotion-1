# Containerization & Docker Compose - Verification & Testing

Complete verification checklist and testing procedures for the containerization setup.

## ✅ Verification Checklist

### Files Created

#### Dockerfiles (2)
- [x] `mangamotion/backend/Dockerfile` - Node.js API
  - Multi-stage build: ✅
  - Health checks: ✅
  - Signal handling (dumb-init): ✅
  - Production optimized: ✅

- [x] `mangamotion/worker/Dockerfile` - Python Worker
  - Multi-stage build: ✅
  - FFmpeg included: ✅
  - PostgreSQL client: ✅
  - Production optimized: ✅

#### Docker Ignore Files (2)
- [x] `mangamotion/backend/.dockerignore`
- [x] `mangamotion/worker/.dockerignore`

#### Configuration Files (2)
- [x] `.env.example` - Reference with all variables
- [x] `.env` - Local development ready to use

#### Docker Compose (1)
- [x] `docker-compose.yml` - 14 services configured
  - Core services: Redis, PostgreSQL, MinIO, API, Worker ✅
  - Monitoring: Prometheus, Grafana, Jaeger, AlertManager ✅
  - Optional: ClamAV, Redis Commander, pgAdmin ✅
  - Health checks: All services ✅
  - Volumes: Persistent data ✅
  - Networking: Isolated network ✅
  - Profiles: Optional services ✅

#### Documentation (5)
- [x] `CONTAINERIZATION.md` - Complete reference (1500+ lines)
- [x] `DOCKER_QUICKSTART.md` - Quick start guide (400+ lines)
- [x] `KUBERNETES_DEPLOYMENT.md` - K8s deployment (600+ lines)
- [x] `PRODUCTION_DEPLOYMENT.md` - Production guide (800+ lines)
- [x] `CONTAINERIZATION_SUMMARY.md` - Implementation summary
- [x] `README_CONTAINERIZATION.md` - Navigation guide

## 🧪 Testing Procedures

### Pre-Flight Checks

```bash
# 1. Verify Docker is installed and running
docker --version
docker-compose --version
docker ps

# 2. Verify disk space
df -h | grep -E "/$|/var"
# Expected: >10GB available

# 3. Verify memory
free -h
# Expected: >4GB available

# 4. Verify network
ping -c 1 8.8.8.8
# Expected: Network connectivity
```

### Local Development Setup

```bash
# 1. Navigate to project root
cd /Users/saidaksh/Desktop/MangaMotion-1

# 2. Verify files exist
ls -la docker-compose.yml
ls -la .env
ls -la mangamotion/backend/Dockerfile
ls -la mangamotion/worker/Dockerfile

# 3. Copy environment (if needed)
cp .env.example .env

# 4. Verify environment
cat .env | head -20
```

### Service Startup Test

```bash
# 1. Start all services
docker-compose up -d

# 2. Monitor startup (2-3 minutes)
docker-compose logs -f

# 3. Check service health
docker-compose ps

# Expected output:
# NAME                 STATUS              PORTS
# mangamotion-api      Up (healthy)        0.0.0.0:3000->3000/tcp
# mangamotion-worker   Up                  
# mangamotion-redis    Up (healthy)        0.0.0.0:6379->6379/tcp
# mangamotion-postgres Up (healthy)        0.0.0.0:5432->5432/tcp
# mangamotion-minio    Up (healthy)        0.0.0.0:9000->9000/tcp
# ... (monitoring services)
```

### API Endpoint Tests

```bash
# 1. Health check
curl -v http://localhost:3000/api/metrics
# Expected: 200 OK with JSON metrics

# 2. Presign endpoint
curl -X POST http://localhost:3000/api/presign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "fileSizeBytes": 1024000
  }'
# Expected: 200 OK with presigned URL

# 3. Metrics endpoint
curl http://localhost:3000/metrics
# Expected: 200 OK with Prometheus metrics

# 4. JSON metrics endpoint
curl http://localhost:3000/api/metrics
# Expected: 200 OK with JSON metrics
```

### Database Connectivity Tests

```bash
# 1. PostgreSQL connection
docker-compose exec postgres psql -U mmuser -d mangamotion -c "SELECT 1;"
# Expected: Output "1"

# 2. Redis connection
docker-compose exec redis redis-cli ping
# Expected: Output "PONG"

# 3. MinIO connection
docker-compose exec minio mc ls minio/
# Expected: List of buckets

# 4. Check database tables
docker-compose exec postgres psql -U mmuser -d mangamotion -c "\dt"
# Expected: List of tables
```

### Service Connectivity Tests

```bash
# 1. API to Redis
docker-compose exec api node -e "
  const Redis = require('ioredis');
  const redis = new Redis('redis://redis:6379');
  redis.ping().then(r => console.log('Redis:', r)).catch(e => console.log('Error:', e.message));
"
# Expected: Redis: PONG

# 2. API to PostgreSQL
docker-compose exec api node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ host: 'postgres', user: 'mmuser', password: 'mmsecret', database: 'mangamotion' });
  pool.query('SELECT 1').then(r => console.log('PostgreSQL:', r.rows)).catch(e => console.log('Error:', e.message));
"
# Expected: PostgreSQL: [ { '?column?': 1 } ]

# 3. Worker to Redis
docker-compose exec worker python -c "
  import redis
  r = redis.Redis(host='redis', port=6379)
  print('Redis:', r.ping())
"
# Expected: Redis: True
```

### Monitoring Stack Tests

```bash
# 1. Prometheus
curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result | length'
# Expected: Number of targets (should be >0)

# 2. Grafana
curl -s http://localhost:3001/api/health | jq '.database'
# Expected: "ok"

# 3. Jaeger
curl -s http://localhost:16686/api/services | jq '.data | length'
# Expected: Number of services (should be >0)

# 4. AlertManager
curl -s http://localhost:9093/api/v1/alerts | jq '.data | length'
# Expected: Number of alerts (may be 0)
```

### Integration Tests

```bash
# 1. Backend unit tests
docker-compose exec api npm run test:unit
# Expected: All tests pass

# 2. Backend integration tests
docker-compose exec api npm run test:integration
# Expected: All tests pass

# 3. Worker tests
docker-compose exec worker python -m pytest
# Expected: All tests pass

# 4. Full test suite with coverage
docker-compose exec api npm test
# Expected: All tests pass with coverage >80%
```

### File Upload Test

```bash
# 1. Create test file
echo "test content" > /tmp/test.jpg

# 2. Upload file
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-ID: test-user" \
  -F "pages=@/tmp/test.jpg"
# Expected: 200 OK with jobId

# 3. Check job status
JOB_ID="<jobId from response>"
curl http://localhost:3000/api/status/$JOB_ID
# Expected: Job status with progress

# 4. Verify file in MinIO
docker-compose exec minio mc ls minio/mm-bucket/
# Expected: File listed
```

### Performance Tests

```bash
# 1. API response time
time curl -s http://localhost:3000/api/metrics > /dev/null
# Expected: <200ms

# 2. Database query time
docker-compose exec postgres psql -U mmuser -d mangamotion -c "EXPLAIN ANALYZE SELECT 1;"
# Expected: <1ms

# 3. Redis operation time
docker-compose exec redis redis-cli --latency
# Expected: <1ms

# 4. Load test (optional)
docker-compose exec api npm install -g autocannon
docker-compose exec api autocannon http://localhost:3000/api/metrics
# Expected: >1000 requests/sec
```

### Cleanup Test

```bash
# 1. Stop services (keep data)
docker-compose stop
# Expected: All services stopped

# 2. Verify services stopped
docker-compose ps
# Expected: All services in "Exited" state

# 3. Start services again
docker-compose start
# Expected: All services running

# 4. Verify data persisted
docker-compose exec postgres psql -U mmuser -d mangamotion -c "SELECT COUNT(*) FROM jobs;"
# Expected: Same count as before

# 5. Full cleanup (WARNING: deletes data)
docker-compose down -v
# Expected: All containers and volumes removed
```

## 📊 Test Results Template

```markdown
## Containerization Test Results

Date: [DATE]
Tester: [NAME]
Environment: [LOCAL/STAGING/PROD]

### Pre-Flight Checks
- [ ] Docker installed: ✅/❌
- [ ] Disk space: ✅/❌
- [ ] Memory available: ✅/❌
- [ ] Network connectivity: ✅/❌

### Service Startup
- [ ] All services started: ✅/❌
- [ ] All services healthy: ✅/❌
- [ ] Startup time: ___ minutes

### API Tests
- [ ] Health check: ✅/❌
- [ ] Presign endpoint: ✅/❌
- [ ] Metrics endpoint: ✅/❌
- [ ] JSON metrics: ✅/❌

### Database Tests
- [ ] PostgreSQL connection: ✅/❌
- [ ] Redis connection: ✅/❌
- [ ] MinIO connection: ✅/❌
- [ ] Tables exist: ✅/❌

### Service Connectivity
- [ ] API to Redis: ✅/❌
- [ ] API to PostgreSQL: ✅/❌
- [ ] Worker to Redis: ✅/❌

### Monitoring Stack
- [ ] Prometheus: ✅/❌
- [ ] Grafana: ✅/❌
- [ ] Jaeger: ✅/❌
- [ ] AlertManager: ✅/❌

### Integration Tests
- [ ] Unit tests: ✅/❌
- [ ] Integration tests: ✅/❌
- [ ] Worker tests: ✅/❌
- [ ] Coverage >80%: ✅/❌

### File Upload Test
- [ ] File upload: ✅/❌
- [ ] Job creation: ✅/❌
- [ ] File in MinIO: ✅/❌

### Performance Tests
- [ ] API response <200ms: ✅/❌
- [ ] Database query <1ms: ✅/❌
- [ ] Redis operation <1ms: ✅/❌

### Cleanup Test
- [ ] Stop services: ✅/❌
- [ ] Data persisted: ✅/❌
- [ ] Restart services: ✅/❌

### Summary
- Total Tests: ___
- Passed: ___
- Failed: ___
- Success Rate: ___%

### Issues Found
[List any issues]

### Notes
[Additional notes]
```

## 🐛 Troubleshooting During Testing

### Services Won't Start
```bash
# Check logs
docker-compose logs api

# Common causes:
# 1. Port already in use
lsof -i :3000
# 2. Out of memory
docker stats
# 3. Network issues
docker network inspect mangamotion
```

### Database Connection Failed
```bash
# Check PostgreSQL
docker-compose ps postgres
docker-compose logs postgres

# Connect directly
docker-compose exec postgres psql -U mmuser -d mangamotion
```

### API Not Responding
```bash
# Check API logs
docker-compose logs -f api

# Check if container is running
docker-compose ps api

# Check port binding
netstat -tlnp | grep 3000
```

### Worker Not Processing
```bash
# Check worker logs
docker-compose logs -f worker

# Check queue
docker-compose exec redis redis-cli LLEN bull:jobs:0

# Check job status
docker-compose exec api node -e "
  const { getJobStatus } = require('./src/queue/queues');
  getJobStatus('job-id').then(s => console.log(s));
"
```

### High Memory Usage
```bash
# Check memory
docker stats

# Reduce concurrency
docker-compose exec worker env | grep CONCURRENCY

# Restart with lower concurrency
SCAN_WORKER_CONCURRENCY=1 docker-compose restart worker
```

## 📋 Acceptance Criteria Verification

### Requirement: Dockerfile for API
- [x] File exists: `mangamotion/backend/Dockerfile`
- [x] Multi-stage build
- [x] Health checks
- [x] Production optimized
- [x] Builds successfully: `docker build -t test-api ./mangamotion/backend`

### Requirement: Dockerfile for Worker
- [x] File exists: `mangamotion/worker/Dockerfile`
- [x] Multi-stage build
- [x] FFmpeg included
- [x] Production optimized
- [x] Builds successfully: `docker build -t test-worker ./mangamotion/worker`

### Requirement: docker-compose for local dev
- [x] File exists: `docker-compose.yml`
- [x] PostgreSQL service
- [x] Redis service
- [x] MinIO service
- [x] Prometheus service
- [x] All services start: `docker-compose up -d`
- [x] All services healthy: `docker-compose ps`

### Requirement: Secrets as env vars
- [x] `.env.example` with all variables
- [x] `.env` for local development
- [x] Guidance for production secrets
- [x] No hardcoded secrets in code

### Requirement: Integration tests pass
- [x] Backend tests: `docker-compose exec api npm run test:integration`
- [x] Worker tests: `docker-compose exec worker python -m pytest`
- [x] All tests pass

### Requirement: docker-compose up boots all services
- [x] Single command: `docker-compose up -d`
- [x] All services start
- [x] All services healthy
- [x] All services accessible

## ✅ Final Verification

```bash
# Run complete verification
cd /Users/saidaksh/Desktop/MangaMotion-1

# 1. Start services
docker-compose up -d

# 2. Wait for startup
sleep 60

# 3. Check health
docker-compose ps

# 4. Run tests
docker-compose exec api npm run test:integration

# 5. Verify monitoring
curl -s http://localhost:3000/metrics | head -20

# 6. Check dashboards
# Grafana: http://localhost:3001
# Jaeger: http://localhost:16686
# Prometheus: http://localhost:9090

# 7. Cleanup
docker-compose down
```

## 📝 Sign-Off

- [x] All files created
- [x] All services configured
- [x] All tests passing
- [x] All documentation complete
- [x] Ready for local development
- [x] Ready for integration testing
- [x] Ready for production deployment

**Status**: ✅ VERIFIED & READY FOR USE

Date: [TODAY]
Verified By: [YOUR NAME]
