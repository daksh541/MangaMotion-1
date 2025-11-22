# Monitoring Alerts & SLOs - MangaMotion

## Overview

A comprehensive monitoring, alerting, and SLO tracking system for MangaMotion that automatically detects infrastructure issues and provides clear remediation steps.

**Status:** ✅ COMPLETE AND READY TO USE

## What Was Implemented

### 1. Alert Manager (`alert-manager.js`)

Monitors key metrics and triggers alerts with actionable remediation steps.

**Alerts Implemented:**

#### Queue Length Alerts
- **Warning:** Queue length > 100 jobs
- **Critical:** Queue length > 500 jobs
- **Remediation Steps:**
  - Check worker status and logs
  - Verify worker is running
  - Monitor CPU/memory usage
  - Scale workers horizontally
  - Monitor queue depth in real-time

#### Failed Jobs Rate Alerts
- **Warning:** >5% failed jobs
- **Critical:** >10% failed jobs
- **Remediation Steps:**
  - Check API and worker logs for errors
  - Verify database connectivity
  - Check MinIO health
  - Review failed jobs in detail
  - Investigate error patterns

#### Storage Usage Alerts
- **Warning:** Storage > 80%
- **Critical:** Storage > 95%
- **Remediation Steps:**
  - Check disk space usage
  - Identify large files
  - Clean up old files
  - Check MinIO usage
  - Implement cleanup policies
  - Scale storage if needed

#### Worker Crash Rate Alerts
- **Warning:** >5% workers crashed
- **Critical:** >10% workers crashed
- **Remediation Steps:**
  - Check worker status and logs
  - Look for OOM (Out of Memory) errors
  - Increase worker memory limits
  - Restart workers
  - Check for resource contention
  - Review error patterns

**Alert Features:**
- ✅ Automatic threshold detection
- ✅ State tracking (avoid duplicate alerts)
- ✅ Alert history tracking
- ✅ Severity levels (INFO, WARNING, CRITICAL)
- ✅ Detailed remediation steps
- ✅ Configurable thresholds via environment variables

**Configuration:**
```bash
# Queue length thresholds
ALERT_QUEUE_LENGTH_WARNING=100
ALERT_QUEUE_LENGTH_CRITICAL=500

# Failed jobs rate thresholds
ALERT_FAILED_JOBS_RATE_WARNING=0.05      # 5%
ALERT_FAILED_JOBS_RATE_CRITICAL=0.10     # 10%

# Storage thresholds
ALERT_STORAGE_WARNING=80                 # 80%
ALERT_STORAGE_CRITICAL=95                # 95%

# Worker crash rate thresholds
ALERT_WORKER_CRASH_RATE_WARNING=0.05     # 5%
ALERT_WORKER_CRASH_RATE_CRITICAL=0.10    # 10%
```

---

### 2. SLO Tracker (`slo.js`)

Tracks Service Level Objectives and measures system performance against targets.

**SLOs Defined:**

#### Availability SLO
- **Target:** 99.5% uptime
- **Window:** 30 days
- **Tracks:** System uptime percentage

#### Error Rate SLO
- **Target:** <5% failed jobs
- **Window:** 24 hours
- **Tracks:** Percentage of failed jobs

#### Latency SLO (P95)
- **Target:** <5 seconds
- **Window:** 24 hours
- **Tracks:** 95th percentile job processing time

#### Throughput SLO
- **Target:** >10 jobs/minute
- **Window:** 1 hour
- **Tracks:** Minimum jobs processed per minute

#### Queue Depth SLO
- **Target:** <500 jobs
- **Window:** 1 hour
- **Tracks:** Maximum queue length

**SLO Features:**
- ✅ Automatic measurement recording
- ✅ Percentile calculations
- ✅ Violation tracking
- ✅ Error budget calculation
- ✅ Uptime budget calculation
- ✅ Historical trending

**Error Budget:**
Shows how much error budget remains before violating the error rate SLO.

```json
{
  "budget": "5.00%",
  "used": "2.50%",
  "remaining": "2.50%",
  "percentageRemaining": "50.00%",
  "status": "✅ Budget available"
}
```

**Uptime Budget:**
Shows how much uptime budget remains before violating the availability SLO.

```json
{
  "budget": "99.50%",
  "actual": "99.80%",
  "remaining": "0.30%",
  "percentageRemaining": "0.03%",
  "status": "✅ Budget available"
}
```

---

### 3. API Endpoints

#### `/api/alerts` - Alert Statistics
Returns overall alert statistics and active alerts.

```bash
curl http://localhost:3000/api/alerts
```

**Response:**
```json
{
  "totalAlerts": 5,
  "activeAlerts": 2,
  "alertsByName": {
    "QueueLengthWarning": {
      "id": "QueueLengthWarning-1234567890",
      "name": "QueueLengthWarning",
      "severity": "warning",
      "message": "Queue length is 150 jobs (warning threshold: 100)",
      "remediation": "1. Monitor queue depth...",
      "metrics": { "queueLength": 150 },
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  },
  "history": {
    "queueLength": [...],
    "failedJobsRate": [...],
    "storageUsage": [...],
    "workerCrashRate": [...]
  }
}
```

#### `/api/alerts/active` - Active Alerts
Returns list of currently active alerts with full details.

```bash
curl http://localhost:3000/api/alerts/active
```

#### `/api/slos` - SLO Status
Returns current status of all SLOs.

```bash
curl http://localhost:3000/api/slos
```

**Response:**
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "slos": {
    "availability": {
      "name": "Availability",
      "description": "System uptime percentage",
      "actual": "99.80",
      "target": "99.50",
      "unit": "%",
      "met": true,
      "percentage": "100.30",
      "status": "✅ MET"
    },
    "errorRate": {
      "name": "Error Rate",
      "description": "Percentage of failed jobs",
      "actual": "2.50",
      "target": "5.00",
      "unit": "%",
      "met": true,
      "percentage": "50.00",
      "status": "✅ MET"
    },
    "latencyP95": {
      "name": "Latency (P95)",
      "description": "95th percentile job processing time",
      "actual": "3500.00",
      "target": "5000.00",
      "unit": "ms",
      "met": true,
      "percentage": "70.00",
      "status": "✅ MET"
    },
    "throughput": {
      "name": "Throughput",
      "description": "Minimum jobs processed per minute",
      "actual": "15.00",
      "target": "10.00",
      "unit": "jobs/min",
      "met": true,
      "percentage": "150.00",
      "status": "✅ MET"
    },
    "queueDepth": {
      "name": "Queue Depth",
      "description": "Maximum queue length",
      "actual": "150.00",
      "target": "500.00",
      "unit": "jobs",
      "met": true,
      "percentage": "30.00",
      "status": "✅ MET"
    }
  },
  "summary": {
    "totalSLOs": 5,
    "metSLOs": 5,
    "violatedSLOs": 0
  }
}
```

#### `/api/slos/violations` - SLO Violations
Returns list of SLO violations.

```bash
curl http://localhost:3000/api/slos/violations?limit=50
```

#### `/api/slos/error-budget` - Error Budget
Returns error budget status.

```bash
curl http://localhost:3000/api/slos/error-budget
```

#### `/api/slos/uptime-budget` - Uptime Budget
Returns uptime budget status.

```bash
curl http://localhost:3000/api/slos/uptime-budget
```

#### `/api/health` - Health Check
Returns system health status.

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "metrics": {
    "jobsProcessed": 1000,
    "jobsFailed": 25,
    "queueLength": 50
  },
  "alerts": {
    "total": 0,
    "critical": 0,
    "warning": 0
  }
}
```

---

## Quick Start

### 1. Environment Configuration

```bash
# Alert thresholds
export ALERT_QUEUE_LENGTH_WARNING=100
export ALERT_QUEUE_LENGTH_CRITICAL=500
export ALERT_FAILED_JOBS_RATE_WARNING=0.05
export ALERT_FAILED_JOBS_RATE_CRITICAL=0.10
export ALERT_STORAGE_WARNING=80
export ALERT_STORAGE_CRITICAL=95
export ALERT_WORKER_CRASH_RATE_WARNING=0.05
export ALERT_WORKER_CRASH_RATE_CRITICAL=0.10
```

### 2. Start MangaMotion

```bash
docker-compose up -d
```

### 3. Check Alerts

```bash
# Get alert statistics
curl http://localhost:3000/api/alerts

# Get active alerts
curl http://localhost:3000/api/alerts/active

# Get SLO status
curl http://localhost:3000/api/slos

# Get error budget
curl http://localhost:3000/api/slos/error-budget

# Check health
curl http://localhost:3000/api/health
```

---

## Monitoring Dashboard

### Real-time Monitoring

```bash
# Watch alerts
watch -n 5 'curl -s http://localhost:3000/api/alerts | jq .activeAlerts'

# Watch SLO status
watch -n 5 'curl -s http://localhost:3000/api/slos | jq .summary'

# Watch health
watch -n 5 'curl -s http://localhost:3000/api/health | jq .'

# Watch error budget
watch -n 5 'curl -s http://localhost:3000/api/slos/error-budget | jq .'
```

### Alert Callback Integration

Register callbacks for alert notifications:

```javascript
const { alertManager } = require('./alert-manager');

// Send to Slack
alertManager.onAlert((alert) => {
  if (alert.severity === 'critical') {
    sendToSlack({
      channel: '#alerts',
      text: alert.format(),
    });
  }
});

// Send to PagerDuty
alertManager.onAlert((alert) => {
  if (alert.severity === 'critical') {
    sendToPagerDuty({
      severity: alert.severity,
      description: alert.message,
      details: alert.remediation,
    });
  }
});

// Send to email
alertManager.onAlert((alert) => {
  if (alert.severity === 'critical') {
    sendEmail({
      to: 'ops@example.com',
      subject: `[${alert.severity.toUpperCase()}] ${alert.name}`,
      body: alert.format(),
    });
  }
});
```

---

## Alert Remediation Examples

### Queue Length Warning

**Alert Message:**
```
🟡 [WARNING] QueueLengthWarning
Queue length is 150 jobs (warning threshold: 100)

📋 Remediation:
1. Monitor queue depth: watch -n 1 'redis-cli LLEN ai-job:queue'
2. Check worker throughput: docker logs mangamotion-worker | grep processed
3. Consider scaling workers if trend is increasing
4. Check for slow jobs: docker logs mangamotion-worker | grep -i slow
```

**Steps to Resolve:**
1. Check current queue depth
2. Monitor worker logs for processing speed
3. If queue is growing, scale workers
4. Look for slow jobs that might be blocking

### Failed Jobs Rate Critical

**Alert Message:**
```
🔴 [CRITICAL] FailedJobsRateCritical
Failed jobs rate is 12.50% (critical threshold: 10.00%)

📋 Remediation:
1. Check API logs: docker logs mangamotion-api | grep -i error | tail -50
2. Check worker logs: docker logs mangamotion-worker | grep -i error | tail -50
3. Verify database connectivity: psql -h postgres -U mmuser -d mangamotion -c "SELECT 1;"
4. Check MinIO health: curl http://minio:9000/minio/health/live
5. Review failed jobs: redis-cli LRANGE failed-jobs 0 -1
```

**Steps to Resolve:**
1. Check logs for error patterns
2. Verify all services are healthy
3. Check database and MinIO connectivity
4. Review failed job details
5. Fix underlying issues

### Storage Critical

**Alert Message:**
```
🔴 [CRITICAL] StorageCritical
Storage usage is 96.50% (critical threshold: 95%)

📋 Remediation:
1. Check disk space: df -h /data
2. Identify large files: du -sh /data/* | sort -rh | head -10
3. Clean up old files: find /data -type f -mtime +30 -delete
4. Check MinIO usage: curl http://minio:9000/minio/health/live
5. Consider archiving or deleting old jobs
6. Scale storage: Add more disk space or implement cleanup policies
```

**Steps to Resolve:**
1. Check disk space immediately
2. Identify and remove old files
3. Implement cleanup policies
4. Scale storage if needed
5. Monitor for future growth

---

## SLO Violation Handling

### When Error Budget is Exhausted

**Scenario:** Error rate has used up the entire 5% error budget.

**Actions:**
1. Pause new deployments
2. Focus on stability and bug fixes
3. Increase monitoring frequency
4. Implement error rate reduction initiatives
5. Once error rate drops, resume normal operations

### When Latency SLO is Violated

**Scenario:** P95 latency exceeds 5 seconds.

**Actions:**
1. Check database query performance
2. Look for slow jobs
3. Monitor resource usage (CPU, memory)
4. Implement caching if applicable
5. Scale infrastructure if needed

### When Throughput SLO is Violated

**Scenario:** Processing less than 10 jobs/minute.

**Actions:**
1. Check worker status and logs
2. Verify no resource constraints
3. Look for bottlenecks
4. Scale workers if needed
5. Optimize job processing

---

## Integration with Prometheus & Grafana

### Prometheus Scrape Config

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mangamotion'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Grafana Dashboard

Create a dashboard with the following panels:

1. **Alert Status** - Shows active alerts
2. **SLO Compliance** - Shows SLO status
3. **Error Budget** - Shows error budget remaining
4. **Queue Depth** - Shows queue length trend
5. **Failed Jobs Rate** - Shows failure rate trend
6. **Processing Time** - Shows P95 latency trend

---

## Testing Alerts

### Trigger Queue Length Warning

```bash
# Simulate queue buildup
redis-cli LPUSH ai-job:queue $(seq 1 150)

# Check alert
curl http://localhost:3000/api/alerts/active
```

### Trigger Failed Jobs Rate Warning

```bash
# Simulate failures by updating metrics
curl -X POST http://localhost:3000/api/test/simulate-failures?count=100

# Check alert
curl http://localhost:3000/api/alerts/active
```

### Trigger Storage Warning

```bash
# Create large files to simulate storage usage
dd if=/dev/zero of=/data/test-file bs=1G count=80

# Check alert
curl http://localhost:3000/api/alerts/active

# Clean up
rm /data/test-file
```

---

## Acceptance Criteria - ALL MET ✅

- ✅ Alerts trigger on queue length > threshold
- ✅ Alerts trigger on worker crash rate
- ✅ Alerts trigger on >5% failed jobs per minute
- ✅ Alerts trigger on storage > 80%
- ✅ Alerts provide clear remediation steps
- ✅ SLOs track key metrics
- ✅ Error budget calculation
- ✅ Uptime budget calculation
- ✅ API endpoints for monitoring
- ✅ Health check endpoint
- ✅ Configurable thresholds
- ✅ Alert history tracking

---

## Files Created

- `src/alert-manager.js` (400+ lines) - Alert management system
- `src/slo.js` (400+ lines) - SLO tracking system
- Updated `src/server.js` - Added alert and SLO endpoints

---

## Configuration Reference

### Environment Variables

```bash
# Alert thresholds
ALERT_QUEUE_LENGTH_WARNING=100
ALERT_QUEUE_LENGTH_CRITICAL=500
ALERT_FAILED_JOBS_RATE_WARNING=0.05
ALERT_FAILED_JOBS_RATE_CRITICAL=0.10
ALERT_STORAGE_WARNING=80
ALERT_STORAGE_CRITICAL=95
ALERT_WORKER_CRASH_RATE_WARNING=0.05
ALERT_WORKER_CRASH_RATE_CRITICAL=0.10
```

---

## Support

For issues or questions:
1. Check logs: `docker logs mangamotion-api`
2. Review alert remediation steps
3. Check SLO status: `curl http://localhost:3000/api/slos`
4. Review this documentation

---

## Summary

A complete monitoring, alerting, and SLO tracking system has been implemented for MangaMotion with:

- ✅ 4 comprehensive alert types with remediation steps
- ✅ 5 key SLOs with automatic tracking
- ✅ Error budget and uptime budget calculation
- ✅ 7 API endpoints for monitoring
- ✅ Configurable thresholds
- ✅ Alert history and trending
- ✅ Health check endpoint
- ✅ Production-ready implementation

**Status:** ✅ COMPLETE AND READY FOR PRODUCTION USE
