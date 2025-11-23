// backend/src/routes/upload-enqueue.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Minio = require('minio');
const amqplib = require('amqplib');
const Database = require('better-sqlite3');
const { logger } = require('../logger');

const router = express.Router();

// Configuration
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || '209715200'); // 200MB
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov'];
const BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'mangamotion';

// MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT?.split('://')[1]?.split(':')[0] || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || process.env.S3_ENDPOINT?.split(':')[2] || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true' || process.env.S3_ENDPOINT?.startsWith('https'),
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_KEY || 'minioadmin'
});

// SQLite DB
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', '..', 'db.sqlite3');
let db;

try {
  db = new Database(dbFile);
} catch (err) {
  logger.error('Failed to initialize database:', err);
  throw err;
}

// Ensure bucket exists
async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
      logger.info(`Created MinIO bucket: ${BUCKET}`);
    }
  } catch (err) {
    logger.error('MinIO bucket check error:', err);
    throw err;
  }
}

// RabbitMQ connection helper
async function getRabbitChannel() {
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672';
  const conn = await amqplib.connect(rabbitUrl);
  const ch = await conn.createChannel();
  await ch.assertQueue('mangamotion_jobs', { durable: true });
  return { conn, ch };
}

// Multer - store to temp folder
const tmpDir = path.join(__dirname, '..', '..', 'tmp_uploads');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${uuidv4()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

// Helper: safe ext
function safeExt(filename) {
  return path.extname(filename).toLowerCase();
}

// POST /api/upload - Upload file, enqueue job, return jobId
router.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const prompt = req.body.prompt || null;

  try {
    if (!file) {
      return res.status(400).json({ error: 'file_required', message: 'file is required' });
    }

    // Validate extension
    const ext = safeExt(file.originalname);
    if (!ALLOWED_EXT.includes(ext)) {
      // Remove temp file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // ignore
      }
      logger.warn(`Invalid file extension: ${ext}`);
      return res.status(400).json({ error: 'invalid_file_type', message: `Allowed extensions: ${ALLOWED_EXT.join(', ')}` });
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_BYTES) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // ignore
      }
      logger.warn(`File too large: ${file.size} bytes`);
      return res.status(413).json({ error: 'file_too_large', message: `Max file size: ${MAX_UPLOAD_BYTES} bytes` });
    }

    // Generate jobId and destination
    const jobId = uuidv4();
    const destKey = `uploads/${jobId}/original${ext}`;

    logger.info(`Uploading file for job ${jobId}: ${destKey}`);

    // Upload to MinIO
    await minioClient.fPutObject(BUCKET, destKey, file.path, {
      'Content-Type': file.mimetype || 'application/octet-stream'
    });

    // Remove temp file
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      logger.warn(`Failed to delete temp file: ${file.path}`);
    }

    const now = new Date().toISOString();

    // Insert job in DB
    const insert = db.prepare(`
      INSERT INTO jobs (id, file_path, prompt, status, progress, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(jobId, destKey, prompt, 'queued', 0, now, now);
    logger.info(`Job ${jobId} inserted into database`);

    // Publish to RabbitMQ queue
    let conn, ch;
    try {
      const rabbit = await getRabbitChannel();
      conn = rabbit.conn;
      ch = rabbit.ch;

      const payload = { jobId, filePath: destKey, prompt };
      ch.sendToQueue('mangamotion_jobs', Buffer.from(JSON.stringify(payload)), { persistent: true });
      logger.info(`Job ${jobId} published to queue`);

      // Close connection after a short delay to ensure message is persisted
      setTimeout(() => {
        try {
          ch.close();
          conn.close();
        } catch (e) {
          // ignore
        }
      }, 500);
    } catch (err) {
      logger.error(`Failed to publish to RabbitMQ: ${err.message}`);
      // Still return 202 since job is in DB; worker will retry
    }

    // Return accepted
    return res.status(202).json({ jobId });
  } catch (err) {
    logger.error(`Upload error: ${err.message}`, err);
    // Cleanup temp file if exists
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // ignore
      }
    }
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /api/status/:jobId - Get job status
router.get('/api/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;

  try {
    const row = db.prepare(`
      SELECT id, file_path, result_path, prompt, status, progress, error, created_at, updated_at 
      FROM jobs 
      WHERE id = ?
    `).get(jobId);

    if (!row) {
      return res.status(404).json({ error: 'not_found', message: `Job ${jobId} not found` });
    }

    const response = {
      jobId: row.id,
      status: row.status,
      progress: row.progress,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    // If completed, generate presigned URL for 1 hour
    if (row.status === 'completed' && row.result_path) {
      try {
        const url = minioClient.presignedGetObject(BUCKET, row.result_path, 60 * 60); // seconds
        response.resultUrl = url;
      } catch (e) {
        logger.error(`Presign error for ${row.result_path}: ${e.message}`);
      }
    }

    return res.json(response);
  } catch (err) {
    logger.error(`Status check error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// Initialize bucket on startup
ensureBucket().catch(err => {
  logger.error('Failed to ensure bucket:', err);
  process.exit(1);
});

module.exports = router;
