# Quick Reference Guide

Fast lookup for the three new features: Analytics & Billing, User Dashboard, and Backup & Disaster Recovery.

## Analytics & Billing

### API Endpoints

```bash
# Get user's billing summary
GET /api/billing/summary?user_id=user-123
Header: X-User-ID: user-123

# Get daily usage (last 30 days by default)
GET /api/billing/daily-usage?user_id=user-123&start_date=2024-01-01&end_date=2024-01-31

# Get job billing details
GET /api/billing/job/{jobId}

# Admin: Get all users' billing
GET /api/billing/all-users
```

### Billing Module Functions

```javascript
const { 
  trackBytesProcessed,
  trackComputeSeconds,
  trackJobCompletion,
  getUserBillingSummary,
  getUserDailyUsage,
  getJobBillingDetails,
  getAllUsersBillingSummary,
  resetUserBilling
} = require('./src/billing');

// Track bytes processed
await trackBytesProcessed(userId, bytes, jobId);

// Track compute time
await trackComputeSeconds(userId, seconds, jobId);

// Track job completion
await trackJobCompletion(userId, jobId, 'completed', metadata);

// Get user summary
const summary = await getUserBillingSummary(userId);

// Get daily usage
const usage = await getUserDailyUsage(userId, startDate, endDate);

// Get job details
const details = await getJobBillingDetails(jobId);

// Admin: Get all users
const allUsers = await getAllUsersBillingSummary();
```

### Pricing

```
Data Processing:  $0.001 per GB
Compute Time:     $0.0001 per second ($0.36/hour)

Volume Discounts:
- $100-$500: 10% off
- $500-$2,000: 20% off
- $2,000+: 30% off
```

### Cost Calculation

```javascript
// Per job
jobCost = (bytesProcessed / 1024^3) * 0.001 + computeSeconds * 0.0001

// Example: 1 GB + 1 hour
cost = (1 * 0.001) + (3600 * 0.0001) = $0.001 + $0.36 = $0.361
```

---

## User Dashboard

### Components

```jsx
// Job Dashboard
import JobDashboard from './components/JobDashboard';
<JobDashboard />

// Billing Dashboard
import BillingDashboard from './components/BillingDashboard';
<BillingDashboard />
```

### Job Dashboard Features

- List all jobs with status
- Filter by status (all, completed, processing, failed)
- Real-time progress tracking
- Job detail modal
- Thumbnail preview
- Download button
- Auto-refresh every 5 seconds

### Billing Dashboard Features

- Summary cards (bytes, compute, jobs, cost)
- Daily usage table
- Date range selector (7d, 30d, 90d)
- Pricing information
- Real-time refresh

### API Endpoints

```bash
# List user's jobs
GET /api/jobs?user_id=user-123&limit=50&offset=0

# Get job details
GET /api/jobs/{jobId}

# Get presigned download URL
GET /api/jobs/{jobId}/download

# Get thumbnail preview
GET /api/jobs/{jobId}/thumbnail

# Get billing summary
GET /api/billing/summary?user_id=user-123

# Get daily usage
GET /api/billing/daily-usage?user_id=user-123&start_date=2024-01-01&end_date=2024-01-31
```

### Status Colors

| Status | Color | Icon |
|--------|-------|------|
| Completed | Green (#10b981) | ✓ |
| Processing | Blue (#3b82f6) | ⟳ |
| Failed | Red (#ef4444) | ✕ |
| Pending | Amber (#f59e0b) | ⧖ |

---

## Backup & Disaster Recovery

### Backup Scripts

```bash
# Full backup (metadata + data)
./backup-minio.sh full /mnt/backup

# Incremental backup (changed data only)
./backup-minio.sh incremental /mnt/backup

# Metadata-only backup
./backup-minio.sh metadata /mnt/backup

# Restore full (dry-run)
DRY_RUN=true ./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# Restore full (actual)
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# Restore metadata only
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 metadata

# Restore data only
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 data
```

### Backup Schedule

```bash
# Hourly incremental (crontab)
0 * * * * /opt/mangamotion/backup-restore/backup-minio.sh incremental /mnt/backup

# Daily full
0 2 * * * /opt/mangamotion/backup-restore/backup-minio.sh full /mnt/backup

# Weekly offsite
0 3 * * 0 /opt/mangamotion/backup-restore/backup-minio.sh full s3://backup-bucket/minio

# Monthly cold storage
0 4 1 * * /opt/mangamotion/backup-restore/backup-minio.sh full /mnt/cold-storage
```

### Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single object | 1 hour | 1 hour |
| Bucket corruption | 4 hours | 1 day |
| MinIO failure | 2 hours | 1 hour |
| Data center loss | 24 hours | 1 day |

### Disaster Recovery Steps

**Single Object Loss**:
```bash
# Restore from backup
mc cp /mnt/backup/minio_backup_full_20240115_020000/data/originals/object.pdf \
   restore/originals/object.pdf
```

**Bucket Corruption**:
```bash
# Backup current state
mc mirror restore/originals /mnt/forensics/originals-corrupted

# Delete bucket
mc rb restore/originals --force

# Restore from backup
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full
```

**MinIO Failure**:
```bash
# Restart MinIO
docker-compose restart minio

# If data lost, restore from backup
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full
```

**Data Center Loss**:
```bash
# Provision new infrastructure
# Download offsite backup
aws s3 cp s3://backup-bucket/minio/minio_backup_full_20240115_020000.tar.gz /mnt/restore/

# Restore MinIO
./restore-minio.sh /mnt/restore/minio_backup_full_20240115_020000 full

# Update DNS/load balancers
```

### Backup Verification

```bash
# List backups
ls -lh /mnt/backup/minio_backup_*

# Verify integrity
tar -tzf /mnt/backup/minio_backup_full_20240115_020000.tar.gz | head -20

# Check size
du -sh /mnt/backup/minio_backup_full_20240115_020000.tar.gz

# Verify metadata
tar -xzf /mnt/backup/minio_backup_full_20240115_020000.tar.gz -O | \
  tar -tz | grep metadata | head -10
```

---

## Configuration

### Environment Variables

```bash
# Billing
BILLING_ENABLED=true
BILLING_RATE_GB=0.001
BILLING_RATE_SECOND=0.0001
BILLING_RETENTION_DAYS=90

# Backup
MINIO_ENDPOINT="minio.example.com:9000"
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"
MINIO_USE_SSL="true"
BACKUP_RETENTION_DAYS="30"
BACKUP_COMPRESSION="true"
```

---

## Files Overview

### Backend
- `src/billing.js` - Billing module (280 lines)
- `src/server.js` - Updated with 7 new endpoints

### Frontend
- `frontend/src/components/JobDashboard.jsx` - Job dashboard (200 lines)
- `frontend/src/components/JobDashboard.module.css` - Styles (400 lines)
- `frontend/src/components/BillingDashboard.jsx` - Billing dashboard (200 lines)
- `frontend/src/components/BillingDashboard.module.css` - Styles (400 lines)

### Backup & Recovery
- `backup-restore/backup-minio.sh` - Backup script (300 lines)
- `backup-restore/restore-minio.sh` - Restore script (300 lines)

### Documentation
- `ANALYTICS_BILLING.md` - Billing guide (500+ lines)
- `USER_DASHBOARD.md` - Dashboard guide (500+ lines)
- `BACKUP_DISASTER_RECOVERY.md` - Backup guide (1000+ lines)
- `FEATURES_IMPLEMENTATION_SUMMARY.md` - Implementation summary
- `QUICK_REFERENCE.md` - This file

---

## Common Tasks

### Get User's Monthly Cost

```bash
curl "http://localhost:3000/api/billing/daily-usage?user_id=user-123&start_date=2024-01-01&end_date=2024-01-31" | \
  jq '{
    total_bytes_gb: (.daily_usage | map(.bytes_processed) | add) / 1024 / 1024 / 1024,
    total_compute_hours: (.daily_usage | map(.compute_seconds) | add) / 3600,
    estimated_cost: (
      ((.daily_usage | map(.bytes_processed) | add) / 1024 / 1024 / 1024) * 0.001 +
      ((.daily_usage | map(.compute_seconds) | add) * 0.0001)
    )
  }'
```

### Backup All MinIO Data

```bash
./backup-minio.sh full /mnt/backup
```

### Restore from Backup

```bash
DRY_RUN=true ./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full
```

### View Job Status

```bash
curl http://localhost:3000/api/jobs/job-abc123
```

### Download Job Result

```bash
curl http://localhost:3000/api/jobs/job-abc123/download | jq '.download_url'
```

### Get All Users' Billing

```bash
curl http://localhost:3000/api/billing/all-users | jq '.users[] | {user_id, estimated_cost}'
```

---

## Troubleshooting

### Billing Data Missing
1. Check Redis: `redis-cli keys billing:*`
2. Verify tracking calls in worker
3. Check API logs: `docker-compose logs api`

### Dashboard Not Loading
1. Check API: `curl http://localhost:3000/api/health`
2. Check user ID: `localStorage.getItem('userId')`
3. Check browser console for errors

### Backup Failed
1. Check MinIO: `mc ls backup`
2. Check disk space: `df -h /mnt/backup`
3. Check permissions: `ls -la /mnt/backup`
4. Check logs: `tail -f /var/log/minio-backup.log`

### Restore Failed
1. Verify backup exists: `ls /mnt/backup/minio_backup_*`
2. Verify backup integrity: `tar -tzf /mnt/backup/minio_backup_*.tar.gz`
3. Check MinIO running: `docker-compose ps minio`
4. Dry-run first: `DRY_RUN=true ./restore-minio.sh ...`

---

## Documentation Links

- [Analytics & Billing](./ANALYTICS_BILLING.md)
- [User Dashboard](./USER_DASHBOARD.md)
- [Backup & Disaster Recovery](./BACKUP_DISASTER_RECOVERY.md)
- [Implementation Summary](./FEATURES_IMPLEMENTATION_SUMMARY.md)

---

## Support

- **Billing Questions**: See `ANALYTICS_BILLING.md`
- **Dashboard Issues**: See `USER_DASHBOARD.md`
- **Backup/Recovery**: See `BACKUP_DISASTER_RECOVERY.md`
- **General**: See `FEATURES_IMPLEMENTATION_SUMMARY.md`

---

Last Updated: 2024-01-15
Status: ✅ READY FOR PRODUCTION
