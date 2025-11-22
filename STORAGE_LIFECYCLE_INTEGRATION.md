# Storage Lifecycle - Quick Integration Guide

5-minute integration guide for storage lifecycle management.

## 🚀 Quick Start

### 1. Add Dependencies

```bash
npm install node-cron
```

### 2. Update .env

```bash
# Storage Lifecycle Configuration
STORAGE_TEMP_EXPIRATION_DAYS=7
STORAGE_PROCESSED_EXPIRATION_DAYS=90
STORAGE_ORIGINALS_EXPIRATION_DAYS=0
STORAGE_ABORT_INCOMPLETE_DAYS=1
STORAGE_LIFECYCLE_ENABLED=true
STORAGE_LIFECYCLE_SCHEDULE="0 2 * * *"
```

### 3. Update src/server.js

Add to server startup:

```javascript
const cron = require('node-cron');
const { StorageLifecycleManager } = require('./storage-lifecycle');
const { getS3Client } = require('./minio-secure');
const { runFullCleanup } = require('./queue/workers/lifecycle-worker');

// Initialize lifecycle manager
const initializeLifecycle = async () => {
  try {
    const s3Client = getS3Client();
    const lifecycleManager = new StorageLifecycleManager(s3Client);
    await lifecycleManager.initialize();
    
    logger.info('Storage lifecycle manager initialized', lifecycleManager.getStatus());
    
    // Schedule cleanup
    if (config.STORAGE_LIFECYCLE_ENABLED) {
      cron.schedule(config.STORAGE_LIFECYCLE_SCHEDULE, async () => {
        try {
          logger.info('Running scheduled lifecycle cleanup');
          const result = await runFullCleanup(s3Client);
          logger.info('Lifecycle cleanup completed', {
            total_deleted: result.totalDeleted,
            total_duration: result.totalDuration,
          });
        } catch (err) {
          logger.error('Lifecycle cleanup failed', { error: err.message });
        }
      });
      
      logger.info('Lifecycle cleanup scheduled', {
        schedule: config.STORAGE_LIFECYCLE_SCHEDULE,
      });
    }
  } catch (err) {
    logger.warn('Failed to initialize lifecycle manager', { error: err.message });
  }
};

// Call on server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  logger.info('Server started', { port: PORT });
  await initializeLifecycle();
});
```

### 4. Use Storage Keys

When uploading files:

```javascript
const { getTempKey, getProcessedKey } = require('./storage-lifecycle');

// Temporary upload
const tempKey = getTempKey(jobId, filename);
await s3.putObject(tempKey, fileData);

// Processed output
const processedKey = getProcessedKey(jobId, 'thumb.jpg');
await s3.putObject(processedKey, thumbnailData);
```

### 5. Test

```bash
# Check lifecycle policy applied
curl http://localhost:3000/api/metrics | grep lifecycle

# Manual cleanup (optional)
docker-compose exec api node -e "
  const { runFullCleanup } = require('./src/queue/workers/lifecycle-worker');
  const { getS3Client } = require('./src/minio-secure');
  runFullCleanup(getS3Client()).then(r => console.log(r));
"
```

## 📋 File Changes

### New Files (2)
1. `src/storage-lifecycle.js` - Lifecycle management
2. `src/queue/workers/lifecycle-worker.js` - Cleanup worker

### Modified Files (2)
1. `src/config.js` - Added lifecycle configuration
2. `src/server.js` - Initialize lifecycle manager

### Dependencies (1)
1. `node-cron` - Scheduling

## 🔧 Configuration Options

### Development

```bash
# Aggressive cleanup for testing
STORAGE_TEMP_EXPIRATION_DAYS=1
STORAGE_PROCESSED_EXPIRATION_DAYS=7
STORAGE_LIFECYCLE_SCHEDULE="0 * * * *"  # Hourly
```

### Production

```bash
# Conservative cleanup
STORAGE_TEMP_EXPIRATION_DAYS=7
STORAGE_PROCESSED_EXPIRATION_DAYS=90
STORAGE_ORIGINALS_EXPIRATION_DAYS=365
STORAGE_LIFECYCLE_SCHEDULE="0 2 * * *"  # Daily at 2 AM
```

## 📊 Storage Structure

```
S3 Bucket
├── temp/              (expires after 7 days)
│   └── {job_id}/*
├── processed/         (expires after 90 days)
│   └── {job_id}/*
├── originals/         (expires after 365 days, optional)
│   └── {job_id}/*
└── archive/           (never expires)
    └── {job_id}/*
```

## 🧪 Testing

### Manual Cleanup

```bash
# Run cleanup manually
docker-compose exec api node -e "
  const { runFullCleanup } = require('./src/queue/workers/lifecycle-worker');
  const { getS3Client } = require('./src/minio-secure');
  
  (async () => {
    const result = await runFullCleanup(getS3Client());
    console.log('Deleted:', result.totalDeleted);
    console.log('Duration:', result.totalDuration, 'seconds');
  })();
"
```

### Check Lifecycle Policy

```bash
# View MinIO lifecycle policy
docker-compose exec minio mc ilm rule ls minio/mm-bucket
```

### Monitor Cleanup

```bash
# Watch cleanup logs
docker-compose logs -f api | grep lifecycle
```

## ✅ Verification

- [ ] Files created in temp/ are deleted after 7 days
- [ ] Files created in processed/ are deleted after 90 days
- [ ] Lifecycle job runs daily at 2 AM
- [ ] Metrics recorded for cleanup operations
- [ ] Logs show cleanup progress
- [ ] No errors in cleanup process

## 🎯 Next Steps

1. ✅ Add node-cron dependency
2. ✅ Update .env with lifecycle settings
3. ✅ Update src/server.js with initialization
4. ✅ Use getTempKey/getProcessedKey for uploads
5. ✅ Test manual cleanup
6. ✅ Monitor logs and metrics
7. ✅ Deploy to production

## 📚 Full Documentation

See [STORAGE_LIFECYCLE.md](./STORAGE_LIFECYCLE.md) for complete details.

---

**Status**: ✅ READY FOR INTEGRATION 🚀
