# Backup & Disaster Recovery Guide

Complete backup and disaster recovery procedures for MangaMotion, including MinIO metadata and data replication.

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Backup Procedures](#backup-procedures)
4. [Restore Procedures](#restore-procedures)
5. [Disaster Recovery Playbook](#disaster-recovery-playbook)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Testing & Validation](#testing--validation)
8. [Offsite Replication](#offsite-replication)

## Overview

### Backup Components

- **MinIO Metadata**: Bucket policies, lifecycle rules, versioning settings, tags
- **MinIO Data**: All object data in all buckets
- **PostgreSQL Database**: Job records, user data, processing history
- **Redis Cache**: Queue state (non-critical, can be rebuilt)

### Backup Tiers

| Tier | Frequency | Retention | Type | Location |
|------|-----------|-----------|------|----------|
| Incremental | Hourly | 7 days | Data only | Local NAS |
| Full | Daily | 30 days | Metadata + Data | Local NAS |
| Archive | Weekly | 1 year | Metadata + Data | Offsite S3 |
| Disaster | On-demand | Indefinite | Full snapshot | Offsite + Cold storage |

### Recovery Time Objectives (RTO)

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single object loss | 1 hour | 1 hour |
| Bucket corruption | 4 hours | 1 day |
| MinIO failure | 2 hours | 1 hour |
| Complete data center loss | 24 hours | 1 day |

## Backup Strategy

### 3-2-1 Backup Rule

- **3 copies** of data: Production + 2 backups
- **2 different media**: Local NAS + Cloud storage
- **1 offsite**: Cloud storage in different region

### Backup Schedule

```
Hourly (00:00, 01:00, ..., 23:00):
  - Incremental backup to local NAS
  - Retention: 7 days
  - Size: ~10-50 GB per backup

Daily (02:00 UTC):
  - Full backup to local NAS
  - Retention: 30 days
  - Size: ~100-500 GB per backup

Weekly (Sunday 03:00 UTC):
  - Full backup to offsite S3
  - Retention: 1 year
  - Size: ~100-500 GB per backup

Monthly (1st of month 04:00 UTC):
  - Archive backup to cold storage
  - Retention: 7 years
  - Size: ~100-500 GB per backup
```

## Backup Procedures

### Prerequisites

```bash
# Install MinIO client
brew install minio-mc  # macOS
# or
apt-get install minio-mc  # Linux

# Set environment variables
export MINIO_ENDPOINT="minio.example.com:9000"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"
export MINIO_USE_SSL="true"
export BACKUP_RETENTION_DAYS="30"
export BACKUP_COMPRESSION="true"
```

### Full Backup

Backs up all MinIO metadata and data.

```bash
# Manual full backup
./backup-minio.sh full /mnt/backup

# Output:
# [2024-01-15 02:00:00] Starting MinIO backup (type: full)
# [2024-01-15 02:00:01] Successfully connected to MinIO
# [2024-01-15 02:00:02] Backing up MinIO metadata...
# [2024-01-15 02:00:05] Backing up bucket: originals
# [2024-01-15 02:05:30] Successfully backed up bucket: originals
# [2024-01-15 02:05:31] Backing up bucket: processed
# [2024-01-15 02:10:45] Successfully backed up bucket: processed
# [2024-01-15 02:10:46] Compressing backup...
# [2024-01-15 02:15:00] Backup compressed: /mnt/backup/minio_backup_full_20240115_020000.tar.gz
# [2024-01-15 02:15:00] Compressed size: 250GB
# [SUCCESS] Backup completed successfully
```

### Incremental Backup

Backs up only changed data since last backup.

```bash
# Manual incremental backup
./backup-minio.sh incremental /mnt/backup

# Output:
# [2024-01-15 03:00:00] Starting MinIO backup (type: incremental)
# [2024-01-15 03:00:01] Last backup: 2024-01-15T02:00:00Z
# [2024-01-15 03:00:02] Incrementally backing up bucket: originals
# [2024-01-15 03:02:15] Successfully backed up bucket: originals
# [2024-01-15 03:02:16] Compressing backup...
# [2024-01-15 03:03:30] Backup compressed: /mnt/backup/minio_backup_incremental_20240115_030000.tar.gz
# [2024-01-15 03:03:30] Compressed size: 15GB
# [SUCCESS] Backup completed successfully
```

### Metadata-Only Backup

Backs up only MinIO configuration (policies, lifecycle, versioning).

```bash
# Metadata-only backup
./backup-minio.sh metadata /mnt/backup

# Output:
# [2024-01-15 04:00:00] Starting MinIO backup (type: metadata)
# [2024-01-15 04:00:01] Backing up MinIO metadata...
# [2024-01-15 04:00:05] Metadata backup completed
# [SUCCESS] Backup completed successfully
```

### Automated Backup with Cron

```bash
# Edit crontab
crontab -e

# Add backup jobs
# Hourly incremental backups (keep last 7 days)
0 * * * * /opt/mangamotion/backup-restore/backup-minio.sh incremental /mnt/backup >> /var/log/minio-backup.log 2>&1

# Daily full backups (keep last 30 days)
0 2 * * * /opt/mangamotion/backup-restore/backup-minio.sh full /mnt/backup >> /var/log/minio-backup.log 2>&1

# Weekly offsite backups (keep last 52 weeks)
0 3 * * 0 /opt/mangamotion/backup-restore/backup-minio.sh full s3://backup-bucket/minio >> /var/log/minio-backup.log 2>&1

# Monthly cold storage archive
0 4 1 * * /opt/mangamotion/backup-restore/backup-minio.sh full /mnt/cold-storage >> /var/log/minio-backup.log 2>&1
```

### Backup Verification

```bash
# List all backups
ls -lh /mnt/backup/minio_backup_*

# Verify backup integrity
tar -tzf /mnt/backup/minio_backup_full_20240115_020000.tar.gz | head -20

# Check backup size
du -sh /mnt/backup/minio_backup_full_20240115_020000.tar.gz

# Verify metadata files
tar -xzf /mnt/backup/minio_backup_full_20240115_020000.tar.gz -O | \
  tar -tz | grep metadata | head -10
```

## Restore Procedures

### Prerequisites

```bash
# Ensure MinIO is running
docker-compose up -d minio

# Verify connection
mc ls restore

# Set environment variables (same as backup)
export MINIO_ENDPOINT="minio.example.com:9000"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"
export MINIO_USE_SSL="true"
```

### Full Restore

Restores all MinIO metadata and data from backup.

```bash
# Dry run (preview changes)
DRY_RUN=true ./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# Output:
# [2024-01-15 14:00:00] Starting MinIO restore
# [2024-01-15 14:00:01] Connected to MinIO
# [2024-01-15 14:00:02] Restoring MinIO metadata...
# [2024-01-15 14:00:03] [DRY RUN] Would restore policy for: originals
# [2024-01-15 14:00:04] [DRY RUN] Would restore lifecycle for: originals
# [2024-01-15 14:00:05] [DRY RUN] Would restore data for bucket: originals
# [2024-01-15 14:00:05] [DRY RUN] Files to restore: 50000
# [SUCCESS] Restore completed successfully

# Actual restore
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# Output:
# [2024-01-15 14:05:00] Starting MinIO restore
# [2024-01-15 14:05:01] Connected to MinIO
# [2024-01-15 14:05:02] Restoring MinIO metadata...
# [2024-01-15 14:05:10] Policy restored for bucket: originals
# [2024-01-15 14:05:15] Lifecycle rules restored for bucket: originals
# [2024-01-15 14:05:20] Restoring bucket: originals
# [2024-01-15 14:15:45] Data restored for bucket: originals
# [2024-01-15 14:15:50] Restoring bucket: processed
# [2024-01-15 14:25:30] Data restored for bucket: processed
# [SUCCESS] Restore completed successfully
```

### Metadata-Only Restore

Restores only MinIO configuration without data.

```bash
# Restore metadata only
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 metadata

# Useful for:
# - Recovering bucket policies after accidental deletion
# - Restoring lifecycle rules
# - Recovering versioning settings
```

### Data-Only Restore

Restores only data, assumes metadata already exists.

```bash
# Restore data only
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 data

# Useful for:
# - Recovering from data loss while keeping policies
# - Incremental recovery
# - Partial bucket recovery
```

### Selective Restore

Restore specific bucket only.

```bash
# Extract backup
tar -xzf /mnt/backup/minio_backup_full_20240115_020000.tar.gz

# Restore specific bucket
mc mirror /mnt/backup/minio_backup_full_20240115_020000/data/originals \
  restore/originals --overwrite

# Verify
mc ls restore/originals --recursive | head -20
```

## Disaster Recovery Playbook

### Scenario 1: Single Object Loss

**Symptoms**: User reports missing file

**RTO**: 1 hour | **RPO**: 1 hour

**Recovery Steps**:

```bash
# 1. Identify object
OBJECT_KEY="originals/user-123/document.pdf"

# 2. Check if versioning is enabled
mc version info restore/originals

# 3. If versioning enabled, restore previous version
mc cp restore/originals/${OBJECT_KEY}?versionId=<version-id> \
   restore/originals/${OBJECT_KEY}

# 4. If versioning disabled, restore from backup
BACKUP_DATE="20240115_020000"
mc cp /mnt/backup/minio_backup_full_${BACKUP_DATE}/data/originals/${OBJECT_KEY} \
   restore/originals/${OBJECT_KEY}

# 5. Verify restoration
mc stat restore/originals/${OBJECT_KEY}
```

### Scenario 2: Bucket Corruption

**Symptoms**: Bucket inaccessible or data corrupted

**RTO**: 4 hours | **RPO**: 1 day

**Recovery Steps**:

```bash
# 1. Backup current state for forensics
mc mirror restore/originals /mnt/forensics/originals-corrupted

# 2. Delete corrupted bucket
mc rb restore/originals --force

# 3. Restore from latest backup
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# 4. Verify bucket integrity
mc ls restore/originals --recursive | wc -l
mc du restore/originals

# 5. Run integrity checks
for object in $(mc ls restore/originals --recursive --json | jq -r '.key'); do
  mc stat restore/originals/$object > /dev/null || echo "Corrupted: $object"
done
```

### Scenario 3: MinIO Node Failure

**Symptoms**: MinIO pod/container crashes

**RTO**: 2 hours | **RPO**: 1 hour

**Recovery Steps**:

```bash
# 1. Check MinIO status
docker-compose ps minio

# 2. Restart MinIO
docker-compose restart minio

# 3. Wait for startup
sleep 30

# 4. Verify connectivity
mc ls restore

# 5. If data is lost, restore from backup
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# 6. Monitor logs
docker-compose logs -f minio
```

### Scenario 4: Complete Data Center Loss

**Symptoms**: All infrastructure down

**RTO**: 24 hours | **RPO**: 1 day

**Recovery Steps**:

```bash
# 1. Provision new infrastructure in different region
# - New MinIO cluster
# - New PostgreSQL database
# - New Redis cache

# 2. Download offsite backup from S3
aws s3 cp s3://backup-bucket/minio/minio_backup_full_20240115_020000.tar.gz \
  /mnt/restore/

# 3. Restore MinIO
./restore-minio.sh /mnt/restore/minio_backup_full_20240115_020000 full

# 4. Restore PostgreSQL
# See database backup/restore procedures

# 5. Update DNS/load balancers to point to new infrastructure

# 6. Verify all services
curl https://new-minio.example.com/minio/health/live
curl https://new-api.example.com/api/health

# 7. Notify users of recovery
```

### Scenario 5: Ransomware/Malicious Deletion

**Symptoms**: Large-scale object deletion or encryption

**RTO**: 8 hours | **RPO**: 1 day

**Recovery Steps**:

```bash
# 1. IMMEDIATELY isolate affected systems
# - Disconnect MinIO from network
# - Stop API servers
# - Preserve logs for forensics

# 2. Verify backup integrity
tar -tzf /mnt/backup/minio_backup_full_20240115_020000.tar.gz > /dev/null

# 3. Restore from clean backup
./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# 4. Investigate root cause
# - Check access logs
# - Review IAM policies
# - Audit recent changes

# 5. Implement preventive measures
# - Enable object lock
# - Implement immutable backups
# - Add access controls
# - Enable versioning

# 6. Bring systems back online
# - Reconnect MinIO
# - Restart API servers
# - Monitor for anomalies
```

## Monitoring & Alerts

### Backup Monitoring

```bash
# Check backup status
tail -f /var/log/minio-backup.log

# Monitor backup size
du -sh /mnt/backup/minio_backup_*

# Alert if backup fails
grep -i "error\|failed" /var/log/minio-backup.log && \
  send_alert "MinIO backup failed"

# Alert if backup is too large
BACKUP_SIZE=$(du -sb /mnt/backup | awk '{print $1}')
if [ $BACKUP_SIZE -gt $((500 * 1024 * 1024 * 1024)) ]; then
  send_alert "MinIO backup size exceeds 500GB: $BACKUP_SIZE"
fi

# Alert if backup is missing
if [ ! -f /mnt/backup/minio_backup_full_$(date +%Y%m%d)* ]; then
  send_alert "Daily MinIO backup missing"
fi
```

### Restore Testing

```bash
# Monthly restore test
0 5 15 * * /opt/mangamotion/backup-restore/test-restore.sh

# Test script
#!/bin/bash
set -e

BACKUP_PATH="/mnt/backup/minio_backup_full_$(date -d '1 day ago' +%Y%m%d)*"
TEST_ENDPOINT="minio-test:9000"

# Create test MinIO instance
docker run -d --name minio-test \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data

# Wait for startup
sleep 10

# Restore to test instance
DRY_RUN=false MINIO_ENDPOINT=$TEST_ENDPOINT \
  ./restore-minio.sh $BACKUP_PATH full

# Verify restore
OBJECT_COUNT=$(mc ls minio-test --recursive | wc -l)
if [ $OBJECT_COUNT -gt 0 ]; then
  echo "Restore test PASSED: $OBJECT_COUNT objects restored"
else
  echo "Restore test FAILED: No objects restored"
  exit 1
fi

# Cleanup
docker rm -f minio-test
```

## Testing & Validation

### Backup Validation Checklist

- [ ] Backup completes without errors
- [ ] Backup size is reasonable (within expected range)
- [ ] Backup contains all buckets
- [ ] Backup contains metadata files
- [ ] Backup is compressed successfully
- [ ] Backup can be extracted without corruption
- [ ] Backup is stored in multiple locations
- [ ] Backup is encrypted in transit and at rest

### Restore Validation Checklist

- [ ] Restore completes without errors
- [ ] All buckets are restored
- [ ] All objects are present
- [ ] Object checksums match originals
- [ ] Bucket policies are restored
- [ ] Lifecycle rules are restored
- [ ] Versioning settings are restored
- [ ] No data corruption detected

### Testing Schedule

| Test | Frequency | Duration |
|------|-----------|----------|
| Backup validation | Daily | 30 min |
| Restore test (metadata) | Weekly | 1 hour |
| Restore test (full) | Monthly | 4 hours |
| Disaster recovery drill | Quarterly | 8 hours |

## Offsite Replication

### S3 Replication

```bash
# Configure MinIO replication to AWS S3
mc mirror minio/originals s3://backup-bucket/minio/originals \
  --watch --remove

# Monitor replication
watch -n 5 'aws s3 ls s3://backup-bucket/minio/originals --recursive | wc -l'
```

### Cross-Region Replication

```bash
# Replicate to multiple regions
mc mirror minio/originals s3://backup-bucket-us/minio/originals
mc mirror minio/originals s3://backup-bucket-eu/minio/originals
mc mirror minio/originals s3://backup-bucket-ap/minio/originals
```

### Immutable Backups

```bash
# Create immutable backup bucket
aws s3api create-bucket --bucket backup-bucket-immutable \
  --region us-east-1

# Enable object lock
aws s3api put-object-lock-configuration \
  --bucket backup-bucket-immutable \
  --object-lock-configuration \
  ObjectLockEnabled=Enabled,Rule='{DefaultRetention={Mode=GOVERNANCE,Days=365}}'

# Upload backup with retention
aws s3 cp minio_backup_full_20240115_020000.tar.gz \
  s3://backup-bucket-immutable/ \
  --metadata "retention-days=365"
```

## Troubleshooting

### Backup Fails

```bash
# Check MinIO connectivity
mc ls backup

# Check disk space
df -h /mnt/backup

# Check permissions
ls -la /mnt/backup

# Check MinIO logs
docker-compose logs minio | tail -50

# Retry with verbose output
./backup-minio.sh full /mnt/backup --verbose
```

### Restore Fails

```bash
# Verify backup integrity
tar -tzf /mnt/backup/minio_backup_full_20240115_020000.tar.gz > /dev/null

# Check MinIO connectivity
mc ls restore

# Check disk space
df -h

# Dry run to see what would happen
DRY_RUN=true ./restore-minio.sh /mnt/backup/minio_backup_full_20240115_020000 full

# Check MinIO logs
docker-compose logs minio | tail -50
```

## References

- [MinIO Backup & Restore](https://min.io/docs/minio/linux/administration/backup-restore.html)
- [MinIO Replication](https://min.io/docs/minio/linux/administration/object-replication.html)
- [AWS S3 Backup Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/BestPractices.html)
- [Disaster Recovery Planning](https://en.wikipedia.org/wiki/Disaster_recovery)
