import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

/**
 * Worker Processing Load Test
 * 
 * Tests worker performance under load to identify:
 * - Worker CPU bottlenecks
 * - Database lock contention during job updates
 * - Queue processing throughput
 * - Job failure rates under load
 * 
 * Workflow:
 * 1. Create multiple jobs via upload
 * 2. Poll job status to track completion
 * 3. Measure processing time and failure rates
 */

const jobCreationDuration = new Trend('job_creation_duration_ms');
const jobCompletionTime = new Trend('job_completion_time_seconds');
const jobSuccessRate = new Rate('job_success_rate');
const jobFailureRate = new Rate('job_failure_rate');
const jobsInProgress = new Gauge('jobs_in_progress');
const jobsCompleted = new Counter('jobs_completed');
const jobsFailed = new Counter('jobs_failed');
const statusCheckDuration = new Trend('status_check_duration_ms');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(__ENV.CONCURRENT_USERS || '20', 10);
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '30s';
const STEADY_STATE_TIME = __ENV.STEADY_STATE_TIME || '5m';
const FILE_SIZE_KB = parseInt(__ENV.FILE_SIZE_KB || '100', 10);
const MAX_POLL_ATTEMPTS = parseInt(__ENV.MAX_POLL_ATTEMPTS || '60', 10);
const POLL_INTERVAL_MS = parseInt(__ENV.POLL_INTERVAL_MS || '1000', 10);

export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: CONCURRENT_USERS },
    { duration: STEADY_STATE_TIME, target: CONCURRENT_USERS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'job_success_rate': ['p(95) >= 0.95'],
    'job_completion_time_seconds': ['p(95) < 120'], // 95th percentile < 2 minutes
    'http_req_failed': ['rate < 0.05'],
  },
};

function generateFakeImage(sizeKb) {
  const buffer = new Uint8Array(sizeKb * 1024);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

export default function () {
  group('Worker Processing', () => {
    const userId = `user-${__VU}-${__ITER}`;
    const fileData = generateFakeImage(FILE_SIZE_KB);

    // Step 1: Create job via upload
    const creationStart = Date.now();
    const uploadResponse = http.post(
      `${BASE_URL}/api/upload`,
      fileData,
      {
        headers: {
          'X-User-ID': userId,
          'Content-Type': 'application/octet-stream',
        },
        timeout: '30s',
      }
    );
    const creationEnd = Date.now();
    jobCreationDuration.add(creationEnd - creationStart);

    const creationOk = check(uploadResponse, {
      'upload status 200': (r) => r.status === 200,
      'has jobId': (r) => r.json('jobId') !== undefined,
    });

    if (!creationOk) {
      jobFailureRate.add(1);
      jobsFailed.add(1);
      return;
    }

    const jobId = uploadResponse.json('jobId');
    jobsInProgress.add(1);
    const jobStartTime = Date.now();

    // Step 2: Poll job status until completion or timeout
    let jobCompleted = false;
    let jobStatus = 'pending';
    let pollAttempts = 0;

    while (pollAttempts < MAX_POLL_ATTEMPTS && !jobCompleted) {
      sleep(POLL_INTERVAL_MS / 1000);

      const statusStart = Date.now();
      const statusResponse = http.get(`${BASE_URL}/api/status/${jobId}`, {
        timeout: '10s',
      });
      const statusEnd = Date.now();
      statusCheckDuration.add(statusEnd - statusStart);

      if (statusResponse.status === 200) {
        jobStatus = statusResponse.json('status');
        
        if (jobStatus === 'completed' || jobStatus === 'done') {
          jobCompleted = true;
          jobSuccessRate.add(1);
          jobsCompleted.add(1);
        } else if (jobStatus === 'failed') {
          jobCompleted = true;
          jobFailureRate.add(1);
          jobsFailed.add(1);
        }
      }

      pollAttempts++;
    }

    // Record completion time
    const jobEndTime = Date.now();
    const completionTime = (jobEndTime - jobStartTime) / 1000;
    jobCompletionTime.add(completionTime);

    // If job didn't complete within timeout, mark as failure
    if (!jobCompleted) {
      jobFailureRate.add(1);
      jobsFailed.add(1);
    }

    jobsInProgress.add(-1);
  });
}

export function teardown(data) {
  console.log('=== Worker Processing Test Summary ===');
  console.log(`Jobs completed: ${jobsCompleted.value}`);
  console.log(`Jobs failed: ${jobsFailed.value}`);
  console.log(`Success rate: ${(jobSuccessRate.value * 100).toFixed(2)}%`);
  console.log(`Failure rate: ${(jobFailureRate.value * 100).toFixed(2)}%`);
}
