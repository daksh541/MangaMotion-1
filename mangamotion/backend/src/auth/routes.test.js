// backend/src/auth/routes.test.js
const express = require('express');
const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

describe('Auth Routes', () => {
  let app;
  let dbFile;

  beforeAll(() => {
    // Create test database
    dbFile = path.join(__dirname, '..', '..', 'test_auth_routes_db.sqlite3');
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }

    process.env.DATABASE_FILE = dbFile;
    process.env.NODE_ENV = 'development';

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

    // Create Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Load auth routes
    const authRoutes = require('./routes');
    app.use(authRoutes);
  });

  afterAll(() => {
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
  });

  describe('POST /api/auth/register', () => {
    test('should register new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBeDefined();
      expect(res.body.email).toBe('newuser@example.com');
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('should set httpOnly refresh token cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'cookie@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      const setCookie = res.headers['set-cookie'][0];
      expect(setCookie).toContain('refreshToken');
      expect(setCookie).toContain('HttpOnly');
    });

    test('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_fields');
    });

    test('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_fields');
    });

    test('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_email');
    });

    test('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('weak_password');
    });

    test('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123'
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password456'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('user_exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
    });

    test('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.userId).toBeDefined();
      expect(res.body.email).toBe('login@example.com');
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_credentials');
    });

    test('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_credentials');
    });

    test('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_fields');
    });

    test('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_fields');
    });

    test('should rate limit after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'login@example.com',
            password: 'wrongpassword'
          });
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe('rate_limited');
    });
  });

  describe('POST /api/auth/token/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'password123'
        });

      refreshToken = res.headers['set-cookie'][0].split('refreshToken=')[1].split(';')[0];
    });

    test('should refresh access token', async () => {
      const res = await request(app)
        .post('/api/auth/token/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    test('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/token/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('missing_token');
    });

    test('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/token/refresh')
        .set('Cookie', 'refreshToken=invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_token');
    });

    test('should clear invalid refresh token cookie', async () => {
      const res = await request(app)
        .post('/api/auth/token/refresh')
        .set('Cookie', 'refreshToken=invalid.token.here');

      expect(res.status).toBe(401);
      const setCookie = res.headers['set-cookie'][0];
      expect(setCookie).toContain('refreshToken');
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should clear refresh token cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      const setCookie = res.headers['set-cookie'][0];
      expect(setCookie).toContain('refreshToken');
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'me@example.com',
          password: 'password123'
        });

      accessToken = res.body.accessToken;
    });

    test('should return current user info with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBeDefined();
      expect(res.body.email).toBe('me@example.com');
      expect(res.body.credits).toBe(100);
      expect(res.body.createdAt).toBeDefined();
    });

    test('should reject missing authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('should reject missing Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', accessToken);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    test('should not return password hash', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.password_hash).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    test('should complete full auth flow', async () => {
      // Register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'flow@example.com',
          password: 'password123'
        });

      expect(registerRes.status).toBe(201);
      const accessToken = registerRes.body.accessToken;

      // Get user info
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe('flow@example.com');

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout');

      expect(logoutRes.status).toBe(200);
    });

    test('should handle multiple users', async () => {
      const user1 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password123'
        });

      const user2 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'password456'
        });

      expect(user1.body.userId).not.toBe(user2.body.userId);

      const me1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1.body.accessToken}`);

      const me2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user2.body.accessToken}`);

      expect(me1.body.email).toBe('user1@example.com');
      expect(me2.body.email).toBe('user2@example.com');
    });
  });
});
