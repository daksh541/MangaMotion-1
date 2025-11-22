import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

/**
 * Bottleneck Detection Load Test
 * 
 * Comprehensive test to identify specific infrastructure bottlenecks:
 * - MinIO IOPS limits (concurrent PUT/GET operations)
 * - Database connection pool exhaustion
 * - Worker queue saturation
 * - API response time degradation
 * 
 * This test ramps up gradually and monitors metrics to identify
 * where the system starts to degrade.
 */

// Infrastructure metrics
const apiResponseTime = new Trend('api_response_time_ms');
const minioUploadTime = new Trend('minio_upload_time_ms');
const dbQueryTime = new Trend('db_query_time_ms');
const queueDepth = new Gauge('queue_depth');
const activeWorkers = new Gauge('active_workers');
const cpuUsage = new Gauge('cpu_usage_percent');
const memoryUsage = new Gauge('memory_usage_percent');

// Error tracking
const apiErrors = new Counter('api_errors');
const minioErrors = new Counter('minio_errors');
const dbErrors = new Counter('db_errors');
const timeoutErrors = new Counter('timeout_errors');
const rateLimitHits = new Counter('rate_limit_hits');

// Success rates
const uploadSuccessRate = new Rate('upload_success_rate');
const statusCheckSuccessRate = new Rate('status_check_success_rate');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const METRICS_URL = __ENV.METRICS_URL || 'http://localhost:3000/api/metrics';
const INITIAL_USERS = parseInt(__ENV.INITIAL_USERS || '10', 10);
const MAX_USERS = parseInt(__ENV.MAX_USERS || '200', 10);
const RAMP_UP_STEP = parseInt(__ENV.RAMP_UP_STEP || '10', 10);
const STEP_DURATION = __ENV.STEP_DURATION || '2m';
const FILE_SIZE_KB = parseInt(__ENV.FILE_SIZE_KB || '100', 10);

export const options = {
  stages: generateStages(),
  thresholds: {
    'upload_success_rate': ['p(95) >= 0.95'],
    'http_req_failed': ['rate < 0.05'],
  },
};

/**
 * Generate stages that ramp up gradually
 */
function generateStages() {
  const stages = [];
  for (let users = INITIAL_USERS; users <= MAX_USERS; users += RAMP_UP_STEP) {
    stages.push({ duration: STEP_DURATION, target: users });
  }
  stages.push({ duration: '30s', target: 0 });
  return stages;
}

function generateFakeImage(sizeKb) {
  const buffer = new Uint8Array(sizeKb * 1024);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

/**
 * Fetch metrics from the backend
 */
function fetchMetrics() {
  try {
    const response = http.get(METRICS_URL, { timeout: '5s' });
    if (response.status === 200) {
      const metrics = response.json();
      return metrics;
    }
  } catch (e) {
    console.error(`Failed to fetch metrics: ${e}`);
  }
  return null;
}

export default function () {
  group('Bottleneck Detection', () => {
    const userId = `user-${__VU}-${__ITER}`;
    const fileData = generateFakeImage(FILE_SIZE_KB);

    // Fetch current metrics
    const metricsStart = Date.now();
    const metrics = fetchMetrics();
    const metricsEnd = Date.now();

    if (metrics) {
      // Track infrastructure metrics
      if (metrics.queue_depth !== undefined) {
        queueDepth.add(metrics.queue_depth);
      }
      if (metrics.active_workers !== undefined) {
        activeWorkers.add(metrics.active_workers);
      }
      if (metrics.cpu_usage !== undefined) {
        cpuUsage.add(metrics.cpu_usage);
      }
      if (metrics.memory_usage !== undefined) {
        memoryUsage.add(metrics.memory_usage);
      }
    }

    // Test 1: API Upload Performance
    group('API Upload', () => {
      const uploadStart = Date.now();
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
      const uploadEnd = Date.now();
      const uploadDuration = uploadEnd - uploadStart;
      apiResponseTime.add(uploadDuration);

      const uploadOk = check(uploadResponse, {
        'upload status 200': (r) => r.status === 200,
        'has jobId': (r) => r.json('jobId') !== undefined,
      });

      if (uploadOk) {
        uploadSuccessRate.add(1);
        const jobId = uploadResponse.json('jobId');

        // Test 2: Status Check Performance
        sleep(0.5);
        const statusStart = Date.now();
        const statusResponse = http.get(`${BASE_URL}/api/status/${jobId}`, {
          timeout: '10s',
        });
        const statusEnd = Date.now();
        dbQueryTime.add(statusEnd - statusStart);

        const statusOk = check(statusResponse, {
          'status check 200': (r) => r.status === 200,
          'has status': (r) => r.json('status') !== undefined,
        });

        if (statusOk) {
          statusCheckSuccessRate.add(1);
        } else {
          dbErrors.add(1);
        }
      } else {
        uploadSuccessRate.add(0);
        if (uploadResponse.status === 429) {
          rateLimitHits.add(1);
        } else if (uploadResponse.status >= 500) {
          apiErrors.add(1);
        } else if (uploadResponse.status === 0) {
          timeoutErrors.add(1);
        }
      }
    });

    sleep(0.1);
  });
}

export function teardown(data) {
  console.log('\n=== Bottleneck Detection Summary ===');
  console.log(`API Errors: ${apiErrors.value}`);
  console.log(`MinIO Errors: ${minioErrors.value}`);
  console.log(`DB Errors: ${dbErrors.value}`);
  console.log(`Timeout Errors: ${timeoutErrors.value}`);
  console.log(`Rate Limit Hits: ${rateLimitHits.value}`);
  console.log(`Upload Success Rate: ${(uploadSuccessRate.value * 100).toFixed(2)}%`);
  console.log(`Status Check Success Rate: ${(statusCheckSuccessRate.value * 100).toFixed(2)}%`);
  console.log('\n=== Recommendations ===');
  
  if (apiErrors.value > 0) {
    console.log('⚠️  API Errors detected - check backend logs for details');
  }
  if (minioErrors.value > 0) {
    console.log('⚠️  MinIO Errors detected - may indicate IOPS bottleneck');
  }
  if (dbErrors.value > 0) {
    console.log('⚠️  Database Errors detected - may indicate connection pool exhaustion');
  }
  if (rateLimitHits.value > 0) {
    console.log('⚠️  Rate limits hit - consider increasing RATE_LIMIT_JOBS_PER_MINUTE');
  }
  if (uploadSuccessRate.value < 0.95) {
    console.log('⚠️  Upload success rate < 95% - system under stress');
  }
}
