// backend/src/credits/credits.test.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  getUserCredits,
  hasEnoughCredits,
  deductCredits,
  addCredits,
  getUserTransactions,
  getCreditSummary,
  refundCredits,
  JOB_COST
} = require('./credits');

describe('Credits Module', () => {
  let dbFile;
  let userId;

  beforeAll(() => {
    // Create test database
    dbFile = path.join(__dirname, '..', '..', 'test_credits_db.sqlite3');
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

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        job_id TEXT REFERENCES jobs(id),
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
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
    `);
    db.close();

    // Create test user
    userId = uuidv4();
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

  describe('Get Credits', () => {
    test('should get user credits', () => {
      const credits = getUserCredits(userId);
      expect(credits).toBe(100);
    });

    test('should return 0 for non-existent user', () => {
      const credits = getUserCredits('non-existent-user');
      expect(credits).toBe(0);
    });
  });

  describe('Check Credits', () => {
    test('should return true if user has enough credits', () => {
      const hasEnough = hasEnoughCredits(userId, 50);
      expect(hasEnough).toBe(true);
    });

    test('should return false if user does not have enough credits', () => {
      const hasEnough = hasEnoughCredits(userId, 200);
      expect(hasEnough).toBe(false);
    });

    test('should use default JOB_COST if not specified', () => {
      const hasEnough = hasEnoughCredits(userId);
      expect(hasEnough).toBe(true);
    });
  });

  describe('Deduct Credits', () => {
    beforeEach(() => {
      // Reset user credits
      const db = new Database(dbFile);
      db.prepare('UPDATE users SET credits = 100 WHERE id = ?').run(userId);
      db.prepare('DELETE FROM transactions').run();
      db.close();
    });

    test('should deduct credits successfully', () => {
      const result = deductCredits(userId, 10);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(90);

      const credits = getUserCredits(userId);
      expect(credits).toBe(90);
    });

    test('should create transaction record', () => {
      const jobId = uuidv4();
      deductCredits(userId, 10, jobId, 'job_creation');

      const { transactions } = getUserTransactions(userId);
      expect(transactions.length).toBe(1);
      expect(transactions[0].amount).toBe(-10);
      expect(transactions[0].type).toBe('job_creation');
      expect(transactions[0].job_id).toBe(jobId);
    });

    test('should reject if insufficient credits', () => {
      const result = deductCredits(userId, 200);

      expect(result.success).toBe(false);
      expect(result.error).toBe('insufficient_credits');

      const credits = getUserCredits(userId);
      expect(credits).toBe(100); // Unchanged
    });

    test('should deduct exact amount', () => {
      deductCredits(userId, 50);
      const credits = getUserCredits(userId);
      expect(credits).toBe(50);
    });

    test('should deduct all credits', () => {
      deductCredits(userId, 100);
      const credits = getUserCredits(userId);
      expect(credits).toBe(0);
    });
  });

  describe('Add Credits', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      db.prepare('UPDATE users SET credits = 50 WHERE id = ?').run(userId);
      db.prepare('DELETE FROM transactions').run();
      db.close();
    });

    test('should add credits successfully', () => {
      const result = addCredits(userId, 50);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(100);

      const credits = getUserCredits(userId);
      expect(credits).toBe(100);
    });

    test('should create transaction record', () => {
      addCredits(userId, 50, 'topup', 'User top-up');

      const { transactions } = getUserTransactions(userId);
      expect(transactions.length).toBe(1);
      expect(transactions[0].amount).toBe(50);
      expect(transactions[0].type).toBe('topup');
    });

    test('should add large amounts', () => {
      addCredits(userId, 1000);
      const credits = getUserCredits(userId);
      expect(credits).toBe(1050);
    });
  });

  describe('Refund Credits', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      db.prepare('UPDATE users SET credits = 50 WHERE id = ?').run(userId);
      db.prepare('DELETE FROM transactions').run();
      db.close();
    });

    test('should refund credits successfully', () => {
      const jobId = uuidv4();
      const result = refundCredits(userId, jobId, 10);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(60);

      const credits = getUserCredits(userId);
      expect(credits).toBe(60);
    });

    test('should create refund transaction', () => {
      const jobId = uuidv4();
      refundCredits(userId, jobId, 10);

      const { transactions } = getUserTransactions(userId);
      expect(transactions.length).toBe(1);
      expect(transactions[0].amount).toBe(10);
      expect(transactions[0].type).toBe('refund');
      expect(transactions[0].job_id).toBe(jobId);
    });

    test('should use default JOB_COST if not specified', () => {
      const jobId = uuidv4();
      const result = refundCredits(userId, jobId);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(50 + JOB_COST);
    });
  });

  describe('Get Transactions', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      db.prepare('UPDATE users SET credits = 100 WHERE id = ?').run(userId);
      db.prepare('DELETE FROM transactions').run();

      // Add some transactions
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO transactions (id, user_id, job_id, amount, type, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, uuidv4(), -10, 'job_creation', 'Job 1', now);

      db.prepare(`
        INSERT INTO transactions (id, user_id, job_id, amount, type, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, null, 50, 'topup', 'Top-up', now);

      db.close();
    });

    test('should get user transactions', () => {
      const { transactions } = getUserTransactions(userId);
      expect(transactions.length).toBe(2);
    });

    test('should include transaction details', () => {
      const { transactions } = getUserTransactions(userId);
      expect(transactions[0]).toHaveProperty('id');
      expect(transactions[0]).toHaveProperty('amount');
      expect(transactions[0]).toHaveProperty('type');
      expect(transactions[0]).toHaveProperty('description');
      expect(transactions[0]).toHaveProperty('created_at');
    });

    test('should support pagination', () => {
      const { transactions, total } = getUserTransactions(userId, 1, 0);
      expect(transactions.length).toBe(1);
      expect(total).toBe(2);
    });

    test('should support offset', () => {
      const page1 = getUserTransactions(userId, 1, 0);
      const page2 = getUserTransactions(userId, 1, 1);

      expect(page1.transactions[0].id).not.toBe(page2.transactions[0].id);
    });
  });

  describe('Get Credit Summary', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      db.prepare('UPDATE users SET credits = 100 WHERE id = ?').run(userId);
      db.prepare('DELETE FROM transactions').run();

      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO transactions (id, user_id, job_id, amount, type, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, uuidv4(), -30, 'job_creation', 'Job 1', now);

      db.prepare(`
        INSERT INTO transactions (id, user_id, job_id, amount, type, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, null, 50, 'topup', 'Top-up', now);

      db.close();
    });

    test('should get credit summary', () => {
      const summary = getCreditSummary(userId);

      expect(summary).toHaveProperty('currentBalance');
      expect(summary).toHaveProperty('totalSpent');
      expect(summary).toHaveProperty('totalEarned');
      expect(summary).toHaveProperty('totalTransactions');
    });

    test('should calculate totals correctly', () => {
      const summary = getCreditSummary(userId);

      expect(summary.currentBalance).toBe(100);
      expect(summary.totalSpent).toBe(30);
      expect(summary.totalEarned).toBe(50);
      expect(summary.totalTransactions).toBe(2);
    });

    test('should return null for non-existent user', () => {
      const summary = getCreditSummary('non-existent-user');
      expect(summary).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      const db = new Database(dbFile);
      db.prepare('UPDATE users SET credits = 100 WHERE id = ?').run(userId);
      db.prepare('DELETE FROM transactions').run();
      db.close();
    });

    test('should handle complete workflow', () => {
      // Start with 100 credits
      expect(getUserCredits(userId)).toBe(100);

      // Deduct for job
      const deductResult = deductCredits(userId, 10, uuidv4(), 'job_creation');
      expect(deductResult.success).toBe(true);
      expect(getUserCredits(userId)).toBe(90);

      // Top-up
      const addResult = addCredits(userId, 50, 'topup');
      expect(addResult.success).toBe(true);
      expect(getUserCredits(userId)).toBe(140);

      // Check summary
      const summary = getCreditSummary(userId);
      expect(summary.currentBalance).toBe(140);
      expect(summary.totalSpent).toBe(10);
      expect(summary.totalEarned).toBe(50);
    });

    test('should handle multiple deductions', () => {
      deductCredits(userId, 10, uuidv4());
      deductCredits(userId, 20, uuidv4());
      deductCredits(userId, 30, uuidv4());

      expect(getUserCredits(userId)).toBe(40);

      const { transactions } = getUserTransactions(userId);
      expect(transactions.length).toBe(3);
    });

    test('should prevent overspending', () => {
      const result1 = deductCredits(userId, 50);
      expect(result1.success).toBe(true);

      const result2 = deductCredits(userId, 60);
      expect(result2.success).toBe(false);

      expect(getUserCredits(userId)).toBe(50);
    });
  });
});
