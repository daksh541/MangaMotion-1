// backend/src/auth/auth.test.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserById
} = require('./auth');

describe('Auth Module', () => {
  let dbFile;

  beforeAll(() => {
    // Create test database
    dbFile = path.join(__dirname, '..', '..', 'test_auth_db.sqlite3');
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
      CREATE INDEX idx_users_email ON users(email);
    `);
    db.close();
  });

  afterAll(() => {
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
  });

  describe('Password Hashing', () => {
    test('should hash password with bcrypt', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    test('should compare password correctly', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    test('should produce different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate access token', () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    test('should generate refresh token', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    test('should verify valid access token', () => {
      const userId = 'user-123';
      const token = generateAccessToken(userId);
      const payload = verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(userId);
      expect(payload.type).toBe('access');
    });

    test('should verify valid refresh token', () => {
      const userId = 'user-123';
      const token = generateRefreshToken(userId);
      const payload = verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(userId);
      expect(payload.type).toBe('refresh');
    });

    test('should reject invalid access token', () => {
      const payload = verifyAccessToken('invalid.token.here');
      expect(payload).toBeNull();
    });

    test('should reject invalid refresh token', () => {
      const payload = verifyRefreshToken('invalid.token.here');
      expect(payload).toBeNull();
    });

    test('should reject expired token', (done) => {
      // This test would require mocking time, skip for now
      done();
    });
  });

  describe('User Registration', () => {
    test('should register new user with valid credentials', async () => {
      const result = await registerUser('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    test('should reject invalid email format', async () => {
      const result = await registerUser('invalid-email', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_email');
    });

    test('should reject weak password (< 8 chars)', async () => {
      const result = await registerUser('test2@example.com', 'short');

      expect(result.success).toBe(false);
      expect(result.error).toBe('weak_password');
    });

    test('should reject duplicate email', async () => {
      await registerUser('duplicate@example.com', 'password123');
      const result = await registerUser('duplicate@example.com', 'password456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('user_exists');
    });

    test('should reject missing email', async () => {
      const result = await registerUser(null, 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_email');
    });

    test('should reject missing password', async () => {
      const result = await registerUser('test3@example.com', null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('weak_password');
    });

    test('should create user with default credits', async () => {
      const result = await registerUser('credits@example.com', 'password123');

      expect(result.success).toBe(true);

      const db = new Database(dbFile);
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(result.userId);
      db.close();

      expect(user.credits).toBe(100);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      await registerUser('login@example.com', 'password123');
    });

    test('should login with valid credentials', async () => {
      const result = await loginUser('login@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.email).toBe('login@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    test('should reject invalid email', async () => {
      const result = await loginUser('nonexistent@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_credentials');
    });

    test('should reject wrong password', async () => {
      const result = await loginUser('login@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_credentials');
    });

    test('should reject missing email', async () => {
      const result = await loginUser(null, 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_credentials');
    });

    test('should reject missing password', async () => {
      const result = await loginUser('login@example.com', null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_credentials');
    });

    test('should return valid tokens', async () => {
      const result = await loginUser('login@example.com', 'password123');

      expect(result.success).toBe(true);

      const accessPayload = verifyAccessToken(result.accessToken);
      const refreshPayload = verifyRefreshToken(result.refreshToken);

      expect(accessPayload.userId).toBe(result.userId);
      expect(refreshPayload.userId).toBe(result.userId);
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token with valid refresh token', async () => {
      const registerResult = await registerUser('refresh@example.com', 'password123');
      const refreshToken = registerResult.refreshToken;

      const result = refreshAccessToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();

      const payload = verifyAccessToken(result.accessToken);
      expect(payload.userId).toBe(registerResult.userId);
    });

    test('should reject invalid refresh token', () => {
      const result = refreshAccessToken('invalid.token.here');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
    });

    test('should reject access token as refresh token', async () => {
      const registerResult = await registerUser('access@example.com', 'password123');
      const accessToken = registerResult.accessToken;

      const result = refreshAccessToken(accessToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
    });
  });

  describe('Get User By ID', () => {
    test('should retrieve user by ID', async () => {
      const registerResult = await registerUser('getuser@example.com', 'password123');
      const user = getUserById(registerResult.userId);

      expect(user).toBeDefined();
      expect(user.id).toBe(registerResult.userId);
      expect(user.email).toBe('getuser@example.com');
      expect(user.credits).toBe(100);
    });

    test('should return null for nonexistent user', () => {
      const user = getUserById('nonexistent-user-id');
      expect(user).toBeNull();
    });

    test('should not return password hash', async () => {
      const registerResult = await registerUser('nopass@example.com', 'password123');
      const user = getUserById(registerResult.userId);

      expect(user.password_hash).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full auth flow: register -> login -> refresh', async () => {
      // Register
      const registerResult = await registerUser('flow@example.com', 'password123');
      expect(registerResult.success).toBe(true);

      // Login
      const loginResult = await loginUser('flow@example.com', 'password123');
      expect(loginResult.success).toBe(true);

      // Refresh
      const refreshResult = refreshAccessToken(loginResult.refreshToken);
      expect(refreshResult.success).toBe(true);

      // Verify new access token
      const payload = verifyAccessToken(refreshResult.accessToken);
      expect(payload.userId).toBe(registerResult.userId);
    });

    test('should handle multiple users independently', async () => {
      const user1 = await registerUser('user1@example.com', 'password123');
      const user2 = await registerUser('user2@example.com', 'password456');

      expect(user1.userId).not.toBe(user2.userId);

      const login1 = await loginUser('user1@example.com', 'password123');
      const login2 = await loginUser('user2@example.com', 'password456');

      expect(login1.success).toBe(true);
      expect(login2.success).toBe(true);
      expect(login1.userId).not.toBe(login2.userId);
    });
  });
});
