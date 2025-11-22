# Rate Limiting Integration Guide

## Quick Start

### 1. Configuration
Add to `.env`:
```bash
# Rate limit: 10 jobs per minute (default)
RATE_LIMIT_JOBS_PER_MINUTE=10
```

### 2. Automatic Application
The rate limiter is automatically applied to:
- `POST /api/upload` - Upload job creation

No additional code changes needed!

## Usage Examples

### Basic Upload with Rate Limiting
```javascript
// Client-side
const formData = new FormData();
formData.append('pages', file1);
formData.append('pages', file2);

const res = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

if (res.status === 429) {
  const error = await res.json();
  console.error('Rate limited:', error.message);
  console.log(`Retry after ${error.retryAfter} seconds`);
}
```

### With User ID (Authenticated)
```javascript
const res = await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'X-User-ID': 'user-123'  // Explicit user ID
  },
  body: formData
});
```

### Check Rate Limit Status
```javascript
// Server-side
const { getRateLimitStatus } = require('./rate-limiter');

app.get('/api/rate-limit-status', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.ip;
  const status = await getRateLimitStatus(userId);
  res.json(status);
});
```

### Admin: Reset User Rate Limit
```javascript
// Server-side
const { resetRateLimit } = require('./rate-limiter');

app.post('/api/admin/reset-rate-limit/:userId', async (req, res) => {
  // Check admin permission first
  await resetRateLimit(req.params.userId);
  res.json({ message: 'Rate limit reset' });
});
```

## Response Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 10           # Maximum requests per minute
X-RateLimit-Remaining: 7        # Requests remaining in current window
X-RateLimit-Reset: 1700000000   # Unix timestamp when limit resets
```

## Error Responses

### 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Max 10 jobs per minute.",
  "retryAfter": 45
}
```

**Meaning**: User has exceeded their rate limit. Should retry after `retryAfter` seconds.

## Client-Side Best Practices

### 1. Check Headers Before Requesting
```javascript
async function canUpload(userId) {
  const res = await fetch('/api/rate-limit-status', {
    headers: { 'X-User-ID': userId }
  });
  const status = await res.json();
  return status.remaining > 0;
}
```

### 2. Implement Retry Logic
```javascript
async function uploadWithRetry(formData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.status === 429) {
      const error = await res.json();
      if (attempt < maxRetries) {
        const delay = error.retryAfter * 1000;
        console.log(`Attempt ${attempt} failed. Retrying in ${error.retryAfter}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }

    return res;
  }
}
```

### 3. Queue Uploads Locally
```javascript
class UploadQueue {
  constructor(maxConcurrent = 1) {
    this.queue = [];
    this.active = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async add(formData) {
    return new Promise((resolve, reject) => {
      this.queue.push({ formData, resolve, reject });
      this.process();
    });
  }

  async process() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      this.active++;
      const { formData, resolve, reject } = this.queue.shift();

      try {
        const result = await uploadWithRetry(formData);
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        this.active--;
        this.process();
      }
    }
  }
}

// Usage
const uploader = new UploadQueue(1); // Sequential uploads
await uploader.add(formData1);
await uploader.add(formData2);
```

### 4. Exponential Backoff
```javascript
async function uploadWithBackoff(formData) {
  let delay = 1000; // Start with 1 second
  const maxDelay = 60000; // Cap at 60 seconds
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.status !== 429) {
      return res;
    }

    if (attempt < maxAttempts - 1) {
      console.log(`Rate limited. Waiting ${delay}ms before retry...`);
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw new Error('Max upload attempts exceeded');
}
```

## Configuration Scenarios

### Development (Generous Limits)
```bash
RATE_LIMIT_JOBS_PER_MINUTE=100
```

### Production (Strict Limits)
```bash
RATE_LIMIT_JOBS_PER_MINUTE=5
```

### High-Volume Service
```bash
RATE_LIMIT_JOBS_PER_MINUTE=50
```

## Monitoring & Debugging

### Enable Detailed Logging
```javascript
// In rate-limiter.js, add logging
console.log(`[RateLimit] User: ${userId}, Allowed: ${result.allowed}, Remaining: ${result.remaining}`);
```

### Track Rate Limit Events
```javascript
const { checkRateLimit } = require('./rate-limiter');

app.use(async (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.ip;
  const result = await checkRateLimit(userId);
  
  if (!result.allowed) {
    console.warn(`[RateLimit] Rejected: ${userId}`);
  }
  
  next();
});
```

### Metrics Export
```javascript
const rateLimitMetrics = {
  totalRequests: 0,
  rejectedRequests: 0,
  activeUsers: new Set()
};

app.use(async (req, res, next) => {
  rateLimitMetrics.totalRequests++;
  const userId = req.headers['x-user-id'] || req.ip;
  rateLimitMetrics.activeUsers.add(userId);
  
  // ... rest of middleware
});

app.get('/metrics/rate-limit', (req, res) => {
  res.json({
    totalRequests: rateLimitMetrics.totalRequests,
    rejectedRequests: rateLimitMetrics.rejectedRequests,
    activeUsers: rateLimitMetrics.activeUsers.size
  });
});
```

## Troubleshooting

### Issue: All requests getting 429
**Cause**: Rate limit too strict or Redis issue
**Solution**: 
- Increase `RATE_LIMIT_JOBS_PER_MINUTE`
- Check Redis connection
- Check user ID extraction

### Issue: Rate limit not working
**Cause**: Redis not running or middleware not applied
**Solution**:
- Verify Redis is running
- Check middleware is applied to endpoint
- Check for middleware ordering issues

### Issue: Different limits for different users
**Cause**: Not setting X-User-ID header
**Solution**:
- Explicitly set `X-User-ID` header for authenticated users
- Implement user authentication middleware

## Performance Considerations

### Redis Latency
- Typical: 1-2ms per request
- Impact: Negligible for most applications
- Optimization: Use Redis cluster for high throughput

### Memory Usage
- Per user: ~100 bytes
- 1000 users: ~100KB
- 10000 users: ~1MB

### Scalability
- Single Redis instance: ~10,000 requests/second
- Redis cluster: Scales linearly with nodes
- Lua script: Atomic, no race conditions

## Security Considerations

### User ID Spoofing
**Risk**: Client can set arbitrary X-User-ID
**Mitigation**: 
- Use authenticated user ID from session/JWT
- Don't trust client-provided X-User-ID in production
- Implement proper authentication middleware

### DDoS Protection
**Note**: Rate limiting alone is not sufficient for DDoS protection
**Recommendation**:
- Use WAF (Web Application Firewall)
- Implement IP-based rate limiting at infrastructure level
- Use CDN with DDoS protection

## Testing

### Unit Tests
```bash
node src/rate-limiter.test.js
```

### Load Testing
```bash
# Using Apache Bench
ab -n 100 -c 10 -p data.json -T application/json http://localhost:3000/api/upload
```

### Manual Testing
```bash
# First request (should succeed)
curl -X POST http://localhost:3000/api/upload -F "pages=@file.jpg"

# Rapid requests (some should fail with 429)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/upload -F "pages=@file.jpg"
  echo "Request $i"
done
```
