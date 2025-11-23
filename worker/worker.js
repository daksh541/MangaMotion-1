// worker/worker.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const amqplib = require('amqplib');
const Minio = require('minio');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'mangamotion';
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', 'db.sqlite3');

const db = new Database(dbFile);

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT?.split('://')[1]?.split(':')[0] || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || process.env.S3_ENDPOINT?.split(':')[2] || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true' || process.env.S3_ENDPOINT?.startsWith('https'),
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_KEY || 'minioadmin'
});

async function start() {
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672';
  
  try {
    const conn = await amqplib.connect(rabbitUrl);
    const ch = await conn.createChannel();
    await ch.assertQueue('mangamotion_jobs', { durable: true });
    console.log('[Worker] Connected to RabbitMQ, waiting for jobs...');

    ch.consume('mangamotion_jobs', async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        const { jobId, filePath, prompt } = data;
        console.log(`[Worker] Received job ${jobId}`);
        console.log(`[Worker]   - File: ${filePath}`);
        console.log(`[Worker]   - Prompt: ${prompt || '(none)'}`);

        // Update job -> processing
        const now = new Date().toISOString();
        db.prepare('UPDATE jobs SET status = ?, progress = ?, updated_at = ? WHERE id = ?').run(
          'processing',
          10,
          now,
          jobId
        );
        console.log(`[Worker] Job ${jobId} marked as processing`);

        // Download input from MinIO to local temp
        const tempDir = path.join(__dirname, 'tmp_worker');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const ext = path.extname(filePath);
        const localInput = path.join(tempDir, `${jobId}_input${ext}`);

        console.log(`[Worker] Downloading ${filePath} to ${localInput}`);
        await new Promise((resolve, reject) => {
          minioClient.fGetObject(BUCKET, filePath, localInput, function (err) {
            if (err) return reject(err);
            resolve();
          });
        });
        console.log(`[Worker] Download complete`);

        // Simulate processing work (replace with real AI pipeline)
        console.log(`[Worker] Simulating processing for job ${jobId}...`);
        for (const p of [30, 50, 70, 90]) {
          db.prepare('UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?').run(
            p,
            new Date().toISOString(),
            jobId
          );
          console.log(`[Worker] Job ${jobId} progress: ${p}%`);
          await new Promise(r => setTimeout(r, 1000));
        }

        // Simulate output: upload to outputs/<jobId>/video.mp4
        const outKey = `outputs/${jobId}/video.mp4`;
        let toUpload = localInput;

        // If input is not video, create a placeholder (for demo)
        if (!['.mp4', '.mov'].includes(ext.toLowerCase())) {
          const fakeOut = path.join(tempDir, `${jobId}_out.mp4`);
          fs.copyFileSync(localInput, fakeOut);
          toUpload = fakeOut;
          console.log(`[Worker] Created placeholder output: ${fakeOut}`);
        }

        console.log(`[Worker] Uploading result to ${outKey}`);
        await minioClient.fPutObject(BUCKET, outKey, toUpload);
        console.log(`[Worker] Upload complete`);

        // Cleanup temp files
        try {
          fs.unlinkSync(localInput);
        } catch (e) {
          // ignore
        }
        if (toUpload !== localInput) {
          try {
            fs.unlinkSync(toUpload);
          } catch (e) {
            // ignore
          }
        }

        // Mark completed
        db.prepare('UPDATE jobs SET status = ?, progress = ?, result_path = ?, updated_at = ? WHERE id = ?').run(
          'completed',
          100,
          outKey,
          new Date().toISOString(),
          jobId
        );

        console.log(`[Worker] Job ${jobId} completed. Result: ${outKey}`);
        ch.ack(msg);
      } catch (err) {
        console.error(`[Worker] Processing error:`, err.message);
        try {
          const payload = JSON.parse(msg.content.toString());
          const jobId = payload.jobId;
          db.prepare('UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?').run(
            'failed',
            String(err.stack || err.message),
            new Date().toISOString(),
            jobId
          );
          console.log(`[Worker] Job ${jobId} marked as failed`);
        } catch (e) {
          // ignore
        }
        // Nack without requeue to avoid infinite loop
        ch.nack(msg, false, false);
      }
    }, { noAck: false });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('[Worker] Shutting down...');
      ch.close();
      conn.close();
      db.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('[Worker] Fatal error:', err);
    process.exit(1);
  }
}

start();
