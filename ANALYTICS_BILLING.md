# Analytics & Billing Guide

Complete guide for per-user usage tracking and billing in MangaMotion.

## Table of Contents

1. [Overview](#overview)
2. [Billing Model](#billing-model)
3. [Usage Tracking](#usage-tracking)
4. [API Endpoints](#api-endpoints)
5. [Dashboard](#dashboard)
6. [Reporting](#reporting)
7. [Configuration](#configuration)

## Overview

### What is Tracked

- **Bytes Processed**: Total bytes of data processed per user
- **Compute Seconds**: Total compute time spent processing jobs
- **Job Count**: Number of jobs completed, failed, or skipped
- **Storage Used**: Current storage usage per user
- **Daily Usage**: Hourly and daily aggregated metrics

### Storage

All billing data is stored in Redis with the following structure:

```
billing:user:{userId}
  - bytes_processed: integer (total bytes)
  - compute_seconds: float (total seconds)
  - job_count: integer (total jobs)
  - jobs_completed: integer (successful jobs)
  - jobs_failed: integer (failed jobs)
  - jobs_skipped: integer (skipped jobs)

billing:daily:{userId}:{YYYY-MM-DD}
  - bytes_processed: integer
  - compute_seconds: float
  - job_count: integer
  - jobs_completed: integer
  - jobs_failed: integer

billing:job:{jobId}
  - bytes_processed: integer
  - compute_seconds: float
  - user_id: string
  - status: string (completed, failed, skipped)
  - timestamp: ISO 8601 timestamp
  - completed_at: ISO 8601 timestamp
  - metadata: JSON string
```

### Data Retention

| Data | Retention | Purpose |
|------|-----------|---------|
| User summary | Indefinite | Lifetime billing |
| Daily usage | 90 days | Trend analysis |
| Job details | 365 days | Audit trail |
| Hourly metrics | 7 days | Real-time monitoring |

## Billing Model

### Pricing Structure

```
Data Processing:  $0.001 per GB
Compute Time:     $0.0001 per second
                  = $0.36 per hour

Example Costs:
- 100 GB processed + 1 hour compute = $0.10 + $0.36 = $0.46
- 1 TB processed + 10 hours compute = $1.00 + $3.60 = $4.60
```

### Cost Calculation

```javascript
// Per job
jobCost = (bytesProcessed / 1024^3) * 0.001 + computeSeconds * 0.0001

// Per user (monthly)
monthlyCost = (totalBytesProcessed / 1024^3) * 0.001 + totalComputeSeconds * 0.0001

// Per user (daily)
dailyCost = (dailyBytesProcessed / 1024^3) * 0.001 + dailyComputeSeconds * 0.0001
```

### Volume Discounts

| Monthly Volume | Discount |
|---|---|
| $0 - $100 | 0% |
| $100 - $500 | 10% |
| $500 - $2,000 | 20% |
| $2,000+ | 30% |

Contact sales@mangamotion.com for custom pricing.

## Usage Tracking

### Automatic Tracking

Usage is automatically tracked when:

1. **Upload**: File size recorded when job created
2. **Processing**: Compute time recorded when job completes
3. **Completion**: Job status recorded (success/failure)

### Manual Tracking

```javascript
const { 
  trackBytesProcessed, 
  trackComputeSeconds, 
  trackJobCompletion 
} = require('./billing');

// Track bytes processed
await trackBytesProcessed(userId, bytesProcessed, jobId);

// Track compute seconds
await trackComputeSeconds(userId, computeSeconds, jobId);

// Track job completion
await trackJobCompletion(userId, jobId, 'completed', {
  file_count: 5,
  total_size_mb: 150
});
```

### Integration Points

#### Upload Endpoint

```javascript
// POST /api/upload
const totalSizeBytes = filePaths.reduce((sum, f) => sum + fs.statSync(f).size, 0);
await trackBytesProcessed(userId, totalSizeBytes, job.id);
```

#### Worker Completion

```javascript
// After job processing
const duration = (Date.now() - startTime) / 1000;
await trackComputeSeconds(userId, duration, job.id);
await trackJobCompletion(userId, job.id, 'completed', {
  file_count: files.length,
  duration_seconds: duration
});
```

#### Job Failure

```javascript
// On job failure
await trackJobCompletion(userId, job.id, 'failed', {
  error: err.message,
  attempt: attemptNumber
});
```

## API Endpoints

### Get Billing Summary

```
GET /api/billing/summary?user_id={userId}
```

**Headers**:
```
X-User-ID: user-123
```

**Response** (200):
```json
{
  "user_id": "user-123",
  "bytes_processed": 1073741824,
  "bytes_processed_gb": 1.0,
  "compute_seconds": 3600,
  "compute_hours": 1.0,
  "job_count": 50,
  "jobs_completed": 48,
  "jobs_failed": 2,
  "jobs_skipped": 0,
  "estimated_cost": 0.46
}
```

### Get Daily Usage

```
GET /api/billing/daily-usage?user_id={userId}&start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}
```

**Query Parameters**:
- `user_id` (required): User ID
- `start_date` (optional): Start date (default: 30 days ago)
- `end_date` (optional): End date (default: today)

**Response** (200):
```json
{
  "user_id": "user-123",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "daily_usage": [
    {
      "date": "2024-01-01",
      "bytes_processed": 1073741824,
      "compute_seconds": 3600,
      "job_count": 5,
      "jobs_completed": 5,
      "jobs_failed": 0
    },
    {
      "date": "2024-01-02",
      "bytes_processed": 536870912,
      "compute_seconds": 1800,
      "job_count": 3,
      "jobs_completed": 3,
      "jobs_failed": 0
    }
  ]
}
```

### Get Job Billing Details

```
GET /api/billing/job/{jobId}
```

**Response** (200):
```json
{
  "job_id": "job-abc123",
  "user_id": "user-123",
  "bytes_processed": 1073741824,
  "bytes_processed_mb": 1024.0,
  "compute_seconds": 3600,
  "status": "completed",
  "timestamp": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T11:00:00Z",
  "job_cost": 0.46,
  "metadata": {
    "file_count": 5,
    "total_size_mb": 1024
  }
}
```

### Get All Users Billing (Admin)

```
GET /api/billing/all-users
```

**Response** (200):
```json
{
  "total_users": 3,
  "users": [
    {
      "user_id": "user-123",
      "bytes_processed": 10737418240,
      "bytes_processed_gb": 10.0,
      "compute_seconds": 36000,
      "compute_hours": 10.0,
      "job_count": 500,
      "jobs_completed": 490,
      "jobs_failed": 10,
      "jobs_skipped": 0,
      "estimated_cost": 4.6
    },
    {
      "user_id": "user-456",
      "bytes_processed": 5368709120,
      "bytes_processed_gb": 5.0,
      "compute_seconds": 18000,
      "compute_hours": 5.0,
      "job_count": 250,
      "jobs_completed": 245,
      "jobs_failed": 5,
      "jobs_skipped": 0,
      "estimated_cost": 2.3
    }
  ]
}
```

## Dashboard

### User Billing Dashboard

The billing dashboard displays:

- **Summary Cards**: Total bytes, compute time, job count, estimated cost
- **Daily Usage Table**: Day-by-day breakdown of usage
- **Date Range Selector**: View last 7, 30, or 90 days
- **Pricing Information**: Current pricing rates

**Access**: `/dashboard/billing`

**Features**:
- Real-time data refresh
- Export to CSV
- Date range filtering
- Cost breakdown by metric

### Admin Billing Dashboard

The admin dashboard displays:

- **All Users Summary**: Total usage across all users
- **Top Users**: Users with highest costs
- **Usage Trends**: Daily/weekly/monthly trends
- **Revenue Forecast**: Projected monthly revenue
- **Export Reports**: Generate billing reports

**Access**: `/admin/billing`

**Features**:
- User filtering
- Date range selection
- Cost analysis
- Revenue reporting
- Invoice generation

## Reporting

### Daily Report

```bash
# Generate daily billing report
curl http://localhost:3000/api/billing/all-users | \
  jq '.users[] | {user_id, estimated_cost, job_count}' > daily_report.json
```

### Monthly Invoice

```bash
# Generate monthly invoice for user
curl "http://localhost:3000/api/billing/daily-usage?user_id=user-123&start_date=2024-01-01&end_date=2024-01-31" | \
  jq '.daily_usage | map(.bytes_processed) | add' # Total bytes
```

### Cost Analysis

```bash
# Analyze cost trends
curl "http://localhost:3000/api/billing/daily-usage?user_id=user-123&start_date=2024-01-01&end_date=2024-01-31" | \
  jq '.daily_usage[] | {date, cost: ((.bytes_processed / 1024 / 1024 / 1024) * 0.001 + (.compute_seconds * 0.0001))}'
```

## Configuration

### Environment Variables

```bash
# Billing configuration
BILLING_ENABLED=true
BILLING_RATE_GB=0.001              # Cost per GB
BILLING_RATE_SECOND=0.0001         # Cost per second
BILLING_RETENTION_DAYS=90          # Daily usage retention
BILLING_VOLUME_DISCOUNT_ENABLED=true

# Volume discount tiers
BILLING_DISCOUNT_TIER_1_THRESHOLD=100    # $100
BILLING_DISCOUNT_TIER_1_PERCENT=10       # 10%
BILLING_DISCOUNT_TIER_2_THRESHOLD=500    # $500
BILLING_DISCOUNT_TIER_2_PERCENT=20       # 20%
BILLING_DISCOUNT_TIER_3_THRESHOLD=2000   # $2000
BILLING_DISCOUNT_TIER_3_PERCENT=30       # 30%
```

### Customizing Pricing

Edit `src/billing.js`:

```javascript
// Change pricing rates
const RATE_PER_GB = 0.001;           // $0.001 per GB
const RATE_PER_SECOND = 0.0001;      // $0.0001 per second

// Update cost calculation
const gbProcessed = bytesProcessed / (1024 * 1024 * 1024);
const estimatedCost = (gbProcessed * RATE_PER_GB) + (computeSeconds * RATE_PER_SECOND);
```

## Examples

### Example 1: Track a Job

```javascript
const userId = 'user-123';
const jobId = 'job-abc123';
const fileSizeBytes = 1073741824; // 1 GB
const computeSeconds = 3600; // 1 hour

// Track bytes
await trackBytesProcessed(userId, fileSizeBytes, jobId);

// Track compute time
await trackComputeSeconds(userId, computeSeconds, jobId);

// Track completion
await trackJobCompletion(userId, jobId, 'completed', {
  file_count: 5,
  duration_seconds: computeSeconds
});

// Result: Cost = $0.001 + $0.36 = $0.361
```

### Example 2: Get User Summary

```bash
curl -H "X-User-ID: user-123" http://localhost:3000/api/billing/summary

# Response:
# {
#   "user_id": "user-123",
#   "bytes_processed": 10737418240,
#   "bytes_processed_gb": 10.0,
#   "compute_seconds": 36000,
#   "compute_hours": 10.0,
#   "job_count": 500,
#   "estimated_cost": 4.6
# }
```

### Example 3: Generate Monthly Invoice

```bash
#!/bin/bash
USER_ID="user-123"
START_DATE="2024-01-01"
END_DATE="2024-01-31"

curl "http://localhost:3000/api/billing/daily-usage?user_id=${USER_ID}&start_date=${START_DATE}&end_date=${END_DATE}" | \
  jq '{
    user_id: .user_id,
    period: "\(.start_date) to \(.end_date)",
    total_bytes_gb: (.daily_usage | map(.bytes_processed) | add) / 1024 / 1024 / 1024,
    total_compute_hours: (.daily_usage | map(.compute_seconds) | add) / 3600,
    total_jobs: (.daily_usage | map(.job_count) | add),
    estimated_cost: (
      ((.daily_usage | map(.bytes_processed) | add) / 1024 / 1024 / 1024) * 0.001 +
      ((.daily_usage | map(.compute_seconds) | add) * 0.0001)
    )
  }'
```

## Troubleshooting

### No Billing Data

**Problem**: Billing summary shows zeros

**Solution**:
1. Verify jobs are being created: `GET /api/jobs`
2. Check Redis connection: `redis-cli ping`
3. Verify tracking calls are being made in worker
4. Check logs for errors: `docker-compose logs api`

### Incorrect Costs

**Problem**: Estimated cost doesn't match expected value

**Solution**:
1. Verify pricing rates in config
2. Check bytes_processed and compute_seconds values
3. Recalculate manually: `(GB * 0.001) + (seconds * 0.0001)`
4. Check for volume discounts applied

### Missing Daily Data

**Problem**: Daily usage data not available

**Solution**:
1. Verify date range is correct
2. Check Redis TTL: `redis-cli ttl billing:daily:user-123:2024-01-15`
3. Verify jobs completed on that date
4. Check for Redis memory issues

## References

- [Billing Module](./src/billing.js)
- [API Endpoints](./src/server.js)
- [Dashboard Components](./frontend/src/components/)
