import { Worker } from 'bullmq';
import { execFile } from 'child_process';
import { connection } from '../queues.js';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '1', 10);

export const worker = new Worker(
  'ai-job',
  async (job) => {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(job.data);
      const args = ['python-worker/worker_main.py', payload];
      const proc = execFile('python3', args, { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve({ out: stdout });
      });
      proc.stdout.on('data', (d) => {
        const s = d.toString();
        const m = s.match(/PROGRESS:(\d+)/);
        if (m) job.updateProgress(parseInt(m[1], 10));
      });
    });
  },
  { connection, concurrency: CONCURRENCY }
);

worker.on('failed', (job, err) => {
  console.error('Job failed', job?.id, err);
});
worker.on('completed', (job) => {
  console.log('Job completed', job.id);
});
