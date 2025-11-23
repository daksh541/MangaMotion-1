const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { queueAdd, queueScan, getJobStatus } = require('./queue/queues');
const { createPresign } = require('./s3');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const { validatePresignRequest } = require('./validation');
const { rateLimitMiddleware } = require('./rate-limiter');
const { logger } = require('./logger');
const { incrementCounter, recordHistogram, setGauge, formatPrometheus, getMetricsSummary } = require('./metrics');
const { initializeTracing, tracingMiddleware, withSpan, setAttribute, recordException } = require('./tracing');
const { alertManager, runAllChecks, getAlertStats } = require('./alert-manager');
const { sloTracker, updateSLOs } = require('./slo');
const { 
  trackBytesProcessed, 
  trackComputeSeconds, 
  trackJobCompletion,
  getUserBillingSummary, 
  getUserDailyUsage, 
  getJobBillingDetails,
  getAllUsersBillingSummary,
  resetUserBilling
} = require('./billing');

// Initialize tracing first
initializeTracing();

if (!fs.existsSync(config.UPLOAD_DIR)) fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json());

// Add tracing middleware
app.use(tracingMiddleware);

// ===== Simple local multer upload (dev/proto) =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${uuidv4()}_${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { files: config.MAX_FILE_COUNT } });

// Multipart upload endpoint (dev)
app.post('/api/upload', rateLimitMiddleware, upload.array('pages', config.MAX_FILE_COUNT), async (req, res) => {
  return withSpan('upload', async () => {
    const startTime = Date.now();
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    setAttribute('user.id', userId);
    
    try {
      if (!req.files || req.files.length === 0) {
        logger.warn('Upload rejected: no files provided', { user_id: userId });
        setAttribute('error', 'No files provided');
        return res.status(400).json({ error: 'No files provided' });
      }
      
      const filePaths = req.files.map(f => f.path);
      const totalSizeMb = (filePaths.reduce((sum, f) => sum + (fs.statSync(f).size || 0), 0) / 1024 / 1024).toFixed(2);
      
      setAttribute('file.count', filePaths.length);
      setAttribute('file.total_size_mb', parseFloat(totalSizeMb));
      
      const job = await queueAdd({ 
        type: 'process_manga', 
        files: filePaths, 
        options: req.body.options || {},
        scan_status: 'pending',
        uploaded_at: new Date().toISOString(),
        user_id: userId
      });

      setAttribute('job.id', job.id);
      setAttribute('job.status', 'created');

      logger.logJob('created', job.id, {
        user_id: userId,
        file_count: filePaths.length,
        total_size_mb: totalSizeMb
      });

      // Trigger malware scan if enabled
      if (config.SCAN_ON_UPLOAD) {
        try {
          await queueScan(job.id, filePaths);
          logger.info('Scan job queued', { job_id: job.id, user_id: userId });
          setAttribute('scan.queued', true);
        } catch (scanErr) {
          logger.error('Failed to queue scan', { job_id: job.id, user_id: userId, error: scanErr.message });
          setAttribute('scan.error', scanErr.message);
          // Don't fail the upload if scan queueing fails, but log it
        }
      }

      incrementCounter('job_processed_total');
      const duration = (Date.now() - startTime) / 1000;
      recordHistogram('job_processing_seconds', duration);
      setAttribute('duration_seconds', duration);

      return res.json({ jobId: job.id });
    } catch (err) {
      logger.error('Upload failed', { user_id: userId, error: err.message, error_stack: err.stack });
      recordException(err);
      incrementCounter('job_failed_total');
      return res.status(500).json({ error: 'upload failed', details: err.message });
    }
  }, {
    'operation': 'upload',
    'span.kind': 'internal'
  });
});

// Status endpoint
app.get('/api/status/:jobId', async (req, res) => {
  try {
    const status = await getJobStatus(req.params.jobId);
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List user's jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id || 'anonymous';
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    
    // TODO: Implement job listing from database/cache
    // For now, return empty list
    res.json({
      user_id: userId,
      jobs: [],
      total: 0,
      limit,
      offset
    });
  } catch (err) {
    logger.error('Failed to list jobs', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Get job details
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const status = await getJobStatus(req.params.jobId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
      id: req.params.jobId,
      ...status,
      data: status.data || {}
    });
  } catch (err) {
    logger.error('Failed to get job details', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Get presigned download URL for job result
app.get('/api/jobs/:jobId/download', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const status = await getJobStatus(jobId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (status.status !== 'completed') {
      return res.status(400).json({ error: 'Job not completed' });
    }
    
    // TODO: Generate presigned download URL for result
    // Assuming result is stored at processed/{jobId}/result.zip
    const resultKey = `processed/${jobId}/result.zip`;
    
    // For now, return a placeholder
    res.json({
      job_id: jobId,
      download_url: `https://minio.example.com/${resultKey}`,
      expires_in: 3600,
      content_type: 'application/zip'
    });
  } catch (err) {
    logger.error('Failed to get download URL', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Get thumbnail for job
app.get('/api/jobs/:jobId/thumbnail', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const status = await getJobStatus(jobId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // TODO: Generate presigned URL for thumbnail
    // Assuming thumbnail is stored at processed/{jobId}/thumb.jpg
    const thumbnailKey = `processed/${jobId}/thumb.jpg`;
    
    res.json({
      job_id: jobId,
      thumbnail_url: `https://minio.example.com/${thumbnailKey}`,
      expires_in: 3600,
      content_type: 'image/jpeg'
    });
  } catch (err) {
    logger.error('Failed to get thumbnail', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Presign endpoint (S3 PUT presigned URL)
app.post('/api/presign', async (req, res) => {
  return withSpan('presign', async () => {
    try {
      // client should send: { filename: 'page1.png', contentType: 'image/png', fileSizeBytes: 1024000 }
      const { filename, contentType, fileSizeBytes } = req.body;
      
      setAttribute('file.name', filename);
      setAttribute('file.content_type', contentType);
      setAttribute('file.size_bytes', fileSizeBytes);
      
      if (!filename || !contentType || fileSizeBytes === undefined) {
        setAttribute('error', 'Missing required fields');
        return res.status(400).json({ error: 'filename, contentType, and fileSizeBytes required' });
      }

      // Validate file
      const validation = validatePresignRequest(filename, contentType, fileSizeBytes);
      if (!validation.valid) {
        setAttribute('validation_error', validation.error);
        return res.status(400).json({ error: validation.error });
      }

      const key = `${uuidv4()}_${filename}`;
      setAttribute('s3.key', key);
      
      const presignData = await createPresign(key, contentType);
      setAttribute('presign.expires_in', presignData.expiresIn);
      
      return res.json({ key, url: presignData.url, expiresIn: presignData.expiresIn });
    } catch (err) {
      logger.error('Presign failed', { error: err.message });
      recordException(err);
      res.status(500).json({ error: err.message });
    }
  }, {
    'operation': 'presign',
    'span.kind': 'internal'
  });
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(formatPrometheus());
});

// Metrics summary endpoint (JSON)
app.get('/api/metrics', (req, res) => {
  res.json(getMetricsSummary());
});

// Alerts endpoint
app.get('/api/alerts', (req, res) => {
  const stats = getAlertStats();
  res.json(stats);
});

// Alerts endpoint - detailed
app.get('/api/alerts/active', (req, res) => {
  const alerts = alertManager.getActiveAlerts().map(a => a.toJSON());
  res.json({
    count: alerts.length,
    alerts,
  });
});

// SLO status endpoint
app.get('/api/slos', (req, res) => {
  updateSLOs();
  const status = sloTracker.getAllSLOStatus();
  res.json(status);
});

// SLO violations endpoint
app.get('/api/slos/violations', (req, res) => {
  const limit = parseInt(req.query.limit || '100', 10);
  const violations = sloTracker.getViolations(limit);
  res.json({
    count: violations.length,
    violations,
  });
});

// Error budget endpoint
app.get('/api/slos/error-budget', (req, res) => {
  const budget = sloTracker.getErrorBudget();
  res.json(budget);
});

// Uptime budget endpoint
app.get('/api/slos/uptime-budget', (req, res) => {
  const budget = sloTracker.getUptimeBudget();
  res.json(budget);
});

// Billing endpoints
app.get('/api/billing/summary', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }
    
    const summary = await getUserBillingSummary(userId);
    res.json(summary);
  } catch (err) {
    logger.error('Failed to get billing summary', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/billing/daily-usage', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
    
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }
    
    const usage = await getUserDailyUsage(userId, startDate, endDate);
    res.json({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      daily_usage: usage
    });
  } catch (err) {
    logger.error('Failed to get daily usage', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/billing/job/:jobId', async (req, res) => {
  try {
    const details = await getJobBillingDetails(req.params.jobId);
    if (!details) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(details);
  } catch (err) {
    logger.error('Failed to get job billing details', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/billing/all-users', async (req, res) => {
  try {
    // TODO: Add authentication check for admin-only access
    const summaries = await getAllUsersBillingSummary();
    res.json({
      total_users: summaries.length,
      users: summaries
    });
  } catch (err) {
    logger.error('Failed to get all users billing', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ===== Upload → Enqueue → Respond Endpoints =====
const uploadEnqueueRouter = require('./routes/upload-enqueue');
app.use('/api', uploadEnqueueRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const metrics = getMetricsSummary();
  const alerts = alertManager.getActiveAlerts();
  
  const isHealthy = alerts.filter(a => a.severity === 'critical').length === 0;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    metrics: {
      jobsProcessed: metrics.counters.job_processed_total,
      jobsFailed: metrics.counters.job_failed_total,
      queueLength: metrics.gauges.queue_length,
    },
    alerts: {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
    },
  });
});

// Run periodic checks
setInterval(() => {
  updateSLOs();
  runAllChecks(0, 0, 1); // TODO: Get actual storage usage and crash count
}, 60000); // Every minute

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
});
