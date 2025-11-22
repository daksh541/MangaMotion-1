/**
 * Scan Worker - Malware scanning job processor
 * 
 * Processes scan jobs from the scan queue:
 * 1. Receives file paths to scan
 * 2. Runs ClamAV scan on each file
 * 3. Updates parent job status based on results
 * 4. Fails job if virus detected (goes to DLQ)
 * 
 * Job states:
 * - SCANNING: Scan in progress
 * - CLEAN: All files passed scan
 * - INFECTED: Virus detected (FAILED)
 */

const { Worker } = require('bullmq');
const { getScanner } = require('../../clamav-scanner');
const { connection, aiQueue } = require('../queues');
const config = require('../../config');
const { logger } = require('../../logger');
const { incrementCounter, recordHistogram } = require('../../metrics');
const { withSpan, setAttribute, recordException } = require('../../tracing');

const CONCURRENCY = parseInt(process.env.SCAN_WORKER_CONCURRENCY || '2', 10);

const scanWorker = new Worker(
  'scan-job',
  async (job) => {
    return withSpan('worker.scan', async () => {
      const startTime = Date.now();
      const { parentJobId, files } = job.data;

      setAttribute('job.id', job.id);
      setAttribute('job.parent_id', parentJobId);
      setAttribute('file.count', files.length);
      setAttribute('job.attempt', job.attemptsMade + 1);

      try {
        logger.logJob('scan_started', parentJobId, {
          file_count: files.length,
          attempt: job.attemptsMade + 1
        });

      // Update parent job status to SCANNING
      const parentJob = await aiQueue.getJob(parentJobId);
      if (parentJob) {
        await parentJob.updateProgress(5); // 5% - scanning started
      }

      // Get scanner instance
      const scanner = getScanner();

      // Check if ClamAV is available
      const available = await scanner.isAvailable();
      if (!available) {
        logger.warn('ClamAV unavailable, skipping scan', { job_id: parentJobId });
        incrementCounter('job_skipped_total');
        return {
          status: 'skipped',
          reason: 'ClamAV unavailable',
          files: files.map(f => ({ file: f, clean: true, skipped: true }))
        };
      }

      // Scan all files
      logger.info('Scanning files', { job_id: parentJobId, file_count: files.length });
      const scanResults = await scanner.checkFiles(files);

      // Update parent job progress
      if (parentJob) {
        await parentJob.updateProgress(20); // 20% - scan complete
      }

      // If any files are infected, fail the job
      if (!scanResults.allClean) {
        const errorMsg = scanResults.infected.length > 0
          ? `Virus detected: ${scanResults.infected.join('; ')}`
          : `Scan error: ${scanResults.errors.join('; ')}`;

        logger.error('Malware detected', {
          job_id: parentJobId,
          error: errorMsg,
          infected_files: scanResults.infected,
          attempts: job.attemptsMade + 1
        });

        incrementCounter('scan_infected_total');

        // Update parent job with error
        if (parentJob) {
          await parentJob.updateData({
            ...parentJob.data,
            scan_status: 'infected',
            scan_error: errorMsg,
            infected_files: scanResults.infected
          });
          // Set job to failed state
          await parentJob.moveToFailed(new Error(errorMsg), true);
        }

        // Fail the scan job (will go to DLQ)
        throw new Error(errorMsg);
      }

      logger.logJob('scan_complete', parentJobId, {
        status: 'clean',
        file_count: files.length
      });

      incrementCounter('scan_clean_total');

      // Update parent job status to indicate scan passed
      if (parentJob) {
        await parentJob.updateData({
          ...parentJob.data,
          scan_status: 'clean',
          scan_timestamp: new Date().toISOString()
        });
        await parentJob.updateProgress(20); // 20% - scan passed
      }

      const duration = (Date.now() - startTime) / 1000;
      recordHistogram('job_processing_seconds', duration);

      return {
        status: 'clean',
        filesScanned: files.length,
        results: scanResults.results
      };

    } catch (err) {
      logger.logJobFailed(parentJobId, err, job.attemptsMade + 1, {
        file_count: files.length
      });

      incrementCounter('job_failed_total');

      // Update parent job with error
      const parentJob = await aiQueue.getJob(parentJobId);
      if (parentJob) {
        await parentJob.updateData({
          ...parentJob.data,
          scan_status: 'error',
          scan_error: err.message
        });
      }

      throw err;
    }
    });
  },
  {
    connection,
    concurrency: CONCURRENCY,
    // Retry failed scans once
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  }
);

scanWorker.on('completed', (job) => {
  console.log(`[ScanWorker] Scan completed: ${job.id}`);
});

scanWorker.on('failed', (job, err) => {
  console.error(`[ScanWorker] Scan failed: ${job.id}`, err.message);
});

scanWorker.on('error', (err) => {
  console.error('[ScanWorker] Worker error:', err);
});

module.exports = { scanWorker };
