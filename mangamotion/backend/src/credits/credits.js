// backend/src/credits/credits.js
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../logger');

// Configuration
const DEFAULT_FREE_CREDITS = parseInt(process.env.DEFAULT_FREE_CREDITS || '100');
const JOB_COST = parseInt(process.env.JOB_COST || '1');
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', '..', 'db.sqlite3');

let db;
try {
  db = new Database(dbFile);
} catch (err) {
  logger.error('Failed to initialize database:', err);
  throw err;
}

/**
 * Get user's current credit balance
 */
function getUserCredits(userId) {
  try {
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
    return user ? user.credits : 0;
  } catch (err) {
    logger.error(`Get credits error: ${err.message}`);
    return 0;
  }
}

/**
 * Check if user has enough credits for a job
 */
function hasEnoughCredits(userId, cost = JOB_COST) {
  const credits = getUserCredits(userId);
  return credits >= cost;
}

/**
 * Deduct credits from user account
 * Returns: { success: boolean, error?: string, newBalance?: number }
 */
function deductCredits(userId, amount, jobId = null, reason = 'job_usage') {
  try {
    const currentCredits = getUserCredits(userId);

    if (currentCredits < amount) {
      return {
        success: false,
        error: 'insufficient_credits',
        message: `Insufficient credits. Required: ${amount}, Available: ${currentCredits}`
      };
    }

    const now = new Date().toISOString();
    const newBalance = currentCredits - amount;

    // Update user credits
    db.prepare('UPDATE users SET credits = ?, updated_at = ? WHERE id = ?').run(
      newBalance,
      now,
      userId
    );

    // Record transaction
    const transactionId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (id, user_id, job_id, amount, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionId,
      userId,
      jobId,
      -amount,
      reason,
      `${reason} - Job: ${jobId || 'N/A'}`,
      now
    );

    logger.info(`Deducted ${amount} credits from user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      newBalance
    };
  } catch (err) {
    logger.error(`Deduct credits error: ${err.message}`);
    return {
      success: false,
      error: 'internal_error',
      message: err.message
    };
  }
}

/**
 * Add credits to user account (for top-ups)
 * Returns: { success: boolean, error?: string, newBalance?: number }
 */
function addCredits(userId, amount, reason = 'topup', description = 'Credit top-up') {
  try {
    const currentCredits = getUserCredits(userId);
    const now = new Date().toISOString();
    const newBalance = currentCredits + amount;

    // Update user credits
    db.prepare('UPDATE users SET credits = ?, updated_at = ? WHERE id = ?').run(
      newBalance,
      now,
      userId
    );

    // Record transaction
    const transactionId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (id, user_id, job_id, amount, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionId,
      userId,
      null,
      amount,
      reason,
      description,
      now
    );

    logger.info(`Added ${amount} credits to user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      newBalance
    };
  } catch (err) {
    logger.error(`Add credits error: ${err.message}`);
    return {
      success: false,
      error: 'internal_error',
      message: err.message
    };
  }
}

/**
 * Get user's transaction history
 */
function getUserTransactions(userId, limit = 50, offset = 0) {
  try {
    const transactions = db.prepare(`
      SELECT * FROM transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const countResult = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(userId);

    return {
      transactions,
      total: countResult.count
    };
  } catch (err) {
    logger.error(`Get transactions error: ${err.message}`);
    return {
      transactions: [],
      total: 0
    };
  }
}

/**
 * Get credit summary for user
 */
function getCreditSummary(userId) {
  try {
    const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);

    if (!user) {
      return null;
    }

    // Get usage stats
    const usageStats = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as total_spent,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_earned
      FROM transactions
      WHERE user_id = ?
    `).get(userId);

    return {
      currentBalance: user.credits,
      totalSpent: usageStats.total_spent || 0,
      totalEarned: usageStats.total_earned || 0,
      totalTransactions: usageStats.total_transactions || 0
    };
  } catch (err) {
    logger.error(`Get credit summary error: ${err.message}`);
    return null;
  }
}

/**
 * Refund credits for failed job
 */
function refundCredits(userId, jobId, amount = JOB_COST, reason = 'job_failed') {
  try {
    const currentCredits = getUserCredits(userId);
    const now = new Date().toISOString();
    const newBalance = currentCredits + amount;

    // Update user credits
    db.prepare('UPDATE users SET credits = ?, updated_at = ? WHERE id = ?').run(
      newBalance,
      now,
      userId
    );

    // Record transaction
    const transactionId = uuidv4();
    db.prepare(`
      INSERT INTO transactions (id, user_id, job_id, amount, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionId,
      userId,
      jobId,
      amount,
      'refund',
      `Refund for failed job: ${jobId}`,
      now
    );

    logger.info(`Refunded ${amount} credits to user ${userId} for job ${jobId}. New balance: ${newBalance}`);

    return {
      success: true,
      newBalance
    };
  } catch (err) {
    logger.error(`Refund credits error: ${err.message}`);
    return {
      success: false,
      error: 'internal_error',
      message: err.message
    };
  }
}

/**
 * Middleware: Check user has enough credits for job creation
 */
function checkCreditsMiddleware(cost = JOB_COST) {
  return (req, res, next) => {
    if (!req.user) {
      // Anonymous user, allow but they'll need to login for job creation
      return next();
    }

    const credits = getUserCredits(req.user.userId);

    if (credits < cost) {
      return res.status(402).json({
        error: 'insufficient_credits',
        message: `Insufficient credits. Required: ${cost}, Available: ${credits}`,
        requiredCredits: cost,
        availableCredits: credits
      });
    }

    // Attach credit info to request
    req.credits = {
      available: credits,
      cost,
      sufficient: true
    };

    next();
  };
}

module.exports = {
  getUserCredits,
  hasEnoughCredits,
  deductCredits,
  addCredits,
  getUserTransactions,
  getCreditSummary,
  refundCredits,
  checkCreditsMiddleware,
  DEFAULT_FREE_CREDITS,
  JOB_COST
};
