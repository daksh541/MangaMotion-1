import express from 'express';
import { getJobStatus } from '../queue/queues.js';

const router = express.Router();

router.get('/status/:jobId', async (req, res) => {
  try {
    const status = await getJobStatus(req.params.jobId);
    res.json(status);
  } catch (e) {
    res.status(500).json({ state: 'error', error: String(e) });
  }
});

export default router;
