# Rate Limiting for Upload Job Creation

## Overview
Implements per-user rate limiting on the `/api/upload` endpoint using a Redis-backed token-bucket algorithm. This prevents abuse and ensures fair resource allocation.

## Algorithm: Token Bucket

### How It Works
1. Each user has a bucket with a maximum capacity (default: 10 jobs per minute)
2. Tokens are added at a fixed refill rate (1 token per second)
3. Each upload job creation request consumes 1 token
4. If no tokens available, request is rejected with HTTP 429

### Example Timeline
```
Time 0s:    User has 10 tokens (full capacity)
Time 0s:    Request 1 → Allowed, 9 tokens remaining
Time 0.1s:  Request 2 → Allowed, 8 tokens remaining
...
Time 1s:    Request 10 → Allowed, 0 tokens remaining
Time 1s:    Request 11 → REJECTED (429), 0 tokens remaining
Time 1.1s:  Token refilled → 1 token available
Time 1.1s:  Request 11 → Allowed, 0 tokens remaining
```

## Configuration

### Environment Variables
```bash
# Rate limit: jobs per minute (default: 10)
RATE_LIMIT_JOBS_PER_MINUTE=10

# Window size in seconds (default: 60)
RATE_LIMIT_WINDOW_SECONDS=60
```

### Default Limits
- **10 jobs per minute** per user
- **60 second** window

### Customization Examples

**Strict limit (5 jobs/min):**
```bash
RATE_LIMIT_JOBS_PER_MINUTE=5
```

**Generous limit (30 jobs/min):**
```bash
RATE_LIMIT_JOBS_PER_MINUTE=30
```

## API Behavior

### Successful Request (200)
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1700000000
```

### Rate Limited Response (429)
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Max 10 jobs per minute.",
  "retryAfter": 45
}
```

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700000045
```

## User Identification

The rate limiter identifies users by:
1. **X-User-ID header** (if provided) - for authenticated users
2. **X-Forwarded-For header** (if provided) - for proxied requests
3. **req.ip** - client IP address (fallback)
4. **'unknown'** - if none available

### Setting User ID in Requests
```javascript
fetch('/api/upload', {
  method: 'POST',
  headers: {
    'X-User-ID': 'user-123',  // Optional: explicit user ID
  },
  body: formData
});
```

## Implementation Details

### Files Modified
1. **src/config.js** - Added rate limit configuration
2. **src/server.js** - Applied middleware to `/api/upload` endpoint

### Files Created
1. **src/rate-limiter.js** - Core rate limiting implementation
   - `checkRateLimit(userId)` - Check and consume token
   - `rateLimitMiddleware` - Express middleware
   - `resetRateLimit(userId)` - Admin reset function
   - `getRateLimitStatus(userId)` - Get current status

2. **src/rate-limiter.test.js** - Test suite

## Redis Storage

### Key Format
```
rate_limit:{userId}
```

### Value Structure
```json
{
  "tokens": 7,
  "lastRefill": 1700000000000
}
```

### TTL
- Keys expire after 2x the window size (120 seconds default)
- Prevents stale entries from accumulating

## Atomic Operations

The rate limiter uses **Lua scripting** for atomic Redis operations:
- Prevents race conditions
- Ensures accurate token counting
- Single round-trip to Redis

## Error Handling

### Redis Unavailable
- **Behavior**: Fail open - allow requests
- **Reason**: Availability over strict rate limiting
- **Logging**: Error logged to console

### Invalid User ID
- **Behavior**: Use 'unknown' as fallback
- **Impact**: All unauthenticated users share same limit

## Testing

### Run Tests
```bash
cd mangamotion/backend
node src/rate-limiter.test.js
```

### Test Coverage
- ✅ Initial state (full capacity)
- ✅ Token consumption
- ✅ Rate limit exceeded
- ✅ Status retrieval
- ✅ Rate limit reset
- ✅ Multiple users independent limits

## Monitoring

### Check User Rate Limit Status
```javascript
const { getRateLimitStatus } = require('./rate-limiter');
const status = await getRateLimitStatus('user-123');
console.log(status);
// { tokens: 7, lastRefill: 1700000000000, remaining: 7 }
```

### Reset User Rate Limit (Admin)
```javascript
const { resetRateLimit } = require('./rate-limiter');
await resetRateLimit('user-123');
```

## Client-Side Handling

### Retry Logic
```javascript
async function uploadWithRetry(formData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.status === 429) {
      const data = await res.json();
      const waitSeconds = data.retryAfter || 60;
      console.log(`Rate limited. Retrying in ${waitSeconds}s...`);
      await new Promise(r => setTimeout(r, waitSeconds * 1000));
      continue;
    }

    if (!res.ok) throw new Error('Upload failed');
    return await res.json();
  }
  throw new Error('Max retries exceeded');
}
```

### Exponential Backoff
```javascript
async function uploadWithBackoff(formData) {
  let delay = 1000; // Start with 1 second
  
  while (true) {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.status !== 429) return res;

    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 2, 60000); // Cap at 60 seconds
  }
}
```

## Performance

### Latency Impact
- **Per-request overhead**: ~1-2ms (single Redis call)
- **Redis operation**: Lua script execution
- **Negligible impact** on overall request latency

### Scalability
- **Horizontal scaling**: Works with Redis cluster
- **Concurrent requests**: Atomic Lua script prevents race conditions
- **Memory usage**: ~100 bytes per active user

## Future Enhancements

1. **Sliding window**: More accurate rate limiting
2. **Tiered limits**: Different limits for different user tiers
3. **Burst allowance**: Allow temporary exceeding of limit
4. **Metrics**: Export rate limit metrics to monitoring system
5. **Whitelist**: Bypass rate limiting for specific users
6. **Distributed rate limiting**: Coordinate across multiple servers
