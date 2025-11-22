# Load Testing Guide - MangaMotion

## Overview

This guide provides comprehensive load testing procedures to identify infrastructure bottlenecks in MangaMotion. The tests simulate concurrent uploads, S3 operations, and worker processing to measure system performance under realistic load.

**Acceptance Criteria:** System handles expected concurrency without >5% job failure due to infrastructure.

## Quick Start

### Prerequisites

1. **k6 installed** (load testing tool)
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo apt-get install k6
   
   # Or download from https://k6.io/docs/getting-started/installation/
   ```

2. **System running** (Docker Compose)
   ```bash
   docker-compose up -d
   # Verify all services are healthy
   docker-compose ps
   ```

3. **Backend API accessible** at `http://localhost:3000`

### Run Your First Load Test

```bash
# Test concurrent uploads (50 users, 5 minute test)
k6 run load-tests/concurrent-uploads.js

# Test presign + S3 uploads (30 users)
k6 run load-tests/presign-uploads.js

# Test worker processing (20 users)
k6 run load-tests/worker-processing.js

# Comprehensive bottleneck detection
k6 run load-tests/bottleneck-detection.js
```

## Test Scenarios

### 1. Concurrent Uploads Test (`concurrent-uploads.js`)

**Purpose:** Identify API and database bottlenecks during concurrent file uploads.

**What it tests:**
- API upload endpoint performance
- Database job creation under load
- Rate limiting behavior
- Job failure rates

**Configuration:**
```bash
k6 run load-tests/concurrent-uploads.js \
  --vus 50 \
  --duration 5m \
  -e BASE_URL=http://localhost:3000 \
  -e FILE_SIZE_KB=100 \
  -e CONCURRENT_USERS=50
```

**Expected Results:**
- ✅ Success rate: >95%
- ✅ P95 response time: <5s
- ✅ Job failure rate: <5%

**Bottlenecks to Watch:**
- 429 errors → Rate limiting too strict
- 500 errors → Database or API issues
- Slow response times → Database locks or API bottleneck

---

### 2. Presign + S3 Upload Test (`presign-uploads.js`)

**Purpose:** Identify MinIO IOPS bottlenecks and presign URL generation performance.

**What it tests:**
- Presigned URL generation performance
- S3 PUT operation throughput
- MinIO concurrent upload limits
- File upload success rates

**Configuration:**
```bash
k6 run load-tests/presign-uploads.js \
  --vus 30 \
  --duration 5m \
  -e BASE_URL=http://localhost:3000 \
  -e S3_ENDPOINT=http://localhost:9000 \
  -e FILE_SIZE_KB=500
```

**Expected Results:**
- ✅ Presign success rate: >95%
- ✅ S3 upload success rate: >95%
- ✅ Presign P95 latency: <1s
- ✅ S3 upload P95 latency: <10s

**Bottlenecks to Watch:**
- High presign latency → Database query issue
- S3 upload failures → MinIO IOPS limit reached
- Timeouts → Network or MinIO resource exhaustion

---

### 3. Worker Processing Test (`worker-processing.js`)

**Purpose:** Identify worker CPU bottlenecks and database lock contention.

**What it tests:**
- Job creation performance
- Job status polling
- Worker processing throughput
- Job completion time

**Configuration:**
```bash
k6 run load-tests/worker-processing.js \
  --vus 20 \
  --duration 5m \
  -e BASE_URL=http://localhost:3000 \
  -e FILE_SIZE_KB=100 \
  -e MAX_POLL_ATTEMPTS=60 \
  -e POLL_INTERVAL_MS=1000
```

**Expected Results:**
- ✅ Job success rate: >95%
- ✅ P95 completion time: <2 minutes
- ✅ Job failure rate: <5%

**Bottlenecks to Watch:**
- High failure rate → Worker crashes or queue issues
- Slow completion → Worker CPU bottleneck
- Status check failures → Database connection pool exhaustion

---

### 4. Bottleneck Detection Test (`bottleneck-detection.js`)

**Purpose:** Comprehensive test that gradually ramps up load to identify breaking points.

**What it tests:**
- API response time degradation
- Error rate increase under load
- Queue saturation
- Resource usage (CPU, memory)

**Configuration:**
```bash
k6 run load-tests/bottleneck-detection.js \
  --vus 10 \
  --duration 30m \
  -e INITIAL_USERS=10 \
  -e MAX_USERS=200 \
  -e RAMP_UP_STEP=10 \
  -e STEP_DURATION=2m
```

**Expected Results:**
- ✅ Success rate remains >95% up to 100 concurrent users
- ✅ API response time increases <50% from baseline
- ✅ No queue saturation (depth <1000)
- ✅ CPU usage <80%, Memory usage <85%

**Bottlenecks to Watch:**
- Success rate drops below 95% → Infrastructure limit reached
- API response time increases >50% → Contention detected
- Queue depth >1000 → Worker bottleneck
- CPU/Memory >80% → Resource exhaustion

---

## Detailed Test Execution

### Pre-Test Checklist

```bash
#!/bin/bash

echo "=== Pre-Test Infrastructure Check ==="

# 1. Check Docker services
echo "✓ Checking Docker services..."
docker-compose ps

# 2. Check API health
echo "✓ Checking API health..."
curl -s http://localhost:3000/api/metrics | jq .

# 3. Check Redis
echo "✓ Checking Redis..."
redis-cli ping

# 4. Check MinIO
echo "✓ Checking MinIO..."
curl -s http://localhost:9000/minio/health/live

# 5. Check PostgreSQL
echo "✓ Checking PostgreSQL..."
psql -h localhost -U mmuser -d mangamotion -c "SELECT 1"

# 6. Clear any previous test data
echo "✓ Clearing test data..."
redis-cli FLUSHDB

echo "✅ All systems ready for load testing!"
```

### Running a Complete Test Suite

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="load-test-results/$TIMESTAMP"

mkdir -p "$RESULTS_DIR"

echo "=== MangaMotion Load Test Suite ==="
echo "Results directory: $RESULTS_DIR"
echo ""

# Test 1: Concurrent Uploads
echo "📝 Test 1: Concurrent Uploads (50 users, 5 min)"
k6 run load-tests/concurrent-uploads.js \
  -e BASE_URL=$BASE_URL \
  --vus 50 \
  --duration 5m \
  -o json="$RESULTS_DIR/concurrent-uploads.json" \
  2>&1 | tee "$RESULTS_DIR/concurrent-uploads.log"

sleep 30

# Test 2: Presign + S3 Uploads
echo ""
echo "📝 Test 2: Presign + S3 Uploads (30 users, 5 min)"
k6 run load-tests/presign-uploads.js \
  -e BASE_URL=$BASE_URL \
  --vus 30 \
  --duration 5m \
  -o json="$RESULTS_DIR/presign-uploads.json" \
  2>&1 | tee "$RESULTS_DIR/presign-uploads.log"

sleep 30

# Test 3: Worker Processing
echo ""
echo "📝 Test 3: Worker Processing (20 users, 5 min)"
k6 run load-tests/worker-processing.js \
  -e BASE_URL=$BASE_URL \
  --vus 20 \
  --duration 5m \
  -o json="$RESULTS_DIR/worker-processing.json" \
  2>&1 | tee "$RESULTS_DIR/worker-processing.log"

sleep 30

# Test 4: Bottleneck Detection
echo ""
echo "📝 Test 4: Bottleneck Detection (gradual ramp-up)"
k6 run load-tests/bottleneck-detection.js \
  -e BASE_URL=$BASE_URL \
  --vus 10 \
  --duration 30m \
  -o json="$RESULTS_DIR/bottleneck-detection.json" \
  2>&1 | tee "$RESULTS_DIR/bottleneck-detection.log"

echo ""
echo "✅ All tests completed!"
echo "📊 Results saved to: $RESULTS_DIR"
```

### Monitoring During Tests

In a separate terminal, monitor system metrics:

```bash
# Watch Docker resource usage
watch -n 1 'docker stats --no-stream'

# Watch Redis metrics
watch -n 1 'redis-cli INFO stats'

# Watch PostgreSQL connections
watch -n 1 'psql -h localhost -U mmuser -d mangamotion -c "SELECT count(*) FROM pg_stat_activity;"'

# Watch MinIO metrics
curl -s http://localhost:9000/minio/health/live | jq .

# Watch API metrics
watch -n 5 'curl -s http://localhost:3000/api/metrics | jq .'
```

---

## Interpreting Results

### Success Rate Analysis

```
Success Rate | Status | Action
-------------|--------|--------
>95%         | ✅ OK  | System handles load well
90-95%       | ⚠️  WARN | Investigate errors, may need optimization
<90%         | 🔴 FAIL | Critical issues, infrastructure needs scaling
```

### Response Time Analysis

```
P95 Latency | Status | Bottleneck Likely
------------|--------|------------------
<1s         | ✅ OK  | None
1-5s        | ⚠️  WARN | Database or API contention
>5s         | 🔴 FAIL | Severe bottleneck, investigate immediately
```

### Error Classification

**429 Too Many Requests**
- Indicates rate limiting triggered
- Solution: Increase `RATE_LIMIT_JOBS_PER_MINUTE` or reduce concurrent users

**500 Internal Server Error**
- Indicates API crash or database issue
- Check logs: `docker logs mangamotion-api`

**Connection Timeout**
- Indicates resource exhaustion
- Check: Redis, PostgreSQL, or MinIO capacity

**Slow Response Times**
- Indicates contention or bottleneck
- Check: CPU, memory, disk I/O

---

## Bottleneck Diagnosis

### MinIO IOPS Bottleneck

**Symptoms:**
- S3 upload failures or timeouts
- High latency on PUT operations
- Errors in MinIO logs

**Diagnosis:**
```bash
# Check MinIO logs
docker logs mangamotion-minio | tail -50

# Check MinIO metrics
curl -s http://localhost:9000/minio/health/live | jq .
```

**Solutions:**
1. Increase MinIO concurrency limits
2. Upgrade storage backend (faster disks)
3. Distribute across multiple MinIO instances
4. Implement request batching

### Database Lock Contention

**Symptoms:**
- Slow job status queries
- High database connection count
- Deadlock errors in logs

**Diagnosis:**
```bash
# Check active connections
psql -h localhost -U mmuser -d mangamotion -c "SELECT count(*) FROM pg_stat_activity;"

# Check long-running queries
psql -h localhost -U mmuser -d mangamotion -c "SELECT pid, usename, query, query_start FROM pg_stat_activity WHERE state != 'idle';"

# Check locks
psql -h localhost -U mmuser -d mangamotion -c "SELECT * FROM pg_locks;"
```

**Solutions:**
1. Add database indexes on frequently queried columns
2. Increase connection pool size
3. Optimize slow queries
4. Use read replicas for status checks

### Worker CPU Bottleneck

**Symptoms:**
- High CPU usage (>80%)
- Slow job processing
- Queue depth increasing

**Diagnosis:**
```bash
# Check worker CPU usage
docker stats mangamotion-worker

# Check worker logs
docker logs mangamotion-worker | tail -50

# Check queue depth
redis-cli LLEN ai-job:queue
```

**Solutions:**
1. Scale workers horizontally (add more worker instances)
2. Optimize processing algorithm
3. Reduce file size limits
4. Implement job prioritization

### API Response Time Degradation

**Symptoms:**
- P95 latency increasing over time
- Response times vary widely
- Occasional timeouts

**Diagnosis:**
```bash
# Check API logs
docker logs mangamotion-api | tail -50

# Check API metrics
curl -s http://localhost:3000/api/metrics | jq .

# Check system resources
docker stats mangamotion-api
```

**Solutions:**
1. Add caching layer (Redis)
2. Optimize database queries
3. Implement request batching
4. Scale API horizontally

---

## Performance Tuning

### Redis Optimization

```bash
# Increase max memory
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Monitor memory usage
redis-cli INFO memory
```

### PostgreSQL Optimization

```bash
# Increase connection pool
# In docker-compose.yml:
# environment:
#   POSTGRES_INIT_ARGS: "-c max_connections=200"

# Check current setting
psql -h localhost -U mmuser -d mangamotion -c "SHOW max_connections;"

# Add indexes for common queries
psql -h localhost -U mmuser -d mangamotion -c "CREATE INDEX idx_jobs_status ON jobs(status);"
psql -h localhost -U mmuser -d mangamotion -c "CREATE INDEX idx_jobs_user_id ON jobs(user_id);"
```

### MinIO Optimization

```bash
# Increase concurrent requests
# In docker-compose.yml, add environment:
# MINIO_API_REQUESTS_MAX: 1000

# Monitor MinIO metrics
curl -s http://localhost:9000/minio/health/live | jq .
```

### API Optimization

```bash
# Increase worker threads
# In docker-compose.yml, add environment:
# NODE_WORKER_THREADS_POOL_SIZE: 8

# Enable compression
# Already enabled in server.js with express.json()

# Implement caching
# See src/cache.js for caching utilities
```

---

## Acceptance Criteria Verification

### Criterion 1: System handles expected concurrency

**Test:** Run concurrent-uploads.js with 50 concurrent users

```bash
k6 run load-tests/concurrent-uploads.js --vus 50 --duration 5m
```

**Acceptance:** Success rate >95%

### Criterion 2: No >5% job failure due to infrastructure

**Test:** Run worker-processing.js and monitor failure rates

```bash
k6 run load-tests/worker-processing.js --vus 20 --duration 5m
```

**Acceptance:** Job failure rate <5%

### Criterion 3: MinIO IOPS handling

**Test:** Run presign-uploads.js with 30 concurrent users

```bash
k6 run load-tests/presign-uploads.js --vus 30 --duration 5m
```

**Acceptance:** S3 upload success rate >95%, P95 latency <10s

### Criterion 4: Database lock handling

**Test:** Run bottleneck-detection.js and monitor database metrics

```bash
k6 run load-tests/bottleneck-detection.js --vus 10 --duration 30m
```

**Acceptance:** No deadlock errors, connection pool not exhausted

---

## Continuous Load Testing

### Automated Daily Tests

```bash
#!/bin/bash
# save as: scripts/daily-load-test.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="load-test-results/$TIMESTAMP"

mkdir -p "$RESULTS_DIR"

# Run all tests
k6 run load-tests/concurrent-uploads.js -o json="$RESULTS_DIR/concurrent-uploads.json"
k6 run load-tests/presign-uploads.js -o json="$RESULTS_DIR/presign-uploads.json"
k6 run load-tests/worker-processing.js -o json="$RESULTS_DIR/worker-processing.json"

# Generate report
node scripts/analyze-load-test.js "$RESULTS_DIR"
```

Schedule with cron:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/scripts/daily-load-test.sh
```

---

## Troubleshooting

### k6 Installation Issues

```bash
# Verify k6 is installed
k6 version

# If not found, install:
brew install k6  # macOS
# or download from https://k6.io/docs/getting-started/installation/
```

### Connection Refused Errors

```bash
# Check if services are running
docker-compose ps

# If not, start them
docker-compose up -d

# Wait for services to be healthy
docker-compose ps | grep healthy
```

### High Failure Rates

```bash
# Check API logs
docker logs mangamotion-api

# Check worker logs
docker logs mangamotion-worker

# Check Redis
redis-cli PING

# Check MinIO
curl -s http://localhost:9000/minio/health/live
```

### Out of Memory Errors

```bash
# Increase Docker memory limit
# Edit docker-compose.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 4G

docker-compose down
docker-compose up -d
```

---

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 HTTP Module](https://k6.io/docs/javascript-api/k6-http/)
- [k6 Metrics](https://k6.io/docs/javascript-api/k6-metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [MangaMotion Architecture](./CONTAINERIZATION.md)
- [API Documentation](./mangamotion/backend/README.md)

---

## Support

For issues or questions:
1. Check logs: `docker logs <service-name>`
2. Review this guide's troubleshooting section
3. Check k6 documentation
4. Open an issue in the repository
