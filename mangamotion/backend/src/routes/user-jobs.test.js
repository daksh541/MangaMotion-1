// backend/src/routes/user-jobs.test.js
const express = require('express');
const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

jest.mock('minio');

describe('User Jobs Routes', () => {
  let app;
  let dbFile;
  let accessToken;
  let userId;

  beforeAll(() => {
    // Create test database
    dbFile = path.join(__dirname, '..', '..', 'test_user_jobs_db.sqlite3');
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }

    process.env.DATABASE_FILE = dbFile;

    // Initialize database
    const db = new Database(dbFile);
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        credits INTEGER DEFAULT 100,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE jobs (
        id TEXT PRIMARY KEY,
        file_path TEXT,
        result_path TEXT,
        prompt TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        progress INTEGER DEFAULT 0,
        error TEXT,
        user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_jobs_user_id ON jobs(user_id);
      CREATE INDEX idx_jobs_status ON jobs(status);
    `);
    db.close();

    // Create Express app
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === 'valid-token') {
          req.user = { userId: 'test-user-123' };
        }
      }
      next();
    });

    // Load routes
    const userJobsRoutes = require('./user-jobs');
    app.use(userJobsRoutes);

    // Setup test data
    userId = 'test-user-123';
    accessToken = 'valid-token';

    // Insert test user
    const db2 = new Database(dbFile);
    db2.prepare(`
      INSERT INTO users (id, email, password_hash, credits, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, 'test@example.com', 'hash', 100, new Date().toISOString(), new Date().toISOString());
    db2.close();
  });

  afterAll(() => {
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
  });

  describe('GET /api/me/jobs', () => {
    beforeEach(() => {
      // Insert test jobs
      const db = new Database(dbFile);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-1', null, 'outputs/job-1/video.mp4', 'test prompt 1', 'completed', 100, userId, now, now);

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-2', null, null, 'test prompt 2', 'processing', 50, userId, now, now);

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-3', null, null, 'test prompt 3', 'queued', 0, userId, now, now);

      db.close();
    });

    afterEach(() => {
      const db = new Database(dbFile);
      db.prepare('DELETE FROM jobs').run();
      db.close();
    });

    test('should return paginated list of user jobs', async () => {
      const res = await request(app)
        .get('/api/me/jobs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.jobs.length).toBe(3);
    });

    test('should return pagination info', async () => {
      const res = await request(app)
        .get('/api/me/jobs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.pages).toBe(1);
    });

    test('should support custom page and limit', async () => {
      const res = await request(app)
        .get('/api/me/jobs?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs.length).toBe(2);
      expect(res.body.pagination.limit).toBe(2);
    });

    test('should filter by status', async () => {
      const res = await request(app)
        .get('/api/me/jobs?status=completed')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs.length).toBe(1);
      expect(res.body.jobs[0].status).toBe('completed');
    });

    test('should search by prompt', async () => {
      const res = await request(app)
        .get('/api/me/jobs?search=prompt%202')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs.length).toBe(1);
      expect(res.body.jobs[0].prompt).toContain('prompt 2');
    });

    test('should sort by created_at descending', async () => {
      const res = await request(app)
        .get('/api/me/jobs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.jobs;
      for (let i = 0; i < jobs.length - 1; i++) {
        expect(new Date(jobs[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(jobs[i + 1].createdAt).getTime()
        );
      }
    });

    test('should reject request without auth', async () => {
      const res = await request(app)
        .get('/api/me/jobs');

      expect(res.status).toBe(401);
    });

    test('should include job metadata', async () => {
      const res = await request(app)
        .get('/api/me/jobs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const job = res.body.jobs[0];
      expect(job.jobId).toBeDefined();
      expect(job.prompt).toBeDefined();
      expect(job.status).toBeDefined();
      expect(job.progress).toBeDefined();
      expect(job.createdAt).toBeDefined();
      expect(job.updatedAt).toBeDefined();
    });

    test('should only return user own jobs', async () => {
      // Insert job for different user
      const db = new Database(dbFile);
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-other', null, null, 'other prompt', 'completed', 100, 'other-user', now, now);
      db.close();

      const res = await request(app)
        .get('/api/me/jobs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobs.length).toBe(3);
      expect(res.body.jobs.every(j => j.jobId !== 'job-other')).toBe(true);
    });
  });

  describe('GET /api/me/jobs/stats', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-1', null, null, 'prompt', 'completed', 100, userId, now, now);

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-2', null, null, 'prompt', 'completed', 100, userId, now, now);

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-3', null, null, 'prompt', 'processing', 50, userId, now, now);

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-4', null, null, 'prompt', 'failed', 0, userId, now, now);

      db.close();
    });

    afterEach(() => {
      const db = new Database(dbFile);
      db.prepare('DELETE FROM jobs').run();
      db.close();
    });

    test('should return job statistics', async () => {
      const res = await request(app)
        .get('/api/me/jobs/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(4);
      expect(res.body.completed).toBe(2);
      expect(res.body.processing).toBe(1);
      expect(res.body.failed).toBe(1);
      expect(res.body.queued).toBe(0);
    });

    test('should reject request without auth', async () => {
      const res = await request(app)
        .get('/api/me/jobs/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/me/jobs/:jobId', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-1', null, null, 'prompt', 'completed', 100, userId, now, now);

      db.close();
    });

    afterEach(() => {
      const db = new Database(dbFile);
      db.prepare('DELETE FROM jobs').run();
      db.close();
    });

    test('should delete user own job', async () => {
      const res = await request(app)
        .delete('/api/me/jobs/job-1')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Job deleted successfully');

      // Verify deletion
      const db = new Database(dbFile);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get('job-1');
      db.close();

      expect(job).toBeUndefined();
    });

    test('should reject deletion of non-existent job', async () => {
      const res = await request(app)
        .delete('/api/me/jobs/non-existent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('not_found');
    });

    test('should reject deletion of other user job', async () => {
      const db = new Database(dbFile);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-other', null, null, 'prompt', 'completed', 100, 'other-user', now, now);

      db.close();

      const res = await request(app)
        .delete('/api/me/jobs/job-other')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('forbidden');
    });

    test('should reject request without auth', async () => {
      const res = await request(app)
        .delete('/api/me/jobs/job-1');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/me/jobs/:jobId', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-1', null, 'outputs/job-1/video.mp4', 'test prompt', 'completed', 100, userId, now, now);

      db.close();
    });

    afterEach(() => {
      const db = new Database(dbFile);
      db.prepare('DELETE FROM jobs').run();
      db.close();
    });

    test('should return specific job details', async () => {
      const res = await request(app)
        .get('/api/me/jobs/job-1')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe('job-1');
      expect(res.body.prompt).toBe('test prompt');
      expect(res.body.status).toBe('completed');
    });

    test('should reject request for non-existent job', async () => {
      const res = await request(app)
        .get('/api/me/jobs/non-existent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('not_found');
    });

    test('should reject request for other user job', async () => {
      const db = new Database(dbFile);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO jobs (id, file_path, result_path, prompt, status, progress, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('job-other', null, null, 'prompt', 'completed', 100, 'other-user', now, now);

      db.close();

      const res = await request(app)
        .get('/api/me/jobs/job-other')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    test('should reject request without auth', async () => {
      const res = await request(app)
        .get('/api/me/jobs/job-1');

      expect(res.status).toBe(401);
    });
  });
});
