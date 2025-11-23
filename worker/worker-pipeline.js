// worker/worker-pipeline.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const amqplib = require('amqplib');
const Minio = require('minio');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { Pipeline } = require('./pipeline');
const { createModelAdapter } = require('./model-adapter');

const BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'mangamotion';
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', 'db.sqlite3');
const MODEL_ADAPTER_TYPE = process.env.MODEL_ADAPTER_TYPE || 'mock';

const db = new Database(dbFile);

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT?.split('://')[1]?.split(':')[0] || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || process.env.S3_ENDPOINT?.split(':')[2] || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true' || process.env.S3_ENDPOINT?.startsWith('https'),
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_KEY || 'minioadmin'
});

// Create temp directories
const tempDir = path.join(__dirname, 'tmp_worker');
const outputDir = path.join(tempDir, 'outputs');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

/**
 * Download file from MinIO or local filesystem
 */
async function downloadFile(source, destination) {
  return new Promise((resolve, reject) => {
    if (source.startsWith('/')) {
      // Local file
      if (!fs.existsSync(source)) {
        return reject(new Error(`Local file not found: ${source}`));
      }
      fs.copyFileSync(source, destination);
      resolve();
    } else {
      // MinIO file
      minioClient.fGetObject(BUCKET, source, destination, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }
  });
}

/**
 * Upload file to MinIO
 */
async function uploadFile(filePath, minioKey) {
  return new Promise((resolve, reject) => {
    minioClient.fPutObject(BUCKET, minioKey, filePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Process job using pipeline
 */
async function processJob(jobId, filePath, prompt, testFileUrl, style, seed) {
  console.log(`\n[Pipeline Worker] Processing job ${jobId}`);

  const tempJobDir = path.join(tempDir, jobId);
  const tempOutputDir = path.join(tempJobDir, 'output');
  const tempThumbnailDir = path.join(tempJobDir, 'thumbnails');

  if (!fs.existsSync(tempJobDir)) fs.mkdirSync(tempJobDir, { recursive: true });
  if (!fs.existsSync(tempOutputDir)) fs.mkdirSync(tempOutputDir, { recursive: true });
  if (!fs.existsSync(tempThumbnailDir)) fs.mkdirSync(tempThumbnailDir, { recursive: true });

  try {
    // Determine input file
    const sourceFile = filePath || testFileUrl;
    const ext = path.extname(sourceFile);
    const localInput = path.join(tempJobDir, `input${ext}`);

    console.log(`[Pipeline Worker] Downloading input: ${sourceFile}`);
    await downloadFile(sourceFile, localInput);

    // Create pipeline
    const modelAdapter = createModelAdapter({
      type: MODEL_ADAPTER_TYPE,
      pythonScript: path.join(__dirname, 'model.py')
    });

    const pipeline = new Pipeline(jobId, modelAdapter);

    // Define output paths
    const videoOutput = path.join(tempOutputDir, 'video.mp4');
    const videoKey = `outputs/${jobId}/video.mp4`;
    const thumbnailKey = `outputs/${jobId}/thumb.jpg`;

    // Execute pipeline
    console.log(`[Pipeline Worker] Starting pipeline stages...`);
    const result = await pipeline.execute(
      localInput,
      prompt,
      style,
      seed,
      videoOutput,
      tempThumbnailDir
    );

    if (!result.success) {
      throw new Error(`Pipeline failed: ${result.error}`);
    }

    // Upload video to MinIO
    console.log(`[Pipeline Worker] Uploading video to MinIO: ${videoKey}`);
    await uploadFile(videoOutput, videoKey);

    // Upload thumbnail if exists
    const thumbPath = path.join(tempThumbnailDir, 'thumb.jpg');
    if (fs.existsSync(thumbPath)) {
      console.log(`[Pipeline Worker] Uploading thumbnail to MinIO: ${thumbnailKey}`);
      await uploadFile(thumbPath, thumbnailKey);
    }

    // Update job as completed
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE jobs SET status = ?, progress = ?, result_path = ?, updated_at = ? WHERE id = ?
    `).run('completed', 100, videoKey, now, jobId);

    console.log(`[Pipeline Worker] Job ${jobId} completed successfully`);
    console.log(`[Pipeline Worker] Video: ${videoKey}`);
    console.log(`[Pipeline Worker] Thumbnail: ${thumbnailKey}`);

    return { success: true };
  } catch (err) {
    console.error(`[Pipeline Worker] Job ${jobId} failed: ${err.message}`);
    console.error(err.stack);

    // Update job as failed
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?
    `).run('failed', String(err.stack || err.message), now, jobId);

    return { success: false, error: err.message };
  } finally {
    // Cleanup temp files
    try {
      const tempJobDir = path.join(tempDir, jobId);
      if (fs.existsSync(tempJobDir)) {
        fs.rmSync(tempJobDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn(`Failed to cleanup temp files: ${e.message}`);
    }
  }
}

/**
 * Start worker
 */
async function start() {
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672';

  try {
    const conn = await amqplib.connect(rabbitUrl);
    const ch = await conn.createChannel();
    await ch.assertQueue('mangamotion_jobs', { durable: true });

    console.log(`[Pipeline Worker] Connected to RabbitMQ`);
    console.log(`[Pipeline Worker] Model adapter: ${MODEL_ADAPTER_TYPE}`);
    console.log(`[Pipeline Worker] Waiting for jobs...`);

    ch.consume('mangamotion_jobs', async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        const { jobId, filePath, prompt, testFileUrl, style, seed } = data;

        console.log(`\n[Pipeline Worker] Received job ${jobId}`);
        console.log(`[Pipeline Worker]   - File: ${filePath || '(none - prompt-only)'}`);
        console.log(`[Pipeline Worker]   - Prompt: ${prompt || '(none)'}`);
        console.log(`[Pipeline Worker]   - Style: ${style || '(default)'}`);
        console.log(`[Pipeline Worker]   - Seed: ${seed || '(random)'}`);

        // Mark as processing
        const now = new Date().toISOString();
        db.prepare('UPDATE jobs SET status = ?, progress = ?, updated_at = ? WHERE id = ?').run(
          'processing',
          10,
          now,
          jobId
        );

        // Process job
        const result = await processJob(jobId, filePath, prompt, testFileUrl, style, seed);

        if (result.success) {
          ch.ack(msg);
        } else {
          // Nack without requeue to avoid infinite loop
          ch.nack(msg, false, false);
        }
      } catch (err) {
        console.error(`[Pipeline Worker] Unexpected error:`, err.message);
        ch.nack(msg, false, false);
      }
    }, { noAck: false });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[Pipeline Worker] Shutting down...');
      ch.close();
      conn.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('[Pipeline Worker] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
