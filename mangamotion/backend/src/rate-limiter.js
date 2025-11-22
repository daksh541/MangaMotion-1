const config = require('./config');
const { connection } = require('./queue/queues');

/**
 * Token-bucket rate limiter using Redis
 * 
 * Algorithm:
 * 1. Each user has a bucket with a maximum capacity (RATE_LIMIT_JOBS_PER_MINUTE)
 * 2. Tokens are added at a fixed rate (1 token per second)
 * 3. Each request consumes 1 token
 * 4. If no tokens available, request is rejected with 429
 * 
 * Redis key: rate_limit:{userId}
 * Value: { tokens: number, lastRefill: timestamp }
 */

/**
 * Check if user is within rate limit
 * @param {string} userId - User identifier (IP, user ID, etc.)
 * @returns {Promise<object>} { allowed: boolean, remaining: number, resetAt: number }
 */
async function checkRateLimit(userId) {
  const key = `rate_limit:${userId}`;
  const now = Date.now();
  const capacity = config.RATE_LIMIT_JOBS_PER_MINUTE;
  const windowSeconds = config.RATE_LIMIT_WINDOW_SECONDS;
  const refillRate = capacity / windowSeconds; // tokens per millisecond

  try {
    // Use Lua script for atomic operation
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      local window_seconds = tonumber(ARGV[4])
      
      -- Get current bucket state
      local bucket = redis.call('GET', key)
      local tokens, last_refill
      
      if bucket then
        local parts = cjson.decode(bucket)
        tokens = parts.tokens
        last_refill = parts.lastRefill
      else
        tokens = capacity
        last_refill = now
      end
      
      -- Calculate elapsed time and refill tokens
      local elapsed_ms = now - last_refill
      local tokens_to_add = math.floor(elapsed_ms * refill_rate)
      
      if tokens_to_add > 0 then
        tokens = math.min(tokens + tokens_to_add, capacity)
        last_refill = now
      end
      
      -- Check if token available
      local allowed = false
      if tokens > 0 then
        tokens = tokens - 1
        allowed = true
      end
      
      -- Save updated bucket state
      local new_bucket = cjson.encode({tokens = tokens, lastRefill = last_refill})
      redis.call('SET', key, new_bucket, 'EX', window_seconds * 2)
      
      -- Return: allowed, remaining tokens, reset time
      local reset_at = last_refill + (window_seconds * 1000)
      return {allowed and 1 or 0, tokens, reset_at}
    `;

    const result = await connection.eval(script, 1, key, now, capacity, refillRate, windowSeconds);
    
    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetAt: result[2]
    };
  } catch (err) {
    console.error('Rate limiter error:', err);
    // Fail open: allow request if Redis is down
    return { allowed: true, remaining: capacity, resetAt: now + config.RATE_LIMIT_WINDOW_SECONDS * 1000 };
  }
}

/**
 * Express middleware for rate limiting
 * Extracts user ID from request (IP or user ID from auth)
 */
function rateLimitMiddleware(req, res, next) {
  // Extract user identifier (IP address by default)
  const userId = req.headers['x-user-id'] || req.headers['x-forwarded-for'] || req.ip || 'unknown';
  
  checkRateLimit(userId).then(result => {
    // Set response headers
    res.set('X-RateLimit-Limit', config.RATE_LIMIT_JOBS_PER_MINUTE);
    res.set('X-RateLimit-Remaining', Math.max(0, result.remaining));
    res.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${config.RATE_LIMIT_JOBS_PER_MINUTE} jobs per minute.`,
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      });
    }

    next();
  }).catch(err => {
    console.error('Rate limit middleware error:', err);
    // Fail open on error
    next();
  });
}

/**
 * Reset rate limit for a user (admin only)
 * @param {string} userId - User identifier
 */
async function resetRateLimit(userId) {
  const key = `rate_limit:${userId}`;
  await connection.del(key);
}

/**
 * Get current rate limit status for a user
 * @param {string} userId - User identifier
 */
async function getRateLimitStatus(userId) {
  const key = `rate_limit:${userId}`;
  const bucket = await connection.get(key);
  
  if (!bucket) {
    return {
      tokens: config.RATE_LIMIT_JOBS_PER_MINUTE,
      lastRefill: Date.now(),
      remaining: config.RATE_LIMIT_JOBS_PER_MINUTE
    };
  }

  try {
    const data = JSON.parse(bucket);
    return {
      tokens: data.tokens,
      lastRefill: data.lastRefill,
      remaining: data.tokens
    };
  } catch (err) {
    return {
      tokens: config.RATE_LIMIT_JOBS_PER_MINUTE,
      lastRefill: Date.now(),
      remaining: config.RATE_LIMIT_JOBS_PER_MINUTE
    };
  }
}

module.exports = {
  checkRateLimit,
  rateLimitMiddleware,
  resetRateLimit,
  getRateLimitStatus
};
