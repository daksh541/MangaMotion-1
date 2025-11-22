# MangaMotion API Runbook - Common Failures & Solutions

This runbook provides step-by-step solutions for common failures and issues in MangaMotion.

## Table of Contents

1. [Upload Failures](#upload-failures)
2. [Job Processing Failures](#job-processing-failures)
3. [Database Issues](#database-issues)
4. [Queue Issues](#queue-issues)
5. [Storage Issues](#storage-issues)
6. [Performance Issues](#performance-issues)
7. [Monitoring & Alerts](#monitoring--alerts)

---

## Upload Failures

### Issue: "No files provided" (400 Error)

**Symptoms:**
```
HTTP 400: {"error":"No files provided"}
```

**Root Causes:**
- No files attached to request
- Files not in correct form field
- Empty file

**Diagnosis:**
```bash
# Check request format
curl -X POST \
  -H "X-User-ID: user-1" \
  -F "pages=@test.jpg" \
  http://localhost:3000/api/upload

# Verify file exists
ls -la test.jpg

# Check file size
du -h test.jpg
```

**Solution:**
1. Ensure file exists: `ls -la test.jpg`
2. Verify file is not empty: `[ -s test.jpg ] && echo "File OK" || echo "Empty file"`
3. Use correct form field name: `-F "pages=@filename"`
4. For multiple files: `-F "pages=@file1.jpg" -F "pages=@file2.jpg"`

---

### Issue: "Invalid file extension" (400 Error)

**Symptoms:**
```
HTTP 400: {"error":"Invalid file extension"}
```

**Root Causes:**
- File extension not in whitelist
- Incorrect file type

**Allowed Extensions:**
- Images: jpg, jpeg, png, gif, bmp, webp
- Videos: mp4, avi, mov, mkv

**Diagnosis:**
```bash
# Check file extension
file test.jpg

# Check MIME type
file -i test.jpg
```

**Solution:**
1. Verify file extension is in whitelist
2. Convert file if needed: `convert image.bmp image.jpg`
3. Check file MIME type: `file -i test.jpg`

---

### Issue: "File too large" (400 Error)

**Symptoms:**
```
HTTP 400: {"error":"File size exceeds maximum"}
```

**Root Causes:**
- File exceeds MAX_FILE_SIZE_MB (default 100MB)
- Multiple files exceed total limit

**Diagnosis:**
```bash
# Check file size
du -h test.jpg

# Check max size config
echo $MAX_FILE_SIZE_MB

# Check total size of multiple files
du -ch file1.jpg file2.jpg | tail -1
```

**Solution:**
1. Check file size: `du -h test.jpg`
2. If file is too large, compress: `convert -quality 80 large.jpg small.jpg`
3. Or increase limit: `export MAX_FILE_SIZE_MB=200`
4. Restart API: `docker-compose restart api`

---

### Issue: "Rate limit exceeded" (429 Error)

**Symptoms:**
```
HTTP 429: {
  "error": "Too many requests",
  "message": "Rate limit exceeded. Max 10 jobs per minute.",
  "retryAfter": 45
}
```

**Root Causes:**
- Too many uploads in short time
- Rate limit too strict for use case

**Diagnosis:**
```bash
# Check rate limit config
echo $RATE_LIMIT_JOBS_PER_MINUTE

# Check recent uploads
redis-cli GET rate_limit:user-1

# Monitor rate limit
watch -n 1 'redis-cli GET rate_limit:user-1'
```

**Solution:**
1. Wait before retrying: `sleep 45`
2. Or increase rate limit: `export RATE_LIMIT_JOBS_PER_MINUTE=50`
3. Restart API: `docker-compose restart api`
4. For development, disable: `export RATE_LIMIT_JOBS_PER_MINUTE=1000`

---

### Issue: "Upload failed" (500 Error)

**Symptoms:**
```
HTTP 500: {"error":"upload failed","details":"..."}
```

**Root Causes:**
- Database connection error
- Queue connection error
- File system error
- Malware scan error

**Diagnosis:**
```bash
# Check API logs
docker logs mangamotion-api | tail -50

# Check database
psql -h localhost -U mmuser -d mangamotion -c "SELECT 1;"

# Check Redis
redis-cli ping

# Check disk space
df -h /data
```

**Solution:**

**If database error:**
```bash
# Check PostgreSQL
docker logs mangamotion-postgres | tail -20

# Restart database
docker-compose restart postgres

# Wait for startup
sleep 10

# Retry upload
curl -X POST -H "X-User-ID: user-1" -F "pages=@test.jpg" http://localhost:3000/api/upload
```

**If Redis error:**
```bash
# Check Redis
docker logs mangamotion-redis | tail -20

# Restart Redis
docker-compose restart redis

# Verify connection
redis-cli ping

# Retry upload
curl -X POST -H "X-User-ID: user-1" -F "pages=@test.jpg" http://localhost:3000/api/upload
```

**If disk space error:**
```bash
# Check disk usage
df -h /data

# Clean up old files
find /data -type f -mtime +30 -delete

# Or increase disk space
# Edit docker-compose.yml and increase volume size
```

---

## Job Processing Failures

### Issue: Job stuck in "pending" status

**Symptoms:**
```
Job status remains "pending" for >1 minute
curl http://localhost:3000/api/status/$JOB_ID
# {"status":"pending","progress":0}
```

**Root Causes:**
- Worker not running
- Queue not being processed
- Worker crashed

**Diagnosis:**
```bash
# Check worker status
docker ps | grep worker

# Check worker logs
docker logs mangamotion-worker | tail -50

# Check queue depth
redis-cli LLEN ai-job:queue

# Check for errors
docker logs mangamotion-worker | grep -i error
```

**Solution:**

**If worker not running:**
```bash
# Start worker
docker-compose up -d worker

# Verify it's running
docker ps | grep worker

# Check logs
docker logs mangamotion-worker -f
```

**If worker crashed:**
```bash
# View crash logs
docker logs mangamotion-worker | tail -100

# Restart worker
docker-compose restart worker

# Monitor
docker logs mangamotion-worker -f
```

**If queue is stuck:**
```bash
# Check queue depth
redis-cli LLEN ai-job:queue

# View first job
redis-cli LRANGE ai-job:queue 0 0

# If stuck, clear queue (careful!)
redis-cli DEL ai-job:queue

# Restart worker
docker-compose restart worker
```

---

### Issue: Job fails with error

**Symptoms:**
```
Job status becomes "failed"
curl http://localhost:3000/api/status/$JOB_ID
# {"status":"failed","failedReason":"..."}
```

**Root Causes:**
- Processing error
- Malware detected
- File corruption
- Resource exhaustion

**Diagnosis:**
```bash
# Check job details
curl http://localhost:3000/api/status/$JOB_ID | jq .

# Check worker logs
docker logs mangamotion-worker | grep $JOB_ID

# Check for malware alerts
curl http://localhost:3000/api/alerts/active | jq '.alerts[] | select(.name=="*Malware*")'

# Check system resources
docker stats
```

**Solution:**

**If malware detected:**
```bash
# This is expected behavior - file was flagged as malicious
# Check alert details
curl http://localhost:3000/api/alerts/active | jq .

# Use clean test file
curl -o test-clean.jpg https://via.placeholder.com/300x300.jpg

# Retry with clean file
curl -X POST -H "X-User-ID: user-1" -F "pages=@test-clean.jpg" http://localhost:3000/api/upload
```

**If processing error:**
```bash
# Check worker logs for details
docker logs mangamotion-worker | grep -A 10 "error"

# Check file integrity
file test.jpg

# Try with different file
curl -o test-alt.jpg https://via.placeholder.com/500x500.jpg

# Retry
curl -X POST -H "X-User-ID: user-1" -F "pages=@test-alt.jpg" http://localhost:3000/api/upload
```

**If resource exhaustion:**
```bash
# Check resource usage
docker stats

# If memory issue
docker-compose down
# Edit docker-compose.yml to increase memory
# Restart
docker-compose up -d

# If CPU issue
# Reduce concurrent jobs or scale workers
docker-compose up -d --scale worker=3
```

---

## Database Issues

### Issue: "Cannot connect to database"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Root Causes:**
- PostgreSQL not running
- Wrong connection parameters
- Database not initialized

**Diagnosis:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U mmuser -d mangamotion -c "SELECT 1;"

# Check logs
docker logs mangamotion-postgres | tail -20
```

**Solution:**

**If PostgreSQL not running:**
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Wait for startup
sleep 10

# Verify connection
psql -h localhost -U mmuser -d mangamotion -c "SELECT 1;"
```

**If connection parameters wrong:**
```bash
# Check .env file
cat .env | grep POSTGRES

# Should have:
# POSTGRES_USER=mmuser
# POSTGRES_PASSWORD=mmsecret
# POSTGRES_DB=mangamotion

# Update if needed
nano .env

# Restart
docker-compose down
docker-compose up -d
```

**If database not initialized:**
```bash
# Check if tables exist
psql -h localhost -U mmuser -d mangamotion -c "\dt"

# If no tables, run migrations
docker-compose exec postgres psql -U mmuser -d mangamotion -f /docker-entrypoint-initdb.d/001_add_failed_jobs_table.sql

# Or restart to re-run init scripts
docker-compose down -v
docker-compose up -d
```

---

### Issue: Database connection pool exhausted

**Symptoms:**
```
Error: remaining connection slots are reserved for non-replication superuser connections
```

**Root Causes:**
- Too many concurrent connections
- Connections not being released
- Connection pool too small

**Diagnosis:**
```bash
# Check active connections
psql -h localhost -U mmuser -d mangamotion -c "SELECT count(*) FROM pg_stat_activity;"

# View connection details
psql -h localhost -U mmuser -d mangamotion -c "SELECT pid, usename, query_start FROM pg_stat_activity;"

# Check max connections
psql -h localhost -U mmuser -d mangamotion -c "SHOW max_connections;"
```

**Solution:**

**Increase connection pool:**
```bash
# Edit docker-compose.yml
# Add to postgres environment:
# POSTGRES_INIT_ARGS: "-c max_connections=200"

# Restart
docker-compose down
docker-compose up -d

# Verify
psql -h localhost -U mmuser -d mangamotion -c "SHOW max_connections;"
```

**Kill idle connections:**
```bash
# Find idle connections
psql -h localhost -U mmuser -d mangamotion -c "SELECT pid FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"

# Kill them
psql -h localhost -U mmuser -d mangamotion -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"
```

---

## Queue Issues

### Issue: Queue is backing up

**Symptoms:**
```
Queue length keeps increasing
redis-cli LLEN ai-job:queue
# 500+

Alert: QueueLengthCritical
```

**Root Causes:**
- Worker too slow
- Worker crashed
- Jobs too complex
- Not enough workers

**Diagnosis:**
```bash
# Check queue depth
redis-cli LLEN ai-job:queue

# Check worker status
docker ps | grep worker

# Check worker logs
docker logs mangamotion-worker | tail -50

# Check job processing time
curl http://localhost:3000/api/metrics | jq '.histograms.job_processing_seconds'
```

**Solution:**

**Scale workers:**
```bash
# Start additional workers
docker-compose up -d --scale worker=3

# Verify
docker ps | grep worker

# Monitor queue
watch -n 1 'redis-cli LLEN ai-job:queue'
```

**Optimize jobs:**
```bash
# Check slow jobs
docker logs mangamotion-worker | grep "processing_time"

# Reduce file sizes
# Or optimize processing algorithm
```

**Clear stuck jobs:**
```bash
# View failed jobs
redis-cli LRANGE failed-jobs 0 -1

# Clear if needed
redis-cli DEL failed-jobs

# Restart worker
docker-compose restart worker
```

---

## Storage Issues

### Issue: Storage usage too high

**Symptoms:**
```
Alert: StorageCritical
Storage usage is 96.50% (critical threshold: 95%)
```

**Root Causes:**
- Old files not cleaned up
- Large files accumulating
- Lifecycle policies not running

**Diagnosis:**
```bash
# Check disk usage
df -h /data

# Find large files
du -sh /data/* | sort -rh | head -10

# Check MinIO usage
curl http://localhost:9001/minio/health/live

# Check lifecycle policies
docker logs mangamotion-api | grep -i lifecycle
```

**Solution:**

**Clean up old files:**
```bash
# Find files older than 30 days
find /data -type f -mtime +30

# Delete them
find /data -type f -mtime +30 -delete

# Verify
df -h /data
```

**Implement lifecycle policies:**
```bash
# Edit .env
export STORAGE_LIFECYCLE_ENABLED=true
export STORAGE_TEMP_EXPIRATION_DAYS=7
export STORAGE_PROCESSED_EXPIRATION_DAYS=90

# Restart
docker-compose restart api
```

**Increase storage:**
```bash
# Edit docker-compose.yml
# Increase volume size or add new volume

# Restart
docker-compose down
docker-compose up -d
```

---

## Performance Issues

### Issue: Slow API responses

**Symptoms:**
```
API responses taking >5 seconds
curl -w "@curl-format.txt" http://localhost:3000/api/upload
```

**Root Causes:**
- Database slow queries
- API overloaded
- Network latency
- Resource constraints

**Diagnosis:**
```bash
# Check API response time
curl -w "Time: %{time_total}s\n" http://localhost:3000/api/health

# Check slow queries
psql -h localhost -U mmuser -d mangamotion -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check API metrics
curl http://localhost:3000/api/metrics | jq '.histograms.job_processing_seconds'

# Check system resources
docker stats
```

**Solution:**

**Optimize database:**
```bash
# Add indexes
psql -h localhost -U mmuser -d mangamotion -c "CREATE INDEX idx_jobs_status ON jobs(status);"

# Analyze query plans
psql -h localhost -U mmuser -d mangamotion -c "EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 'processing';"
```

**Scale API:**
```bash
# Start additional API instances
docker-compose up -d --scale api=3

# Use load balancer
# Or configure reverse proxy
```

**Increase resources:**
```bash
# Check current usage
docker stats

# Edit docker-compose.yml to increase memory/CPU
# Restart
docker-compose down
docker-compose up -d
```

---

## Monitoring & Alerts

### Issue: No alerts being triggered

**Symptoms:**
```
curl http://localhost:3000/api/alerts/active
# {"count":0,"alerts":[]}
```

**Root Causes:**
- Alert thresholds too high
- Metrics not being collected
- Alert system not running

**Diagnosis:**
```bash
# Check if metrics are being collected
curl http://localhost:3000/api/metrics | jq .

# Check alert configuration
echo $ALERT_QUEUE_LENGTH_WARNING
echo $ALERT_FAILED_JOBS_RATE_WARNING

# Check API logs
docker logs mangamotion-api | grep -i alert
```

**Solution:**

**Lower alert thresholds:**
```bash
# Edit .env
export ALERT_QUEUE_LENGTH_WARNING=50
export ALERT_FAILED_JOBS_RATE_WARNING=0.02

# Restart
docker-compose restart api

# Verify
curl http://localhost:3000/api/alerts/active
```

**Verify metrics collection:**
```bash
# Check metrics endpoint
curl http://localhost:3000/api/metrics | jq '.counters'

# Should show non-zero values
```

---

### Issue: SLO violations not detected

**Symptoms:**
```
curl http://localhost:3000/api/slos | jq '.summary'
# All SLOs showing as met even though performance is poor
```

**Root Causes:**
- SLO targets too loose
- Measurements not being recorded
- SLO system not running

**Diagnosis:**
```bash
# Check SLO status
curl http://localhost:3000/api/slos | jq '.slos'

# Check error budget
curl http://localhost:3000/api/slos/error-budget | jq .

# Check violations
curl http://localhost:3000/api/slos/violations | jq '.violations | length'
```

**Solution:**

**Tighten SLO targets:**
```bash
# Edit src/slo.js
# Adjust SLO targets to match your requirements

# Rebuild and restart
docker-compose build api
docker-compose restart api
```

**Force SLO update:**
```bash
# Manually trigger SLO check
curl http://localhost:3000/api/slos

# Should update measurements
```

---

## Quick Reference

### Common Commands

```bash
# Check health
curl http://localhost:3000/api/health

# View metrics
curl http://localhost:3000/api/metrics | jq .

# View alerts
curl http://localhost:3000/api/alerts/active | jq .

# View SLOs
curl http://localhost:3000/api/slos | jq .

# Check logs
docker logs mangamotion-api -f
docker logs mangamotion-worker -f

# Check queue
redis-cli LLEN ai-job:queue

# Check database
psql -h localhost -U mmuser -d mangamotion -c "SELECT count(*) FROM jobs;"

# Restart services
docker-compose restart api
docker-compose restart worker
docker-compose restart postgres
```

### Emergency Procedures

```bash
# Stop everything
docker-compose down

# Clean and restart
docker-compose down -v
docker-compose up -d

# View all logs
docker-compose logs -f

# Check all services
docker-compose ps
```

---

## When to Escalate

Contact the team if:
1. Multiple services are down
2. Data loss is suspected
3. Security issue detected
4. Persistent connectivity issues
5. Unknown error in logs

---

## Summary

You now have:
- ✅ Solutions for common failures
- ✅ Diagnostic procedures
- ✅ Emergency procedures
- ✅ Quick reference commands

**Next:** Review the API specification in `openapi.yaml` for endpoint details.
