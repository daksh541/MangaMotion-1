// backend/src/auth/routes.js
const express = require('express');
const { logger } = require('../logger');
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserById,
  authRequired
} = require('./auth');

const router = express.Router();

// Rate limiting helpers
const loginAttempts = new Map(); // { ip: { count, timestamp } }
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    loginAttempts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - attempt.timestamp > LOGIN_ATTEMPT_WINDOW) {
    loginAttempts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempt.count++;
  return true;
}

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields', message: 'email and password required' });
    }

    const result = await registerUser(email, password);

    if (!result.success) {
      const statusCode = result.error === 'user_exists' ? 409 : 400;
      return res.status(statusCode).json({ error: result.error, message: result.message });
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User registered: ${email}`);

    return res.status(201).json({
      userId: result.userId,
      email: result.email,
      accessToken: result.accessToken
    });
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields', message: 'email and password required' });
    }

    // Check rate limit
    if (!checkLoginRateLimit(ip)) {
      logger.warn(`Login rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        error: 'rate_limited',
        message: `Too many login attempts. Try again in 15 minutes.`
      });
    }

    const result = await loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({ error: result.error, message: result.message });
    }

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User logged in: ${email}`);

    return res.json({
      userId: result.userId,
      email: result.email,
      accessToken: result.accessToken
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * POST /api/auth/token/refresh
 * Refresh access token
 */
router.post('/api/auth/token/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'missing_token', message: 'Refresh token not found' });
    }

    const result = refreshAccessToken(refreshToken);

    if (!result.success) {
      // Clear invalid refresh token
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: result.error, message: result.message });
    }

    return res.json({ accessToken: result.accessToken });
  } catch (err) {
    logger.error(`Token refresh error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (clear refresh token cookie)
 */
router.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/api/auth/me', authRequired, (req, res) => {
  try {
    const user = getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'not_found', message: 'User not found' });
    }

    return res.json({
      userId: user.id,
      email: user.email,
      credits: user.credits,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  } catch (err) {
    logger.error(`Get user error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
