/**
 * Integration Tests for MangaMotion Backend
 * 
 * Tests the complete flow:
 * - POST /api/presign → presign endpoint
 * - POST /api/upload → upload endpoint
 * - GET /api/status/:jobId → status endpoint
 * - Worker processing
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('./queue/queues');
jest.mock('./s3');
jest.mock('./rate-limiter');
jest.mock('./tracing');

const { queueAdd, queueScan, getJobStatus } = require('./queue/queues');
const { createPresign } = require('./s3');
const { rateLimitMiddleware } = require('./rate-limiter');

describe('MangaMotion Backend API', () => {
  let app;
  let testDir;

  beforeAll(() => {
    // Create test directory
    testDir = path.join(__dirname, '..', 'test-uploads');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Set test environment
    process.env.UPLOAD_DIR = testDir;
    process.env.TRACING_ENABLED = 'false';
    process.env.LOG_LEVEL = 'error';

    // Import app after env setup
    app = require('./server');
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock rate limiter to allow all requests
    rateLimitMiddleware.mockImplementation((req, res, next) => next());
  });

  describe('POST /api/presign', () => {
    test('should return presigned URL for valid request', async () => {
      const mockUrl = 'https://s3.amazonaws.com/bucket/key?signature=xyz';
      createPresign.mockResolvedValue({
        url: mockUrl,
        expiresIn: 600
      });

      const response = await request(app)
        .post('/api/presign')
        .send({
          filename: 'test.jpg',
          contentType: 'image/jpeg',
          fileSizeBytes: 1024000
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.url).toBe(mockUrl);
      expect(response.body.expiresIn).toBe(600);
    });

    test('should reject presign with missing fields', async () => {
      const response = await request(app)
        .post('/api/presign')
        .send({
          filename: 'test.jpg'
          // missing contentType and fileSizeBytes
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject presign with invalid extension', async () => {
      const response = await request(app)
        .post('/api/presign')
        .send({
          filename: 'test.txt',
          contentType: 'text/plain',
          fileSizeBytes: 1024000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('extension');
    });

    test('should reject presign with invalid content type', async () => {
      const response = await request(app)
        .post('/api/presign')
        .send({
          filename: 'test.pdf',
          contentType: 'application/pdf',
          fileSizeBytes: 1024000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content type');
    });

    test('should reject presign with file too large', async () => {
      const response = await request(app)
        .post('/api/presign')
        .send({
          filename: 'test.jpg',
          contentType: 'image/jpeg',
          fileSizeBytes: 200 * 1024 * 1024 // 200MB, exceeds 100MB limit
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('size');
    });

    test('should handle S3 errors gracefully', async () => {
      createPresign.mockRejectedValue(new Error('S3 connection failed'));

      const response = await request(app)
        .post('/api/presign')
        .send({
          filename: 'test.jpg',
          contentType: 'image/jpeg',
          fileSizeBytes: 1024000
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    test('should accept various valid image formats', async () => {
      createPresign.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        expiresIn: 600
      });

      const formats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      const contentTypes = [
        'image/jpeg',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp'
      ];

      for (let i = 0; i < formats.length; i++) {
        const response = await request(app)
          .post('/api/presign')
          .send({
            filename: `test.${formats[i]}`,
            contentType: contentTypes[i],
            fileSizeBytes: 1024000
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('url');
      }
    });

    test('should accept various valid video formats', async () => {
      createPresign.mockResolvedValue({
        url: 'https://s3.amazonaws.com/bucket/key',
        expiresIn: 600
      });

      const formats = ['mp4', 'avi', 'mov', 'mkv'];
      const contentTypes = [
        'video/mp4',
        'video/x-msvideo',
        'video/quicktime',
        'video/x-matroska'
      ];

      for (let i = 0; i < formats.length; i++) {
        const response = await request(app)
          .post('/api/presign')
          .send({
            filename: `test.${formats[i]}`,
            contentType: contentTypes[i],
            fileSizeBytes: 5 * 1024 * 1024
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('url');
      }
    });
  });

  describe('POST /api/upload', () => {
    test('should create job for valid file upload', async () => {
      const mockJobId = uuidv4();
      queueAdd.mockResolvedValue({ id: mockJobId });
      queueScan.mockResolvedValue({ id: uuidv4() });

      // Create a test file
      const testFile = path.join(testDir, 'test.jpg');
      fs.writeFileSync(testFile, Buffer.from('fake image data'));

      const response = await request(app)
        .post('/api/upload')
        .set('X-User-ID', 'user-123')
        .attach('pages', testFile);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.jobId).toBe(mockJobId);
      expect(queueAdd).toHaveBeenCalled();
    });

    test('should reject upload with no files', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('X-User-ID', 'user-123');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No files');
    });

    test('should queue scan job after upload', async () => {
      const mockJobId = uuidv4();
      const mockScanJobId = uuidv4();
      queueAdd.mockResolvedValue({ id: mockJobId });
      queueScan.mockResolvedValue({ id: mockScanJobId });

      const testFile = path.join(testDir, 'test2.jpg');
      fs.writeFileSync(testFile, Buffer.from('fake image data'));

      const response = await request(app)
        .post('/api/upload')
        .set('X-User-ID', 'user-456')
        .attach('pages', testFile);

      expect(response.status).toBe(200);
      expect(queueScan).toHaveBeenCalledWith(mockJobId, expect.any(Array));
    });

    test('should handle upload with multiple files', async () => {
      const mockJobId = uuidv4();
      queueAdd.mockResolvedValue({ id: mockJobId });
      queueScan.mockResolvedValue({ id: uuidv4() });

      // Create multiple test files
      const testFile1 = path.join(testDir, 'test3.jpg');
      const testFile2 = path.join(testDir, 'test4.jpg');
      fs.writeFileSync(testFile1, Buffer.from('fake image 1'));
      fs.writeFileSync(testFile2, Buffer.from('fake image 2'));

      const response = await request(app)
        .post('/api/upload')
        .set('X-User-ID', 'user-789')
        .attach('pages', testFile1)
        .attach('pages', testFile2);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
      expect(queueAdd).toHaveBeenCalled();
    });

    test('should use anonymous user ID if not provided', async () => {
      const mockJobId = uuidv4();
      queueAdd.mockResolvedValue({ id: mockJobId });
      queueScan.mockResolvedValue({ id: uuidv4() });

      const testFile = path.join(testDir, 'test5.jpg');
      fs.writeFileSync(testFile, Buffer.from('fake image data'));

      const response = await request(app)
        .post('/api/upload')
        .attach('pages', testFile);

      expect(response.status).toBe(200);
      const callArgs = queueAdd.mock.calls[0][0];
      expect(callArgs.user_id).toBe('anonymous');
    });

    test('should handle queue errors gracefully', async () => {
      queueAdd.mockRejectedValue(new Error('Queue connection failed'));

      const testFile = path.join(testDir, 'test6.jpg');
      fs.writeFileSync(testFile, Buffer.from('fake image data'));

      const response = await request(app)
        .post('/api/upload')
        .set('X-User-ID', 'user-999')
        .attach('pages', testFile);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/status/:jobId', () => {
    test('should return job status', async () => {
      const mockStatus = {
        status: 'processing',
        progress: 50,
        data: { type: 'process_manga' },
        failedReason: null,
        returnvalue: null
      };
      getJobStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/status/job-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
    });

    test('should return not_found for non-existent job', async () => {
      getJobStatus.mockResolvedValue({ status: 'not_found' });

      const response = await request(app)
        .get('/api/status/non-existent-job');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('not_found');
    });

    test('should handle status query errors', async () => {
      getJobStatus.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/status/job-456');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /metrics', () => {
    test('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics');

      expect(response.status).toBe(200);
      expect(response.type).toContain('text/plain');
      expect(response.text).toContain('job_processed_total');
    });
  });

  describe('GET /api/metrics', () => {
    test('should return JSON metrics', async () => {
      const response = await request(app)
        .get('/api/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('counters');
      expect(response.body).toHaveProperty('gauges');
      expect(response.body).toHaveProperty('histograms');
    });
  });

  describe('End-to-End Flow', () => {
    test('should complete full flow: presign → upload → status', async () => {
      // Step 1: Presign
      const mockPresignUrl = 'https://s3.amazonaws.com/bucket/key';
      createPresign.mockResolvedValue({
        url: mockPresignUrl,
        expiresIn: 600
      });

      const presignResponse = await request(app)
        .post('/api/presign')
        .send({
          filename: 'flow-test.jpg',
          contentType: 'image/jpeg',
          fileSizeBytes: 1024000
        });

      expect(presignResponse.status).toBe(200);
      expect(presignResponse.body).toHaveProperty('key');
      const s3Key = presignResponse.body.key;

      // Step 2: Upload
      const mockJobId = uuidv4();
      queueAdd.mockResolvedValue({ id: mockJobId });
      queueScan.mockResolvedValue({ id: uuidv4() });

      const testFile = path.join(testDir, 'flow-test.jpg');
      fs.writeFileSync(testFile, Buffer.from('fake image data'));

      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('X-User-ID', 'flow-user')
        .attach('pages', testFile);

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body).toHaveProperty('jobId');
      const jobId = uploadResponse.body.jobId;

      // Step 3: Check status
      const mockStatus = {
        status: 'processing',
        progress: 25,
        data: { type: 'process_manga' },
        failedReason: null,
        returnvalue: null
      };
      getJobStatus.mockResolvedValue(mockStatus);

      const statusResponse = await request(app)
        .get(`/api/status/${jobId}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe('processing');
    });
  });
});
