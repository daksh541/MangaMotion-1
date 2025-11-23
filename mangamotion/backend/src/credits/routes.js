// backend/src/credits/routes.js
const express = require('express');
const crypto = require('crypto');
const { authRequired } = require('../auth/auth');
const { logger } = require('../logger');
const {
  getUserCredits,
  getCreditSummary,
  getUserTransactions,
  addCredits,
  deductCredits
} = require('./credits');

const router = express.Router();

// Stripe webhook secret (from env)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

/**
 * GET /api/me/credits
 * Get user's credit balance and summary
 */
router.get('/api/me/credits', authRequired, (req, res) => {
  try {
    const userId = req.user.userId;
    const summary = getCreditSummary(userId);

    if (!summary) {
      return res.status(404).json({ error: 'not_found', message: 'User not found' });
    }

    return res.json(summary);
  } catch (err) {
    logger.error(`Get credits error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * GET /api/me/transactions
 * Get user's transaction history
 */
router.get('/api/me/transactions', authRequired, (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));

    const { transactions, total } = getUserTransactions(userId, limit, offset);

    return res.json({
      transactions: transactions.map(t => ({
        id: t.id,
        jobId: t.job_id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.created_at
      })),
      pagination: {
        limit,
        offset,
        total
      }
    });
  } catch (err) {
    logger.error(`Get transactions error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * POST /api/credits/topup
 * Create a credit top-up session (Stripe placeholder)
 * In production, this would create a Stripe Checkout session
 */
router.post('/api/credits/topup', authRequired, (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Amount must be between 1 and 10000'
      });
    }

    // In production, create Stripe Checkout session
    // For now, return mock session
    const sessionId = `cs_test_${crypto.randomBytes(16).toString('hex')}`;

    logger.info(`Created top-up session ${sessionId} for user ${userId} with amount ${amount}`);

    return res.json({
      sessionId,
      amount,
      currency: 'usd',
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      // In dev mode, allow direct credit addition for testing
      devTestUrl: `/api/credits/topup/confirm?sessionId=${sessionId}`
    });
  } catch (err) {
    logger.error(`Topup error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * POST /api/credits/topup/confirm
 * Confirm top-up (dev/test endpoint)
 * In production, this would be called by Stripe webhook
 */
router.post('/api/credits/topup/confirm', authRequired, (req, res) => {
  try {
    const { sessionId, amount } = req.body;
    const userId = req.user.userId;

    if (!sessionId || !amount) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'sessionId and amount required'
      });
    }

    if (amount < 1 || amount > 10000) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Amount must be between 1 and 10000'
      });
    }

    // Add credits
    const result = addCredits(userId, amount, 'topup', `Top-up via session ${sessionId}`);

    if (!result.success) {
      return res.status(400).json({ error: result.error, message: result.message });
    }

    logger.info(`Confirmed top-up for user ${userId}: +${amount} credits`);

    return res.json({
      message: 'Top-up confirmed',
      amount,
      newBalance: result.newBalance
    });
  } catch (err) {
    logger.error(`Topup confirm error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

/**
 * POST /api/stripe/webhook
 * Stripe webhook for payment events
 * Verifies signature and processes payment_intent.succeeded events
 */
router.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    // In production, use: event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    // For dev, skip verification
    event = JSON.parse(req.body);

    logger.info(`Received Stripe webhook: ${event.type}`);

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const userId = paymentIntent.metadata?.userId;
      const amount = paymentIntent.amount / 100; // Convert cents to dollars

      if (!userId) {
        logger.warn('Payment intent missing userId metadata');
        return res.status(400).json({ error: 'missing_metadata' });
      }

      // Add credits
      const result = addCredits(userId, amount, 'stripe_payment', `Stripe payment: ${paymentIntent.id}`);

      if (!result.success) {
        logger.error(`Failed to add credits for payment ${paymentIntent.id}`);
        return res.status(500).json({ error: 'failed_to_add_credits' });
      }

      logger.info(`Added ${amount} credits for user ${userId} via Stripe payment ${paymentIntent.id}`);
    }

    // Always return 200 to acknowledge receipt
    return res.json({ received: true });
  } catch (err) {
    logger.error(`Webhook error: ${err.message}`);
    return res.status(400).json({ error: 'webhook_error', message: err.message });
  }
});

/**
 * POST /api/credits/admin/add (admin only)
 * Add credits to user (admin endpoint)
 */
router.post('/api/credits/admin/add', authRequired, (req, res) => {
  try {
    // TODO: Add admin role check
    const { userId, amount, reason } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'userId and amount required'
      });
    }

    if (amount < 1 || amount > 100000) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Amount must be between 1 and 100000'
      });
    }

    const result = addCredits(userId, amount, 'admin_grant', reason || 'Admin grant');

    if (!result.success) {
      return res.status(400).json({ error: result.error, message: result.message });
    }

    logger.info(`Admin added ${amount} credits to user ${userId}`);

    return res.json({
      message: 'Credits added',
      userId,
      amount,
      newBalance: result.newBalance
    });
  } catch (err) {
    logger.error(`Admin add credits error: ${err.message}`);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
