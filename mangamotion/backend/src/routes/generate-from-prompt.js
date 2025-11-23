// backend/src/routes/generate-from-prompt.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const amqplib = require('amqplib');
const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../logger');
const { authOptional } = require('../auth/auth');
const { hasEnoughCredits, deductCredits, JOB_COST } = require('../credits/credits');

const router = express.Router();

// Configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672';
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', '..', 'db.sqlite3');
const TEST_FILE_URL = '/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov';

// SQLite DB
let db;
try {
  db = new Database(dbFile);
} catch (err) {
  logger.error('Failed to initialize database:', err);
  throw err;
}

// RabbitMQ connection helper
async function getRabbitChannel() {
  const conn = await amqplib.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue('mangamotion_jobs', { durable: true });
  return { conn, ch };
}

// Sanitize prompt: remove shell metacharacters and limit length
function sanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }
  // Remove shell metacharacters and control characters
  return prompt
    .replace(/[;&|`$(){}[\]<>\\]/g, '')
    .trim()
    .substring(0, 2000);
}

// Validate prompt
function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'prompt must be a non-empty string' };
  }
  if (prompt.trim().length === 0) {
    return { valid: false, error: 'prompt cannot be empty or whitespace' };
  }
  if (prompt.length > 2000) {
    return { valid: false, error: 'prompt must be <= 2000 characters' };
  }
  return { valid: true };
}

// POST /api/generate-from-prompt
// Accept: { prompt: string, style?: string, seed?: number }
// Return: 202 { jobId } or 402 { error, requiredCredits, availableCredits }
router.post('/api/generate-from-prompt', authOptional, async (req, res) => {
  const { prompt, style, seed } = req.body;
  const userId = req.user?.userId || null;

  try {
    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      logger.warn(`Invalid prompt: ${validation.error}`);
      return res.status(400).json({ error: 'invalid_prompt', message: validation.error });
    }

    // Check credits if user is authenticated
    if (userId) {
      if (!hasEnoughCredits(userId, JOB_COST)) {
        logger.warn(`Insufficient credits for user ${userId}`);
        return res.status(402).json({
          error: 'insufficient_credits',
          message: `Insufficient credits. Required: ${JOB_COST}`,
          requiredCredits: JOB_COST,
          availableCredits: require('../credits/credits').getUserCredits(userId)
        });
      }
    }

    // Sanitize prompt
    const sanitized = sanitizePrompt(prompt);

    // Generate jobId
    const jobId = uuidv4();
    const now = new Date().toISOString();

    logger.info(`Creating job ${jobId} from prompt: ${sanitized.substring(0, 50)}...`);

    // Insert job in DB with file_path=null (no uploaded file)
    const insert = db.prepare(`
      INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(jobId, null, null, sanitized, 'queued', 0, userId, now, now);
    logger.info(`Job ${jobId} inserted into database`);

    // Deduct credits if user is authenticated
    if (userId) {
      const deductResult = deductCredits(userId, JOB_COST, jobId, 'job_creation');
      if (!deductResult.success) {
        logger.error(`Failed to deduct credits for job ${jobId}: ${deductResult.error}`);
        // Still continue - job is created, credits will be handled separately
      }
    }

    // Publish to RabbitMQ queue
    let conn, ch;
    try {
      const rabbit = await getRabbitChannel();
      conn = rabbit.conn;
      ch = rabbit.ch;

      const payload = {
        jobId,
        prompt: sanitized,
        style: style || null,
        seed: seed || null,
        testFileUrl: TEST_FILE_URL,
        userId: userId || null
      };

      ch.sendToQueue('mangamotion_jobs', Buffer.from(JSON.stringify(payload)), { persistent: true });
      logger.info(`Job ${jobId} published to queue`);

      // Close connection after a short delay
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

    // Return 202 Accepted
    return res.status(202).json({ jobId });
  } catch (err) {
    logger.error(`Generate-from-prompt error: ${err.message}`, err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
