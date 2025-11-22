# Load Testing Quick Start

## 5-Minute Setup

### 1. Install k6

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Verify installation
k6 version
```

### 2. Start MangaMotion

```bash
docker-compose up -d
docker-compose ps  # Verify all services are healthy
```

### 3. Run Your First Load Test

```bash
# Simple 50-user upload test (5 minutes)
k6 run load-tests/concurrent-uploads.js

# Expected output:
# ✓ upload_success_rate >= 0.95 (95% success)
# ✓ upload_duration_ms p(95) < 5000 (5s response time)
```

---

## Common Commands

### Run Specific Test

```bash
# Concurrent uploads
k6 run load-tests/concurrent-uploads.js

# Presign + S3 uploads
k6 run load-tests/presign-uploads.js

# Worker processing
k6 run load-tests/worker-processing.js

# Bottleneck detection (gradual ramp-up)
k6 run load-tests/bottleneck-detection.js
```

### Customize Test Parameters

```bash
# Change number of concurrent users
k6 run load-tests/concurrent-uploads.js --vus 100

# Change test duration
k6 run load-tests/concurrent-uploads.js --duration 10m

# Change file size
k6 run load-tests/concurrent-uploads.js -e FILE_SIZE_KB=500

# Change API endpoint
k6 run load-tests/concurrent-uploads.js -e BASE_URL=http://api.example.com
```

### Save Results to File

```bash
# JSON format (for analysis)
k6 run load-tests/concurrent-uploads.js -o json=results.json

# CSV format
k6 run load-tests/concurrent-uploads.js -o csv=results.csv

# Multiple formats
k6 run load-tests/concurrent-uploads.js \
  -o json=results.json \
  -o csv=results.csv
```

### Run All Tests

```bash
# Run complete test suite (saves results)
bash load-tests/run-all-tests.sh

# With custom parameters
BASE_URL=http://api.example.com \
CONCURRENT_UPLOADS_USERS=100 \
bash load-tests/run-all-tests.sh
```

---

## Interpreting Results

### Success Indicators ✅

```
upload_success_rate >= 0.95       ✅ Good
upload_duration_ms p(95) < 5000   ✅ Good
http_req_failed rate < 0.05       ✅ Good
job_failure_rate < 0.05           ✅ Good
```

### Warning Signs ⚠️

```
upload_success_rate 0.90-0.95     ⚠️  Investigate
upload_duration_ms p(95) 5-10s    ⚠️  Slow response
http_req_failed rate 0.05-0.10    ⚠️  Some failures
job_failure_rate 0.05-0.10        ⚠️  Some jobs failing
```

### Critical Issues 🔴

```
upload_success_rate < 0.90        🔴 Critical
upload_duration_ms p(95) > 10s    🔴 Very slow
http_req_failed rate > 0.10       🔴 Many failures
job_failure_rate > 0.10           🔴 Many jobs failing
```

---

## Troubleshooting

### k6 Not Found

```bash
# Install k6
brew install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

### Connection Refused

```bash
# Check if services are running
docker-compose ps

# Start services
docker-compose up -d

# Wait for services to be healthy
sleep 30
docker-compose ps
```

### High Failure Rates

```bash
# Check API logs
docker logs mangamotion-api | tail -20

# Check worker logs
docker logs mangamotion-worker | tail -20

# Check Redis
redis-cli PING

# Check MinIO
curl http://localhost:9000/minio/health/live
```

### Out of Memory

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

## Performance Baseline

### Expected Performance (Single Instance)

| Metric | Target | Actual |
|--------|--------|--------|
| Concurrent Users | 50 | ? |
| Upload Success Rate | >95% | ? |
| P95 Response Time | <5s | ? |
| Jobs/Minute | 600 | ? |
| Worker Throughput | 10-20/min | ? |

---

## Optimization Tips

### If Upload Success Rate < 95%

```bash
# Check rate limiting
# Increase RATE_LIMIT_JOBS_PER_MINUTE in .env
RATE_LIMIT_JOBS_PER_MINUTE=50

# Check database connections
docker logs mangamotion-api | grep -i "connection"

# Check MinIO capacity
curl http://localhost:9000/minio/health/live
```

### If Response Times > 5s

```bash
# Check database queries
psql -h localhost -U mmuser -d mangamotion -c \
  "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check Redis memory
redis-cli INFO memory

# Check API CPU usage
docker stats mangamotion-api
```

### If Worker Jobs Fail

```bash
# Check worker logs
docker logs mangamotion-worker | tail -50

# Check queue depth
redis-cli LLEN ai-job:queue

# Check worker CPU/memory
docker stats mangamotion-worker
```

---

## Monitoring During Tests

In a separate terminal:

```bash
# Watch Docker stats
watch -n 1 'docker stats --no-stream'

# Watch API metrics
watch -n 5 'curl -s http://localhost:3000/api/metrics | jq .'

# Watch Redis
watch -n 1 'redis-cli INFO stats'

# Watch PostgreSQL connections
watch -n 1 'psql -h localhost -U mmuser -d mangamotion -c "SELECT count(*) FROM pg_stat_activity;"'
```

---

## Test Scenarios

### Light Load (Development)
```bash
k6 run load-tests/concurrent-uploads.js --vus 10 --duration 1m
```

### Medium Load (Staging)
```bash
k6 run load-tests/concurrent-uploads.js --vus 50 --duration 5m
```

### Heavy Load (Production Readiness)
```bash
k6 run load-tests/concurrent-uploads.js --vus 100 --duration 10m
```

### Stress Test (Find Breaking Point)
```bash
k6 run load-tests/bottleneck-detection.js \
  -e INITIAL_USERS=10 \
  -e MAX_USERS=200
```

---

## Acceptance Criteria Checklist

- [ ] System handles 50 concurrent users
- [ ] Upload success rate > 95%
- [ ] Job failure rate < 5%
- [ ] P95 response time < 5s
- [ ] No database deadlocks
- [ ] MinIO IOPS sufficient
- [ ] Worker throughput > 10 jobs/min

---

## Next Steps

1. **Run baseline test:** `k6 run load-tests/concurrent-uploads.js`
2. **Monitor results:** Check success rate and response times
3. **Identify bottlenecks:** Look for errors in logs
4. **Optimize:** Implement recommended changes
5. **Re-test:** Verify improvements
6. **Document:** Record baseline and optimizations

---

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [Full Load Testing Guide](./LOAD_TESTING.md)
- [API Documentation](./mangamotion/backend/README.md)
- [Docker Compose Setup](./CONTAINERIZATION.md)

---

## Support

Having issues? Check:
1. Logs: `docker logs <service-name>`
2. Troubleshooting section above
3. Full guide: `LOAD_TESTING.md`
4. k6 docs: https://k6.io/docs/
