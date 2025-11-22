// Run this as a separate Node process (or add to a Worker wrapper) so it consumes jobs and spawns the Python worker.
const { Worker } = require('bullmq');
const { execFile } = require('child_process');
const path = require('path');
const config = require('../../config');
const { connection } = require('../queues');

const worker = new Worker('ai-job', async job => {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(process.cwd(), '..', 'python-worker', 'worker_main.py');
    const args = [JSON.stringify(job.data)];
    const proc = execFile('python3', [pythonPath, ...args], { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) {
        console.error('python worker error', err, stderr);
        return reject(err);
      }
      // parse final OUTPUT: line at end like "OUTPUT:/outputs/result_123.mp4"
      return resolve({ stdout });
    });

    proc.stdout.on('data', d => {
      const s = d.toString();
      // example: PROGRESS:40 or STAGE:colorizing
      const m = s.match(/PROGRESS:(\d+)/);
      if (m) job.updateProgress(parseInt(m[1]));
    });

    proc.on('error', e => reject(e));
  });
}, { connection, concurrency: 1 });

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
console.log('AI worker started');
