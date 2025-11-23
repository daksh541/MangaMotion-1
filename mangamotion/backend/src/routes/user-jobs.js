// backend/src/routes/user-jobs.js
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const Minio = require('minio');
const { authRequired } = require('../auth/auth');
const { logger } = require('../logger');

const router = express.Router();

// Configuration
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', '..', 'db.sqlite3');
const BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'mangamotion';

// SQLite DB
let db;
try {
  db = new Database(dbFile);
} catch (err) {
  logger.error('Failed to initialize database:', err);
  throw err;
}

// MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT?.split('://')[1]?.split(':')[0] || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || process.env.S3_ENDPOINT?.split(':')[2] || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true' || process.env.S3_ENDPOINT?.startsWith('https'),
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_KEY || 'minioadmin'
});

/**
 * GET /api/me/jobs
 * Get paginated list of user's jobs
 * Query params: page=1, limit=20, status=completed, search=prompt
 */
router.get('/api/me/jobs', authRequired, async (req, res) => {
  const userId = req.user.userId;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const status = req.query.status || null;
  const search = req.query.search || null;

  try {
    // Build query
    let query = 'SELECT * FROM jobs WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND prompt LIKE ?';
      params.push(`%${search}%`);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult.count;

    // Get paginated results
    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const jobs = db.prepare(query).all(...params);

    // Enhance jobs with presigned URLs
    const enhancedJobs = jobs.map(job => {
      const enhanced = {
        jobId: job.id,
        prompt: job.prompt,
        status: job.status,
        progress: job.progress,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        error: job.error
      };

      // Add presigned URL if completed
      if (job.status === 'completed' && job.result_path) {
        try {
          const url = minioClient.presignedGetObject(BUCKET, job.result_path, 60 * 60); // 1 hour
          enhanced.resultUrl = url;
        } catch (e) {
          logger.error(`Presign error for ${job.result_path}: ${e.message}`);
        }
      }

      // Add thumbnail URL if available
      const thumbKey = `outputs/${job.id}/thumb.jpg`;
      try {
        const thumbUrl = minioClient.presignedGetObject(BUCKET, thumbKey, 60 * 60);
        enhanced.thumbnailUrl = thumbUrl;
      } catch (e) {
        // Thumbnail may not exist, that's ok
      }

      return enhanced;
    });

    logger.info(`Retrieved ${jobs.length} jobs for user ${userId}`);

    return res.json({
      jobs: enhancedJobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error(`Get user jobs error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * GET /api/me/jobs/stats
 * Get job statistics for authenticated user
 */
router.get('/api/me/jobs/stats', authRequired, (req, res) => {
  const userId = req.user.userId;

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM jobs
      WHERE user_id = ?
    `).get(userId);

    logger.info(`Retrieved stats for user ${userId}`);

    return res.json({
      total: stats.total || 0,
      completed: stats.completed || 0,
      processing: stats.processing || 0,
      queued: stats.queued || 0,
      failed: stats.failed || 0
    });
  } catch (err) {
    logger.error(`Get stats error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * DELETE /api/me/jobs/:jobId
 * Delete a job (only if user owns it)
 */
router.delete('/api/me/jobs/:jobId', authRequired, (req, res) => {
  const userId = req.user.userId;
  const jobId = req.params.jobId;

  try {
    // Verify ownership
    const job = db.prepare('SELECT id, user_id FROM jobs WHERE id = ?').get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'not_found', message: 'Job not found' });
    }

    if (job.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden', message: 'You do not own this job' });
    }

    // Delete job
    db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);

    logger.info(`Deleted job ${jobId} for user ${userId}`);

    return res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    logger.error(`Delete job error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * GET /api/me/jobs/:jobId
 * Get specific job details (only if user owns it)
 */
router.get('/api/me/jobs/:jobId', authRequired, async (req, res) => {
  const userId = req.user.userId;
  const jobId = req.params.jobId;

  try {
    const job = db.prepare(`
      SELECT * FROM jobs WHERE id = ? AND user_id = ?
    `).get(jobId, userId);

    if (!job) {
      return res.status(404).json({ error: 'not_found', message: 'Job not found' });
    }

    const response = {
      jobId: job.id,
      filePath: job.file_path,
      prompt: job.prompt,
      status: job.status,
      progress: job.progress,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    };

    // Add presigned URL if completed
    if (job.status === 'completed' && job.result_path) {
      try {
        const url = minioClient.presignedGetObject(BUCKET, job.result_path, 60 * 60);
        response.resultUrl = url;
      } catch (e) {
        logger.error(`Presign error for ${job.result_path}: ${e.message}`);
      }
    }

    logger.info(`Retrieved job ${jobId} for user ${userId}`);

    return res.json(response);
  } catch (err) {
    logger.error(`Get job error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
