import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Presign + S3 Upload Load Test
 * 
 * Tests the presign endpoint and S3 direct uploads to identify:
 * - MinIO IOPS bottlenecks during concurrent uploads
 * - Presign URL generation performance
 * - S3 PUT operation throughput
 * 
 * Workflow:
 * 1. Get presigned URL from /api/presign
 * 2. Upload file directly to MinIO via presigned URL
 * 3. Poll job status
 */

const presignDuration = new Trend('presign_duration_ms');
const s3UploadDuration = new Trend('s3_upload_duration_ms');
const presignSuccess = new Rate('presign_success_rate');
const s3UploadSuccess = new Rate('s3_upload_success_rate');
const presignErrors = new Counter('presign_errors');
const s3UploadErrors = new Counter('s3_upload_errors');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const S3_ENDPOINT = __ENV.S3_ENDPOINT || 'http://localhost:9000';
const CONCURRENT_USERS = parseInt(__ENV.CONCURRENT_USERS || '30', 10);
const RAMP_UP_TIME = __ENV.RAMP_UP_TIME || '30s';
const STEADY_STATE_TIME = __ENV.STEADY_STATE_TIME || '5m';
const FILE_SIZE_KB = parseInt(__ENV.FILE_SIZE_KB || '500', 10);

export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: CONCURRENT_USERS },
    { duration: STEADY_STATE_TIME, target: CONCURRENT_USERS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'presign_success_rate': ['p(95) >= 0.95'],
    's3_upload_success_rate': ['p(95) >= 0.95'],
    'presign_duration_ms': ['p(95) < 1000'],
    's3_upload_duration_ms': ['p(95) < 10000'],
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
  group('Presign Workflow', () => {
    const userId = `user-${__VU}-${__ITER}`;
    const filename = `test-${__VU}-${__ITER}.jpg`;
    const fileData = generateFakeImage(FILE_SIZE_KB);
    const fileSizeBytes = fileData.length;

    // Step 1: Get presigned URL
    const presignStart = Date.now();
    const presignResponse = http.post(
      `${BASE_URL}/api/presign`,
      JSON.stringify({
        filename,
        contentType: 'image/jpeg',
        fileSizeBytes,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        timeout: '10s',
      }
    );
    const presignEnd = Date.now();
    presignDuration.add(presignEnd - presignStart);

    const presignOk = check(presignResponse, {
      'presign status 200': (r) => r.status === 200,
      'has presigned URL': (r) => r.json('url') !== undefined,
      'has key': (r) => r.json('key') !== undefined,
    });

    if (!presignOk) {
      presignErrors.add(1);
      presignSuccess.add(0);
      return;
    }
    presignSuccess.add(1);

    const presignedUrl = presignResponse.json('url');
    const objectKey = presignResponse.json('key');

    // Step 2: Upload to S3 via presigned URL
    const s3Start = Date.now();
    const s3Response = http.put(presignedUrl, fileData, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
      timeout: '30s',
    });
    const s3End = Date.now();
    s3UploadDuration.add(s3End - s3Start);

    const s3Ok = check(s3Response, {
      's3 status 200': (r) => r.status === 200,
    });

    if (s3Ok) {
      s3UploadSuccess.add(1);
    } else {
      s3UploadErrors.add(1);
      s3UploadSuccess.add(0);
    }

    sleep(0.5);
  });
}

export function teardown(data) {
  console.log('=== Presign + S3 Upload Test Summary ===');
  console.log(`Presign success rate: ${(presignSuccess.value * 100).toFixed(2)}%`);
  console.log(`S3 upload success rate: ${(s3UploadSuccess.value * 100).toFixed(2)}%`);
  console.log(`Presign errors: ${presignErrors.value}`);
  console.log(`S3 upload errors: ${s3UploadErrors.value}`);
}
