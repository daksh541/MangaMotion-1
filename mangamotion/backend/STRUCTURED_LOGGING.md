# Structured Logging & Prometheus Metrics

## Overview

Comprehensive structured logging and metrics collection for MangaMotion backend and workers.

### Features

- **JSON Structured Logs**: All logs include context fields (job_id, user_id, attempts, etc.)
- **Prometheus Metrics**: Standard metrics for monitoring job throughput, errors, and performance
- **No External Dependencies**: Uses Node.js built-ins and Python stdlib
- **Configurable**: Environment variables control log level and format
- **Grafana Ready**: Metrics exposed in Prometheus format for Grafana dashboards

## Structured Logging

### Node.js Logger (`src/logger.js`)

#### Configuration

```bash
LOG_LEVEL=info          # debug, info, warn, error (default: info)
LOG_FORMAT=json         # json or text (default: json)
```

#### Usage

```javascript
const { logger } = require('./logger');

// Basic logging
logger.info('Operation started', { user_id: 'user123' });
logger.warn('Unusual condition', { job_id: 'job456' });
logger.error('Operation failed', { error: err.message });

// Job-specific logging
logger.logJob('created', jobId, {
  user_id: userId,
  file_count: 5,
  total_size_mb: 125.5
});

logger.logJobComplete(jobId, durationMs, {
  status: 'success',
  output_key: 's3://bucket/output.mp4'
});

logger.logJobFailed(jobId, error, attempts, {
  file_count: 5
});

// Operation timing
logger.logOperation('thumbnail_generation', durationMs, success, {
  object_key: 's3://bucket/thumb.jpg'
});
```

#### Log Output (JSON Format)

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Job created",
  "job_id": "job-123",
  "user_id": "user-456",
  "file_count": 5,
  "total_size_mb": "125.50"
}
```

#### Log Output (Text Format)

```
[2024-01-15T10:30:45.123Z] [INFO] Job created job_id=job-123 user_id=user-456 file_count=5 total_size_mb=125.50
```

### Python Logger (`worker/structured_logger.py`)

#### Configuration

```bash
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR (default: INFO)
LOG_FORMAT=json         # json or text (default: json)
```

#### Usage

```python
from structured_logger import logger

# Basic logging
logger.info('Operation started', user_id='user123')
logger.warn('Unusual condition', job_id='job456')
logger.error('Operation failed', error='Connection timeout')

# Job-specific logging
logger.log_job('started', job_id, file_count=5, object_key='s3://bucket/file.mp4')
logger.log_job_complete(job_id, duration_ms=5000, status='success')
logger.log_job_failed(job_id, error, attempts=2, file_count=5)

# Operation timing
logger.log_operation('thumbnail_generation', duration_ms=2500, success=True, object_key='s3://bucket/thumb.jpg')
```

## Prometheus Metrics

### Metrics Endpoints

#### Node.js Backend

```bash
# Prometheus format (for Prometheus scraping)
GET /metrics

# JSON format (for debugging)
GET /api/metrics
```

### Available Metrics

#### Counters

- **job_processed_total**: Total jobs processed
- **job_failed_total**: Total jobs failed
- **job_skipped_total**: Total jobs skipped (e.g., ClamAV unavailable)
- **scan_clean_total**: Total clean scans
- **scan_infected_total**: Total infected files detected

#### Histograms

- **job_processing_seconds**: Job processing duration
  - Buckets: 0.1, 0.5, 1, 2, 5, 10, 30, 60 seconds
  - Includes: count, sum, percentiles

- **job_attempts**: Job attempt count
  - Buckets: 1, 2, 3, 5
  - Includes: count, sum, percentiles

#### Gauges

- **queue_length**: Current queue length
- **active_jobs**: Current number of active jobs
- **failed_jobs_dlq**: Current number of failed jobs in DLQ

### Prometheus Format Output

```
# HELP job_processed_total Total number of jobs processed
# TYPE job_processed_total counter
job_processed_total 1250

# HELP job_failed_total Total number of jobs failed
# TYPE job_failed_total counter
job_failed_total 15

# HELP job_processing_seconds Job processing duration in seconds
# TYPE job_processing_seconds histogram
job_processing_seconds_bucket{le="0.1"} 0
job_processing_seconds_bucket{le="0.5"} 45
job_processing_seconds_bucket{le="1"} 120
job_processing_seconds_bucket{le="2"} 250
job_processing_seconds_bucket{le="5"} 450
job_processing_seconds_bucket{le="10"} 650
job_processing_seconds_bucket{le="30"} 900
job_processing_seconds_bucket{le="60"} 1200
job_processing_seconds_bucket{le="+Inf"} 1250
job_processing_seconds_sum 3750.5
job_processing_seconds_count 1250

# HELP queue_length Current queue length
# TYPE queue_length gauge
queue_length 42
```

### JSON Metrics Output

```json
{
  "counters": {
    "job_processed_total": 1250,
    "job_failed_total": 15,
    "job_skipped_total": 2,
    "scan_clean_total": 1200,
    "scan_infected_total": 3
  },
  "gauges": {
    "queue_length": 42,
    "active_jobs": 5,
    "failed_jobs_dlq": 8
  },
  "histograms": {
    "job_processing_seconds": {
      "count": 1250,
      "sum": 3750.5,
      "avg": 3.0,
      "p50": 2.5,
      "p95": 8.2,
      "p99": 15.3
    },
    "job_attempts": {
      "count": 1250,
      "sum": 1300,
      "avg": 1.04,
      "p50": 1,
      "p95": 2,
      "p99": 3
    }
  }
}
```

## Integration with Prometheus & Grafana

### Prometheus Configuration

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mangamotion-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard Queries

#### Job Throughput (jobs/minute)

```promql
rate(job_processed_total[1m])
```

#### Error Rate (%)

```promql
(rate(job_failed_total[1m]) / rate(job_processed_total[1m])) * 100
```

#### Average Processing Time

```promql
rate(job_processing_seconds_sum[5m]) / rate(job_processing_seconds_count[5m])
```

#### P95 Processing Time

```promql
histogram_quantile(0.95, rate(job_processing_seconds_bucket[5m]))
```

#### Queue Length

```promql
queue_length
```

#### Malware Detection Rate

```promql
rate(scan_infected_total[1m]) / rate(scan_clean_total[1m] + scan_infected_total[1m])
```

### Grafana Dashboard Setup

1. Add Prometheus data source: `http://prometheus:9090`
2. Create dashboard with panels:
   - **Job Throughput**: `rate(job_processed_total[1m])`
   - **Error Rate**: `(rate(job_failed_total[1m]) / rate(job_processed_total[1m])) * 100`
   - **P95 Latency**: `histogram_quantile(0.95, rate(job_processing_seconds_bucket[5m]))`
   - **Queue Length**: `queue_length`
   - **Active Jobs**: `active_jobs`
   - **Malware Detection**: `rate(scan_infected_total[1m])`

## Log Context Fields

### Standard Fields

All logs include:
- `timestamp`: ISO 8601 timestamp
- `level`: Log level (debug, info, warn, error)
- `message`: Log message

### Job-Related Fields

- `job_id`: Unique job identifier
- `user_id`: User who created the job
- `attempts`: Job attempt number (1-based)
- `status`: Job status (created, processing, completed, failed)
- `file_count`: Number of files in job
- `total_size_mb`: Total file size in MB

### Operation-Related Fields

- `operation`: Operation name (e.g., "thumbnail_generation")
- `duration_ms`: Operation duration in milliseconds
- `object_key`: S3/storage object key
- `success`: Whether operation succeeded

### Error-Related Fields

- `error`: Error message
- `error_stack`: Stack trace
- `error_code`: Error code if applicable

## Performance Considerations

### Memory Usage

- **Metrics**: ~100KB for 1000 samples per histogram
- **Logs**: Streamed to stdout, no buffering
- **Total**: Negligible impact on application memory

### CPU Usage

- **Logging**: <1ms per log entry
- **Metrics**: <1ms per metric update
- **Total**: <1% CPU overhead

### Storage

- **Prometheus**: ~1-2 bytes per sample
- **Logs**: Depends on log aggregation system (ELK, Datadog, etc.)

## Best Practices

### Logging

1. **Always include context**: Use job_id, user_id, object_key
2. **Use appropriate levels**: debug for detailed info, info for events, warn for issues, error for failures
3. **Include timing**: Use duration_ms for performance tracking
4. **Avoid sensitive data**: Don't log passwords, API keys, or PII

### Metrics

1. **Use consistent naming**: Follow Prometheus naming conventions
2. **Add labels**: Use labels for different job types, regions, etc.
3. **Monitor percentiles**: Use p95/p99 for SLA tracking
4. **Set up alerts**: Alert on error rate > 5%, queue length > 100

## Troubleshooting

### No metrics appearing

1. Check `METRICS_ENABLED` environment variable
2. Verify `/metrics` endpoint is accessible
3. Check Prometheus scrape configuration

### High memory usage

1. Reduce histogram retention (default: 1000 samples)
2. Increase scrape interval in Prometheus
3. Use log aggregation instead of file storage

### Missing logs

1. Check `LOG_LEVEL` environment variable
2. Verify log output is not being redirected
3. Check for log rotation/truncation

## Configuration Reference

### Node.js Backend

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error
LOG_FORMAT=json                   # json or text

# Metrics
METRICS_ENABLED=true              # Enable/disable metrics collection
```

### Python Workers

```bash
# Logging
LOG_LEVEL=INFO                    # DEBUG, INFO, WARNING, ERROR
LOG_FORMAT=json                   # json or text

# Metrics
METRICS_ENABLED=true              # Enable/disable metrics collection
```

## Examples

### Complete Job Lifecycle Logging

```javascript
// Job created
logger.logJob('created', jobId, {
  user_id: userId,
  file_count: 5,
  total_size_mb: 125.5
});

// Job processing started
logger.logJob('processing_started', jobId, {
  user_id: userId,
  worker: 'ai-worker-1'
});

// Job completed
logger.logJobComplete(jobId, 5000, {
  user_id: userId,
  output_key: 's3://bucket/output.mp4'
});
```

### Monitoring Query Examples

```promql
# Jobs per second
rate(job_processed_total[1m])

# Error rate percentage
(rate(job_failed_total[1m]) / rate(job_processed_total[1m])) * 100

# Average job duration
rate(job_processing_seconds_sum[5m]) / rate(job_processing_seconds_count[5m])

# 95th percentile job duration
histogram_quantile(0.95, rate(job_processing_seconds_bucket[5m]))

# Queue depth
queue_length

# Failed jobs in DLQ
failed_jobs_dlq
```
