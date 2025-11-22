import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { queueAdd } from '../queue/queues.js';
import { config } from '../config.js';

const router = express.Router();

// Ensure uploads dir exists
try { fs.mkdirSync(config.uploadsDir, { recursive: true }); } catch (_) {}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, config.uploadsDir); },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.array('pages', 50), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files' });
  const files = req.files.map(f => f.path);
  try {
    const job = await queueAdd('ai-job', { files, options: { fps: 12, style: 'lite' } });
    return res.json({ jobId: job.id });
  } catch (e) {
    console.error('Queue add failed', e);
    return res.status(500).json({ error: 'Queue error' });
  }
});

export default router;
