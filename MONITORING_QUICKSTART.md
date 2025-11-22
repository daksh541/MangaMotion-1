# Monitoring Alerts & SLOs - Quick Start

## 5-Minute Setup

### 1. Start MangaMotion

```bash
docker-compose up -d
```

### 2. Check System Health

```bash
# Health status
curl http://localhost:3000/api/health

# Active alerts
curl http://localhost:3000/api/alerts/active

# SLO status
curl http://localhost:3000/api/slos
```

### 3. Monitor in Real-time

```bash
# Watch health
watch -n 5 'curl -s http://localhost:3000/api/health | jq .'

# Watch alerts
watch -n 5 'curl -s http://localhost:3000/api/alerts/active | jq .count'

# Watch SLOs
watch -n 5 'curl -s http://localhost:3000/api/slos | jq .summary'
```

---

## Common Commands

### Check Alerts

```bash
# All alerts
curl http://localhost:3000/api/alerts

# Active alerts only
curl http://localhost:3000/api/alerts/active

# Pretty print
curl http://localhost:3000/api/alerts/active | jq .
```

### Check SLOs

```bash
# All SLO status
curl http://localhost:3000/api/slos

# Error budget
curl http://localhost:3000/api/slos/error-budget

# Uptime budget
curl http://localhost:3000/api/slos/uptime-budget

# Violations
curl http://localhost:3000/api/slos/violations?limit=50
```

### Check Health

```bash
# Full health check
curl http://localhost:3000/api/health

# Pretty print
curl http://localhost:3000/api/health | jq .
```

---

## Alert Types

### 🟡 Queue Length Warning
- **Trigger:** Queue > 100 jobs
- **Action:** Monitor queue, consider scaling workers

### 🔴 Queue Length Critical
- **Trigger:** Queue > 500 jobs
- **Action:** Scale workers immediately

### 🟡 Failed Jobs Rate Warning
- **Trigger:** >5% failed jobs
- **Action:** Check logs, verify services

### 🔴 Failed Jobs Rate Critical
- **Trigger:** >10% failed jobs
- **Action:** Investigate immediately, check all services

### 🟡 Storage Warning
- **Trigger:** Storage > 80%
- **Action:** Monitor usage, plan cleanup

### 🔴 Storage Critical
- **Trigger:** Storage > 95%
- **Action:** Clean up immediately or add storage

### 🟡 Worker Crash Rate Warning
- **Trigger:** >5% workers crashed
- **Action:** Check worker logs, monitor health

### 🔴 Worker Crash Rate Critical
- **Trigger:** >10% workers crashed
- **Action:** Restart workers, investigate issues

---

## SLO Status

### ✅ All SLOs Met
```json
{
  "summary": {
    "totalSLOs": 5,
    "metSLOs": 5,
    "violatedSLOs": 0
  }
}
```

### ⚠️ Some SLOs Violated
```json
{
  "summary": {
    "totalSLOs": 5,
    "metSLOs": 3,
    "violatedSLOs": 2
  }
}
```

---

## Error Budget

### Budget Available
```bash
curl http://localhost:3000/api/slos/error-budget
```

**Response:**
```json
{
  "budget": "5.00%",
  "used": "2.50%",
  "remaining": "2.50%",
  "percentageRemaining": "50.00%",
  "status": "✅ Budget available"
}
```

### Budget Exhausted
```json
{
  "budget": "5.00%",
  "used": "5.50%",
  "remaining": "0.00%",
  "percentageRemaining": "0.00%",
  "status": "❌ Budget exhausted"
}
```

---

## Troubleshooting

### No Alerts Showing

```bash
# Check if alerts are being generated
curl http://localhost:3000/api/alerts | jq .totalAlerts

# Check API logs
docker logs mangamotion-api | tail -20

# Verify metrics are being collected
curl http://localhost:3000/api/metrics | jq .
```

### SLOs Not Updating

```bash
# Force SLO update
curl http://localhost:3000/api/slos

# Check if metrics are available
curl http://localhost:3000/api/metrics | jq .

# Check API logs
docker logs mangamotion-api | grep -i slo
```

### Health Check Failing

```bash
# Check health status
curl http://localhost:3000/api/health

# Check for critical alerts
curl http://localhost:3000/api/alerts/active | jq '.alerts[] | select(.severity=="critical")'

# Check services
docker-compose ps
```

---

## Configuration

### Alert Thresholds

```bash
# Set in .env or docker-compose.yml
ALERT_QUEUE_LENGTH_WARNING=100
ALERT_QUEUE_LENGTH_CRITICAL=500
ALERT_FAILED_JOBS_RATE_WARNING=0.05
ALERT_FAILED_JOBS_RATE_CRITICAL=0.10
ALERT_STORAGE_WARNING=80
ALERT_STORAGE_CRITICAL=95
ALERT_WORKER_CRASH_RATE_WARNING=0.05
ALERT_WORKER_CRASH_RATE_CRITICAL=0.10
```

### Restart with New Config

```bash
docker-compose down
docker-compose up -d
```

---

## Integration Examples

### Slack Integration

```javascript
const { alertManager } = require('./alert-manager');

alertManager.onAlert((alert) => {
  if (alert.severity === 'critical') {
    fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
      method: 'POST',
      body: JSON.stringify({
        text: `🔴 ${alert.name}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.name}*\n${alert.message}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Remediation:*\n${alert.remediation}`,
            },
          },
        ],
      }),
    });
  }
});
```

### Email Integration

```javascript
const { alertManager } = require('./alert-manager');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

alertManager.onAlert((alert) => {
  if (alert.severity === 'critical') {
    transporter.sendMail({
      from: 'alerts@mangamotion.com',
      to: 'ops@mangamotion.com',
      subject: `[CRITICAL] ${alert.name}`,
      html: `
        <h2>${alert.name}</h2>
        <p>${alert.message}</p>
        <h3>Remediation:</h3>
        <pre>${alert.remediation}</pre>
      `,
    });
  }
});
```

### PagerDuty Integration

```javascript
const { alertManager } = require('./alert-manager');

alertManager.onAlert((alert) => {
  if (alert.severity === 'critical') {
    fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_KEY,
        event_action: 'trigger',
        payload: {
          summary: alert.name,
          severity: alert.severity,
          source: 'MangaMotion',
          custom_details: {
            message: alert.message,
            remediation: alert.remediation,
            metrics: alert.metrics,
          },
        },
      }),
    });
  }
});
```

---

## Monitoring Dashboard

### Create Grafana Dashboard

1. Add data source: `http://localhost:3000/metrics`
2. Create panels:
   - **Alert Count** - Shows active alerts
   - **SLO Compliance** - Shows % of SLOs met
   - **Error Budget** - Shows error budget remaining
   - **Queue Depth** - Shows queue length trend
   - **Failed Jobs** - Shows failure rate trend

### Prometheus Queries

```promql
# Alert count
count(ALERTS{severity="critical"})

# Error rate
rate(job_failed_total[5m]) / rate(job_processed_total[5m])

# Queue length
queue_length

# Processing time P95
histogram_quantile(0.95, rate(job_processing_seconds_bucket[5m]))
```

---

## Testing

### Simulate Queue Warning

```bash
# Add jobs to queue
redis-cli LPUSH ai-job:queue $(seq 1 150)

# Check alert
curl http://localhost:3000/api/alerts/active | jq '.alerts[] | select(.name=="QueueLengthWarning")'

# Clean up
redis-cli DEL ai-job:queue
```

### Simulate Storage Warning

```bash
# Create large file
dd if=/dev/zero of=/data/test-file bs=1G count=80

# Check alert
curl http://localhost:3000/api/alerts/active | jq '.alerts[] | select(.name=="StorageWarning")'

# Clean up
rm /data/test-file
```

---

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/alerts` | GET | Alert statistics |
| `/api/alerts/active` | GET | Active alerts |
| `/api/slos` | GET | SLO status |
| `/api/slos/violations` | GET | SLO violations |
| `/api/slos/error-budget` | GET | Error budget |
| `/api/slos/uptime-budget` | GET | Uptime budget |
| `/api/health` | GET | Health check |

---

## Support

For issues:
1. Check logs: `docker logs mangamotion-api`
2. Review alert remediation steps
3. Check SLO status: `curl http://localhost:3000/api/slos`
4. Read full documentation: `MONITORING_ALERTS_SLOS.md`
