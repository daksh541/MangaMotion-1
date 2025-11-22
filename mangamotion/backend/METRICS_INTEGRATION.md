# Metrics & Logging Integration Guide

## Quick Start

### 1. Backend Setup (Node.js)

The logging and metrics are already integrated into the backend. Just set environment variables:

```bash
# .env
LOG_LEVEL=info
LOG_FORMAT=json
METRICS_ENABLED=true
```

Start the server:

```bash
npm start
```

Verify metrics endpoint:

```bash
curl http://localhost:3000/metrics
```

### 2. Worker Setup (Python)

Add to your Python worker:

```python
from structured_logger import logger
from prometheus_metrics import increment_counter, record_histogram

# Log job start
logger.log_job('started', job_id, file_count=5)

# Record operation timing
start = time.time()
# ... do work ...
duration_ms = (time.time() - start) * 1000
record_histogram('job_processing_seconds', duration_ms / 1000)

# Log completion
logger.log_job_complete(job_id, duration_ms)
```

### 3. Prometheus & Grafana Setup

#### Option A: Docker Compose (Recommended)

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access services
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
# AlertManager: http://localhost:9093
```

#### Option B: Manual Setup

1. **Install Prometheus**:
   ```bash
   # macOS
   brew install prometheus
   
   # Linux
   wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
   tar xvfz prometheus-2.40.0.linux-amd64.tar.gz
   ```

2. **Configure Prometheus**:
   ```bash
   cp prometheus.yml /etc/prometheus/
   ```

3. **Start Prometheus**:
   ```bash
   prometheus --config.file=prometheus.yml
   ```

4. **Install Grafana**:
   ```bash
   # macOS
   brew install grafana
   
   # Linux
   sudo apt-get install grafana-server
   ```

5. **Start Grafana**:
   ```bash
   grafana-server
   ```

## Verification

### 1. Check Logs

```bash
# JSON logs (default)
npm start 2>&1 | grep -o '{.*}' | jq .

# Text logs
LOG_FORMAT=text npm start
```

### 2. Check Metrics

```bash
# Prometheus format
curl http://localhost:3000/metrics

# JSON format
curl http://localhost:3000/api/metrics | jq .
```

### 3. Verify Prometheus Scraping

1. Open http://localhost:9090
2. Go to Status → Targets
3. Verify `mangamotion-backend` shows "UP"

### 4. Create Grafana Dashboard

1. Open http://localhost:3001 (admin/admin)
2. Add Prometheus data source: http://prometheus:9090
3. Import dashboard from `GRAFANA_DASHBOARD.json`
4. Or create custom panels with queries from `STRUCTURED_LOGGING.md`

## Integration Checklist

- [ ] Logging module imported in all workers
- [ ] Metrics endpoints accessible
- [ ] Prometheus scraping configured
- [ ] Grafana dashboard created
- [ ] Alert rules configured
- [ ] AlertManager webhook configured (Slack/PagerDuty)
- [ ] Log aggregation system configured (optional)

## Common Issues

### Metrics not appearing in Prometheus

**Problem**: Prometheus shows "DOWN" for target

**Solution**:
1. Verify backend is running: `curl http://localhost:3000/metrics`
2. Check prometheus.yml has correct target
3. Verify firewall allows port 3000
4. Check Prometheus logs: `tail -f /var/log/prometheus.log`

### No logs in Grafana

**Problem**: Logs not visible in Grafana

**Solution**:
1. Logs are not stored in Prometheus (metrics only)
2. Use Loki for log aggregation (optional)
3. Or use ELK stack for log storage

### High memory usage

**Problem**: Prometheus using too much memory

**Solution**:
1. Reduce retention: `--storage.tsdb.retention.time=7d`
2. Reduce scrape interval: `scrape_interval: 30s`
3. Disable unnecessary metrics

### Alerts not firing

**Problem**: Alerts not triggering

**Solution**:
1. Check alert_rules.yml syntax: `promtool check rules alert_rules.yml`
2. Verify AlertManager is running
3. Check AlertManager logs
4. Test webhook: `curl -X POST http://localhost:9093/api/v1/alerts`

## Advanced Configuration

### Custom Metrics

Add custom metrics to track business logic:

```javascript
// Node.js
const { incrementCounter, recordHistogram } = require('./metrics');

// Track manga pages processed
incrementCounter('manga_pages_processed_total');
recordHistogram('manga_processing_seconds', duration);
```

```python
# Python
from prometheus_metrics import increment_counter, record_histogram

# Track thumbnails generated
increment_counter('thumbnail_generated_total')
record_histogram('thumbnail_generation_seconds', duration)
```

### Custom Alerts

Add to `alert_rules.yml`:

```yaml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Custom alert triggered"
    description: "Metric value: {{ $value }}"
```

### Log Aggregation (Optional)

For centralized log management, integrate with:

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Loki**: Grafana's log aggregation
- **Datadog**: SaaS log management
- **Splunk**: Enterprise log management

Example with Loki:

```yaml
# promtail-config.yml
scrape_configs:
  - job_name: mangamotion
    static_configs:
      - targets:
          - localhost
        labels:
          job: mangamotion
          __path__: /var/log/mangamotion/*.log
```

## Performance Tuning

### Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 30s        # Increase for lower overhead
  evaluation_interval: 30s
  external_labels:
    cluster: 'production'

# Reduce retention
--storage.tsdb.retention.time=7d
--storage.tsdb.max-block-duration=2h
```

### Grafana

```bash
# Increase dashboard refresh interval
# Set to 30s or 1m instead of 5s
```

### Backend

```bash
# Reduce metric collection overhead
METRICS_ENABLED=false         # Disable if not needed
LOG_LEVEL=warn               # Reduce log verbosity
```

## Monitoring Best Practices

### SLOs (Service Level Objectives)

Define SLOs for your service:

```promql
# 99% of jobs complete within 60 seconds
histogram_quantile(0.99, rate(job_processing_seconds_bucket[5m])) < 60

# Error rate < 1%
(rate(job_failed_total[5m]) / rate(job_processed_total[5m])) < 0.01

# Queue length < 50
queue_length < 50
```

### Dashboards

Create dashboards for:
- **Operations**: Throughput, latency, errors
- **Business**: Jobs processed, revenue impact
- **Infrastructure**: CPU, memory, disk, network
- **Security**: Malware detection, failed scans

### Alerting Strategy

1. **Critical**: Page on-call (error rate > 10%, no jobs processed)
2. **Warning**: Slack notification (error rate > 5%, queue > 100)
3. **Info**: Log only (normal operations)

## Troubleshooting Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq .

# Check alert status
curl http://localhost:9090/api/v1/alerts | jq .

# Query metrics
curl 'http://localhost:9090/api/v1/query?query=job_processed_total'

# Check AlertManager status
curl http://localhost:9093/api/v1/status | jq .

# Test AlertManager webhook
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{"labels":{"alertname":"TestAlert"}}]'
```

## Next Steps

1. **Set up log aggregation** (Loki or ELK)
2. **Configure custom alerts** for business metrics
3. **Create runbooks** for common alerts
4. **Set up on-call rotation** with PagerDuty
5. **Establish SLOs** and track compliance
6. **Regular dashboard reviews** with team
