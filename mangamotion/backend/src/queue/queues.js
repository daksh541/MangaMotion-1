const { Queue, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config');
const connection = new IORedis(config.REDIS_URL);

// AI processing queue
const aiQueue = new Queue('ai-job', { connection });
new QueueScheduler('ai-job', { connection });

// Malware scanning queue
const scanQueue = new Queue('scan-job', { connection });
new QueueScheduler('scan-job', { connection });

async function queueAdd(data) {
  return aiQueue.add('ai-job', data, { removeOnComplete: true, removeOnFail: false });
}

async function queueScan(parentJobId, files) {
  return scanQueue.add('scan-job', { parentJobId, files }, {
    removeOnComplete: true,
    removeOnFail: false,
    priority: 10 // High priority for security scans
  });
}

async function getJobStatus(jobId) {
  const job = await aiQueue.getJob(jobId);
  if (!job) return { status: 'not_found' };
  const state = await job.getState();
  const progress = typeof job.progress === 'number' ? job.progress : await job.progress;
  return {
    status: state,
    progress,
    data: job.data,
    failedReason: job.failedReason || null,
    returnvalue: job.returnvalue || null
  };
}

module.exports = { queueAdd, queueScan, getJobStatus, connection, aiQueue, scanQueue };
