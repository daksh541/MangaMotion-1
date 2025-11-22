import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

/**
 * Concurrent Upload Load Test
 * 
 * Tests the upload endpoint under concurrent load to identify:
 * - MinIO IOPS bottlenecks
 * - Database lock contention
 * - API response time degradation
 * - Job creation rate limits
 * 
 * Acceptance: System handles expected concurrency without >5% job failure
 */

// Custom metrics
const uploadDuration = new Trend('upload_duration_ms');
const uploadSuccess = new Rate('upload_success_rate');
const uploadFailure = new Rate('upload_failure_rate');
const jobsCreated = new Counter('jobs_created_total');
const concurrentUploads = new Gauge('concurrent_uploads');
const rateLimitErrors = new Counter('rate_limit_errors');
const validationErrors = new Counter('validation_errors');
const serverErrors = new Counter('server_errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(__ENV.CONCURRENT_USERS || '50', 10);
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '30s';
const STEADY_STATE_TIME = __ENV.STEADY_STATE_TIME || '5m';
const RAMP_DOWN_TIME = __ENV.RAMP_DOWN_TIME || '30s';
const FILE_SIZE_KB = parseInt(__ENV.FILE_SIZE_KB || '100', 10);

export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: CONCURRENT_USERS },
    { duration: STEADY_STATE_TIME, target: CONCURRENT_USERS },
    { duration: RAMP_DOWN_TIME, target: 0 },
  ],
  thresholds: {
    'upload_success_rate': ['p(95) >= 0.95'], // 95% success rate
    'upload_duration_ms': ['p(95) < 5000'],   // 95th percentile < 5s
    'http_req_failed': ['rate < 0.05'],       // <5% failure rate
  },
};

/**
 * Generate a fake image file (100KB by default)
 */
function generateFakeImage(sizeKb) {
  const buffer = new Uint8Array(sizeKb * 1024);
  // Fill with pseudo-random data
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

/**
 * Main test function
 */
export default function () {
  group('Upload Operations', () => {
    const userId = `user-${__VU}-${__ITER}`;
    const fileData = generateFakeImage(FILE_SIZE_KB);
    
    // Track concurrent uploads
    concurrentUploads.add(1);

    const uploadStart = Date.now();
    
    const response = http.post(
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

    const uploadEnd = Date.now();
    const duration = uploadEnd - uploadStart;
    uploadDuration.add(duration);

    // Check response status
    const isSuccess = check(response, {
      'status is 200': (r) => r.status === 200,
      'has jobId': (r) => r.json('jobId') !== undefined,
    });

    if (isSuccess) {
      uploadSuccess.add(1);
      jobsCreated.add(1);
    } else if (response.status === 429) {
      rateLimitErrors.add(1);
      uploadFailure.add(1);
    } else if (response.status === 400) {
      validationErrors.add(1);
      uploadFailure.add(1);
    } else if (response.status >= 500) {
      serverErrors.add(1);
      uploadFailure.add(1);
    } else {
      uploadFailure.add(1);
    }

    concurrentUploads.add(-1);
    
    // Small delay between requests
    sleep(0.1);
  });
}

/**
 * Teardown: Print summary
 */
export function teardown(data) {
  console.log('=== Upload Load Test Summary ===');
  console.log(`Total jobs created: ${jobsCreated.value}`);
  console.log(`Success rate: ${(uploadSuccess.value * 100).toFixed(2)}%`);
  console.log(`Rate limit errors: ${rateLimitErrors.value}`);
  console.log(`Validation errors: ${validationErrors.value}`);
  console.log(`Server errors: ${serverErrors.value}`);
}
