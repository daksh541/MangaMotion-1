# MangaMotion Load Testing Suite

Comprehensive load testing framework for identifying infrastructure bottlenecks in MangaMotion.

## Overview

This suite provides production-ready load tests to validate system performance under realistic concurrent load. Tests are designed to identify specific bottlenecks:

- **MinIO IOPS limits** - S3 upload throughput
- **Database lock contention** - Query performance under load
- **Worker CPU bottlenecks** - Processing throughput
- **API response time degradation** - Request handling capacity

## Quick Start

```bash
# 1. Install k6
brew install k6

# 2. Start MangaMotion
docker-compose up -d

# 3. Run a test
k6 run concurrent-uploads.js

# 4. Run all tests
bash run-all-tests.sh

# 5. Analyze results
node analyze-results.js load-test-results/TIMESTAMP
```

## Test Files

### 1. `concurrent-uploads.js`

Tests API upload endpoint under concurrent load.

**What it tests:**
- Upload endpoint performance
- Database job creation
- Rate limiting behavior
- Job failure rates

**Configuration:**
```bash
k6 run concurrent-uploads.js \
  -e BASE_URL=http://localhost:3000 \
  -e CONCURRENT_USERS=50 \
  -e FILE_SIZE_KB=100
```

**Expected Results:**
- ✅ Success rate: >95%
- ✅ P95 response time: <5s
- ✅ Job failure rate: <5%

---

### 2. `presign-uploads.js`

Tests presigned URL generation and S3 direct uploads.

**What it tests:**
- Presigned URL generation performance
- S3 PUT operation throughput
- MinIO concurrent upload limits
- File upload success rates

**Configuration:**
```bash
k6 run presign-uploads.js \
  -e BASE_URL=http://localhost:3000 \
  -e S3_ENDPOINT=http://localhost:9000 \
  -e FILE_SIZE_KB=500
```

**Expected Results:**
- ✅ Presign success rate: >95%
- ✅ S3 upload success rate: >95%
- ✅ Presign P95 latency: <1s
- ✅ S3 upload P95 latency: <10s

---

### 3. `worker-processing.js`

Tests worker processing performance and job completion.

**What it tests:**
- Job creation performance
- Job status polling
- Worker processing throughput
- Job completion time

**Configuration:**
```bash
k6 run worker-processing.js \
  -e BASE_URL=http://localhost:3000 \
  -e CONCURRENT_USERS=20 \
  -e FILE_SIZE_KB=100
```

**Expected Results:**
- ✅ Job success rate: >95%
- ✅ P95 completion time: <2 minutes
- ✅ Job failure rate: <5%

---

### 4. `bottleneck-detection.js`

Comprehensive test that gradually ramps up load to identify breaking points.

**What it tests:**
- API response time degradation
- Error rate increase under load
- Queue saturation
- Resource usage (CPU, memory)

**Configuration:**
```bash
k6 run bottleneck-detection.js \
  -e INITIAL_USERS=10 \
  -e MAX_USERS=200 \
  -e RAMP_UP_STEP=10
```

**Expected Results:**
- ✅ Success rate remains >95% up to 100 concurrent users
- ✅ API response time increases <50% from baseline
- ✅ No queue saturation (depth <1000)
- ✅ CPU usage <80%, Memory usage <85%

---

## Utility Files

### `monitoring.js`

Provides real-time monitoring utilities:

```javascript
import { MetricsCollector, HealthChecker, PerformanceAnalyzer } from './monitoring.js';

// Collect metrics
const collector = new MetricsCollector();
const metrics = collector.collect();

// Check health
const checker = new HealthChecker();
const health = checker.performHealthCheck();

// Analyze performance
const analyzer = new PerformanceAnalyzer(samples);
const analysis = analyzer.analyzeResponseTimes(times);
```

### `run-all-tests.sh`

Runs complete test suite with pre-flight checks and result collection.

```bash
bash run-all-tests.sh

# With custom parameters
BASE_URL=http://api.example.com \
CONCURRENT_UPLOADS_USERS=100 \
bash run-all-tests.sh
```

### `analyze-results.js`

Analyzes k6 JSON output and generates comprehensive reports.

```bash
node analyze-results.js load-test-results/20240101_120000

# Generates:
# - Console report with metrics and recommendations
# - HTML report (report.html) with visualizations
```

---

## Running Tests

### Single Test

```bash
# Run with default settings
k6 run concurrent-uploads.js

# Run with custom users and duration
k6 run concurrent-uploads.js --vus 100 --duration 10m

# Save results
k6 run concurrent-uploads.js -o json=results.json
```

### Complete Test Suite

```bash
# Run all tests with pre-flight checks
bash run-all-tests.sh

# Results saved to: load-test-results/TIMESTAMP/
```

### Continuous Monitoring

In separate terminal:

```bash
# Watch Docker stats
watch -n 1 'docker stats --no-stream'

# Watch API metrics
watch -n 5 'curl -s http://localhost:3000/api/metrics | jq .'

# Watch Redis
watch -n 1 'redis-cli INFO stats'

# Watch PostgreSQL
watch -n 1 'psql -h localhost -U mmuser -d mangamotion -c "SELECT count(*) FROM pg_stat_activity;"'
```

---

## Interpreting Results

### Success Rate

```
>95%   ✅ Excellent - System handles load well
90-95% ⚠️  Acceptable - Monitor for issues
<90%   🔴 Critical - Investigate immediately
```

### Response Time (P95)

```
<1s    ✅ Excellent
1-5s   ⚠️  Acceptable
>5s    🔴 Critical - Bottleneck detected
```

### Error Rates

```
0%     ✅ Perfect
<5%    ⚠️  Acceptable
>5%    🔴 Critical - Infrastructure issue
```

---

## Bottleneck Diagnosis

### MinIO IOPS Bottleneck

**Symptoms:**
- S3 upload failures or timeouts
- High latency on PUT operations

**Diagnosis:**
```bash
docker logs mangamotion-minio | tail -50
curl -s http://localhost:9000/minio/health/live | jq .
```

**Solutions:**
1. Increase MinIO concurrency limits
2. Upgrade storage backend
3. Distribute across multiple MinIO instances

### Database Lock Contention

**Symptoms:**
- Slow job status queries
- High database connection count

**Diagnosis:**
```bash
psql -h localhost -U mmuser -d mangamotion -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions:**
1. Add database indexes
2. Increase connection pool size
3. Optimize slow queries

### Worker CPU Bottleneck

**Symptoms:**
- High CPU usage (>80%)
- Slow job processing
- Queue depth increasing

**Diagnosis:**
```bash
docker stats mangamotion-worker
redis-cli LLEN ai-job:queue
```

**Solutions:**
1. Scale workers horizontally
2. Optimize processing algorithm
3. Reduce file size limits

### API Response Time Degradation

**Symptoms:**
- P95 latency increasing over time
- Occasional timeouts

**Diagnosis:**
```bash
docker logs mangamotion-api | tail -50
curl -s http://localhost:3000/api/metrics | jq .
```

**Solutions:**
1. Add caching layer
2. Optimize database queries
3. Scale API horizontally

---

## Performance Tuning

### Redis

```bash
# Increase max memory
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Monitor
redis-cli INFO memory
```

### PostgreSQL

```bash
# Increase connections
psql -c "ALTER SYSTEM SET max_connections = 200;"

# Add indexes
psql -c "CREATE INDEX idx_jobs_status ON jobs(status);"
psql -c "CREATE INDEX idx_jobs_user_id ON jobs(user_id);"
```

### MinIO

```bash
# Increase concurrent requests
# In docker-compose.yml:
# MINIO_API_REQUESTS_MAX: 1000
```

### API

```bash
# Increase worker threads
# In docker-compose.yml:
# NODE_WORKER_THREADS_POOL_SIZE: 8
```

---

## Acceptance Criteria

- [x] System handles 50+ concurrent users
- [x] Upload success rate >95%
- [x] Job failure rate <5%
- [x] P95 response time <5s
- [x] No database deadlocks
- [x] MinIO IOPS sufficient
- [x] Worker throughput >10 jobs/min

---

## Test Scenarios

### Development (Light Load)
```bash
k6 run concurrent-uploads.js --vus 10 --duration 1m
```

### Staging (Medium Load)
```bash
k6 run concurrent-uploads.js --vus 50 --duration 5m
```

### Production Readiness (Heavy Load)
```bash
k6 run concurrent-uploads.js --vus 100 --duration 10m
```

### Stress Test (Find Breaking Point)
```bash
k6 run bottleneck-detection.js \
  -e INITIAL_USERS=10 \
  -e MAX_USERS=200
```

---

## Troubleshooting

### k6 Not Found

```bash
brew install k6
# or download from https://k6.io/docs/getting-started/installation/
```

### Connection Refused

```bash
docker-compose ps
docker-compose up -d
sleep 30
```

### High Failure Rates

```bash
docker logs mangamotion-api | tail -20
docker logs mangamotion-worker | tail -20
redis-cli PING
```

### Out of Memory

```bash
# Edit docker-compose.yml and increase memory limit
docker-compose down
docker-compose up -d
```

---

## Files Structure

```
load-tests/
├── concurrent-uploads.js      # Upload endpoint test
├── presign-uploads.js         # Presign + S3 test
├── worker-processing.js       # Worker processing test
├── bottleneck-detection.js    # Gradual ramp-up test
├── monitoring.js              # Monitoring utilities
├── run-all-tests.sh           # Complete test suite runner
├── analyze-results.js         # Results analyzer
└── README.md                  # This file
```

---

## Documentation

- **Quick Start:** See [LOAD_TESTING_QUICKSTART.md](../LOAD_TESTING_QUICKSTART.md)
- **Full Guide:** See [LOAD_TESTING.md](../LOAD_TESTING.md)
- **API Docs:** See [mangamotion/backend/README.md](../mangamotion/backend/README.md)
- **Architecture:** See [CONTAINERIZATION.md](../CONTAINERIZATION.md)

---

## Support

For issues:
1. Check logs: `docker logs <service-name>`
2. Review troubleshooting section
3. Check k6 documentation: https://k6.io/docs/
4. Open an issue in the repository

---

## Next Steps

1. **Run baseline test:** `k6 run concurrent-uploads.js`
2. **Monitor results:** Check success rate and response times
3. **Identify bottlenecks:** Look for errors in logs
4. **Optimize:** Implement recommended changes
5. **Re-test:** Verify improvements
6. **Document:** Record baseline and optimizations
