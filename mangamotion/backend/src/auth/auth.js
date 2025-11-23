// backend/src/auth/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../logger');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_COST = parseInt(process.env.BCRYPT_COST || '12');

const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', '..', 'db.sqlite3');
let db;

try {
  db = new Database(dbFile);
} catch (err) {
  logger.error('Failed to initialize database:', err);
  throw err;
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
function generateAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Register new user
 */
async function registerUser(email, password) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'invalid_email', message: 'Invalid email format' };
  }

  // Validate password length
  if (!password || password.length < 8) {
    return { success: false, error: 'weak_password', message: 'Password must be at least 8 characters' };
  }

  try {
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return { success: false, error: 'user_exists', message: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, credits, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, 100, now, now); // Default 100 free credits

    logger.info(`User registered: ${email}`);

    // Generate tokens
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    return {
      success: true,
      userId,
      email,
      accessToken,
      refreshToken
    };
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    return { success: false, error: 'internal_error', message: err.message };
  }
}

/**
 * Login user
 */
async function loginUser(email, password) {
  try {
    // Find user by email
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email);
    if (!user) {
      return { success: false, error: 'invalid_credentials', message: 'Invalid email or password' };
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password_hash);
    if (!passwordValid) {
      return { success: false, error: 'invalid_credentials', message: 'Invalid email or password' };
    }

    logger.info(`User logged in: ${email}`);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return {
      success: true,
      userId: user.id,
      email: user.email,
      accessToken,
      refreshToken
    };
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return { success: false, error: 'internal_error', message: err.message };
  }
}

/**
 * Refresh access token
 */
function refreshAccessToken(refreshToken) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return { success: false, error: 'invalid_token', message: 'Invalid refresh token' };
    }

    const accessToken = generateAccessToken(payload.userId);
    return {
      success: true,
      accessToken
    };
  } catch (err) {
    logger.error(`Token refresh error: ${err.message}`);
    return { success: false, error: 'invalid_token', message: 'Invalid refresh token' };
  }
}

/**
 * Get user by ID
 */
function getUserById(userId) {
  try {
    const user = db.prepare(`
      SELECT id, email, credits, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(userId);
    return user || null;
  } catch (err) {
    logger.error(`Get user error: ${err.message}`);
    return null;
  }
}

/**
 * Middleware: Require authentication
 */
function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }

  req.user = { userId: payload.userId };
  next();
}

/**
 * Middleware: Optional authentication
 */
function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = { userId: payload.userId };
    }
  }
  next();
}

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserById,
  authRequired,
  authOptional,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRY,
  JWT_REFRESH_EXPIRY
};
