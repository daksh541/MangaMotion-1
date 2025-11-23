// backend/src/routes/generate-from-prompt.test.js
const express = require('express');
const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const amqplib = require('amqplib');

// Mock amqplib before requiring the route
jest.mock('amqplib');

describe('POST /api/generate-from-prompt', () => {
  let app;
  let db;
  let dbFile;
  let mockChannel;
  let mockConnection;

  beforeAll(() => {
    // Create a temporary test database
    dbFile = path.join(__dirname, '..', '..', 'test_db.sqlite3');
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }

    // Initialize database with jobs table
    db = new Database(dbFile);
    db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        file_path TEXT,
        result_path TEXT,
        prompt TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        progress INTEGER DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
    `);
    db.close();

    // Set environment for test
    process.env.DATABASE_FILE = dbFile;
    process.env.RABBITMQ_URL = 'amqp://guest:guest@127.0.0.1:5672';
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock RabbitMQ
    mockChannel = {
      close: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn()
    };

    mockConnection = {
      close: jest.fn().mockResolvedValue(undefined)
    };

    amqplib.connect.mockResolvedValue(mockConnection);
    mockConnection.createChannel = jest.fn().mockResolvedValue(mockChannel);

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());

    const generateRoute = require('./generate-from-prompt');
    app.use(generateRoute);
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
    delete process.env.DATABASE_FILE;
  });

  describe('Request Validation', () => {
    test('should reject request without prompt', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_prompt');
      expect(res.body.message).toContain('non-empty string');
    });

    test('should reject empty prompt', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_prompt');
    });

    test('should reject whitespace-only prompt', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: '   \n\t  ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_prompt');
    });

    test('should reject prompt longer than 2000 characters', async () => {
      const longPrompt = 'a'.repeat(2001);
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: longPrompt });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_prompt');
      expect(res.body.message).toContain('2000');
    });

    test('should reject non-string prompt', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_prompt');
    });
  });

  describe('Successful Request', () => {
    test('should accept valid prompt and return 202 with jobId', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: 'turn this into anime, cinematic' });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
      expect(typeof res.body.jobId).toBe('string');
      // UUID v4 format check
      expect(res.body.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should accept optional style and seed parameters', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({
          prompt: 'turn this into anime',
          style: 'studio',
          seed: 42
        });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
    });

    test('should accept optional userId parameter', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({
          prompt: 'turn this into anime',
          userId: 'user-123'
        });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
    });

    test('should accept prompt at max length (2000 chars)', async () => {
      const maxPrompt = 'a'.repeat(2000);
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: maxPrompt });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    test('should insert job into database with status=queued', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: 'test prompt' });

      const jobId = res.body.jobId;

      // Query database
      const db = new Database(dbFile);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      db.close();

      expect(job).toBeDefined();
      expect(job.id).toBe(jobId);
      expect(job.prompt).toBe('test prompt');
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
      expect(job.file_path).toBeNull();
      expect(job.result_path).toBeNull();
      expect(job.created_at).toBeDefined();
      expect(job.updated_at).toBeDefined();
    });

    test('should sanitize prompt before storing in database', async () => {
      const dirtyPrompt = 'test; rm -rf / && echo "hacked"';
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: dirtyPrompt });

      const jobId = res.body.jobId;

      const db = new Database(dbFile);
      const job = db.prepare('SELECT prompt FROM jobs WHERE id = ?').get(jobId);
      db.close();

      // Verify dangerous characters are removed
      expect(job.prompt).not.toContain(';');
      expect(job.prompt).not.toContain('rm');
      expect(job.prompt).not.toContain('`');
      expect(job.prompt).not.toContain('$');
    });

    test('should set created_at and updated_at timestamps', async () => {
      const beforeTime = new Date().toISOString();
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: 'test prompt' });
      const afterTime = new Date().toISOString();

      const jobId = res.body.jobId;

      const db = new Database(dbFile);
      const job = db.prepare('SELECT created_at, updated_at FROM jobs WHERE id = ?').get(jobId);
      db.close();

      expect(job.created_at).toBeDefined();
      expect(job.updated_at).toBeDefined();
      expect(job.created_at).toBe(job.updated_at);
      // Timestamps should be within reasonable range
      expect(new Date(job.created_at).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(job.created_at).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });

  describe('RabbitMQ Publishing', () => {
    test('should publish message to mangamotion_jobs queue', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: 'test prompt' });

      expect(res.status).toBe(202);

      // Wait for async operations
      await new Promise(r => setTimeout(r, 100));

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('mangamotion_jobs', { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalled();
    });

    test('should publish payload with correct structure', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({
          prompt: 'test prompt',
          style: 'studio',
          seed: 42,
          userId: 'user-123'
        });

      const jobId = res.body.jobId;

      // Wait for async operations
      await new Promise(r => setTimeout(r, 100));

      const callArgs = mockChannel.sendToQueue.mock.calls[0];
      expect(callArgs[0]).toBe('mangamotion_jobs');

      const payload = JSON.parse(callArgs[1].toString());
      expect(payload.jobId).toBe(jobId);
      expect(payload.prompt).toBe('test prompt');
      expect(payload.style).toBe('studio');
      expect(payload.seed).toBe(42);
      expect(payload.userId).toBe('user-123');
      expect(payload.testFileUrl).toBe('/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov');
    });

    test('should publish with persistent flag', async () => {
      await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: 'test prompt' });

      // Wait for async operations
      await new Promise(r => setTimeout(r, 100));

      const callArgs = mockChannel.sendToQueue.mock.calls[0];
      const options = callArgs[2];
      expect(options.persistent).toBe(true);
    });

    test('should handle RabbitMQ connection failure gracefully', async () => {
      amqplib.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: 'test prompt' });

      // Should still return 202 and insert into DB
      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();

      // Verify job is in database
      const db = new Database(dbFile);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(res.body.jobId);
      db.close();

      expect(job).toBeDefined();
      expect(job.status).toBe('queued');
    });
  });

  describe('Prompt Sanitization', () => {
    test('should remove shell metacharacters', async () => {
      const prompts = [
        'test; command',
        'test & command',
        'test | command',
        'test `command`',
        'test $(command)',
        'test {command}',
        'test [command]',
        'test <command>',
        'test \\command'
      ];

      for (const prompt of prompts) {
        const res = await request(app)
          .post('/api/generate-from-prompt')
          .send({ prompt });

        expect(res.status).toBe(202);

        const db = new Database(dbFile);
        const job = db.prepare('SELECT prompt FROM jobs WHERE id = ?').get(res.body.jobId);
        db.close();

        // Verify no dangerous characters
        expect(job.prompt).not.toMatch(/[;&|`$(){}\[\]<>\\]/);
      }
    });

    test('should trim whitespace', async () => {
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: '   test prompt   \n\t' });

      const db = new Database(dbFile);
      const job = db.prepare('SELECT prompt FROM jobs WHERE id = ?').get(res.body.jobId);
      db.close();

      expect(job.prompt).toBe('test prompt');
    });

    test('should truncate to 2000 characters', async () => {
      const longPrompt = 'a'.repeat(2500);
      const res = await request(app)
        .post('/api/generate-from-prompt')
        .send({ prompt: longPrompt });

      const db = new Database(dbFile);
      const job = db.prepare('SELECT prompt FROM jobs WHERE id = ?').get(res.body.jobId);
      db.close();

      expect(job.prompt.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('Error Handling', () => {
    test('should return 500 on database error', async () => {
      // Simulate database error by using invalid database file
      process.env.DATABASE_FILE = '/invalid/path/that/does/not/exist/db.sqlite3';

      // Reload the module to pick up new env var
      jest.resetModules();
      const generateRoute = require('./generate-from-prompt');

      const testApp = express();
      testApp.use(express.json());
      testApp.use(generateRoute);

      const res = await request(testApp)
        .post('/api/generate-from-prompt')
        .send({ prompt: 'test' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('internal_error');

      // Restore env
      process.env.DATABASE_FILE = dbFile;
    });
  });
});
