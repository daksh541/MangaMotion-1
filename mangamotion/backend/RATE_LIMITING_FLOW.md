# Rate Limiting Flow Diagram

## Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Client Request: POST /api/upload                                │
│ Headers: X-User-ID: user-123                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ rateLimitMiddleware                                              │
│ Extract userId from headers/IP                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ checkRateLimit(userId)                                          │
│ Execute Lua script in Redis                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │          │
                    ▼          ▼
            ┌──────────────┐  ┌──────────────────┐
            │ Tokens > 0?  │  │ Tokens = 0?      │
            └──────┬───────┘  └────────┬─────────┘
                   │                   │
                   ▼                   ▼
            ┌──────────────┐  ┌──────────────────┐
            │ Allow        │  │ Reject 429       │
            │ Consume 1    │  │ Return retryAfter│
            │ token        │  │                  │
            └──────┬───────┘  └────────┬─────────┘
                   │                   │
                   ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Set response     │  │ Set response     │
        │ headers          │  │ headers          │
        │ X-RateLimit-*    │  │ X-RateLimit-*    │
        └──────┬───────────┘  └────────┬─────────┘
               │                       │
               ▼                       ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ next()           │  │ res.status(429)  │
        │ Continue to      │  │ res.json(error)  │
        │ upload handler   │  │ return           │
        └──────────────────┘  └──────────────────┘
```

## Token Bucket State Machine

```
Initial State (t=0s)
┌─────────────────────────────────────────┐
│ Tokens: 10 (full capacity)              │
│ LastRefill: 0                           │
│ Capacity: 10 jobs/min                   │
└─────────────────────────────────────────┘

Request 1 (t=0.1s)
│ Check: tokens > 0? YES
│ Action: tokens = 10 - 1 = 9
│ Result: ALLOWED
└─────────────────────────────────────────┐
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │ Tokens: 9                               │
                        │ LastRefill: 0.1s                        │
                        └─────────────────────────────────────────┘

Request 2-10 (t=0.2s to t=1.0s)
│ Similar to Request 1
│ Each consumes 1 token
└─────────────────────────────────────────┐
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │ Tokens: 0 (empty)                       │
                        │ LastRefill: 1.0s                        │
                        └─────────────────────────────────────────┘

Request 11 (t=1.0s)
│ Check: tokens > 0? NO
│ Action: none
│ Result: REJECTED (429)
└─────────────────────────────────────────┐
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │ Tokens: 0 (still empty)                 │
                        │ LastRefill: 1.0s                        │
                        │ RetryAfter: 60s                         │
                        └─────────────────────────────────────────┘

Refill (t=1.1s, elapsed=0.1s)
│ TokensToAdd = floor(0.1s * 10 tokens/60s) = 0
│ No refill yet
└─────────────────────────────────────────┐
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │ Tokens: 0                               │
                        │ LastRefill: 1.0s                        │
                        └─────────────────────────────────────────┘

Refill (t=7.0s, elapsed=6.0s)
│ TokensToAdd = floor(6.0s * 10 tokens/60s) = 1
│ Tokens = min(0 + 1, 10) = 1
│ LastRefill = 7.0s
└─────────────────────────────────────────┐
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │ Tokens: 1                               │
                        │ LastRefill: 7.0s                        │
                        └─────────────────────────────────────────┘

Request 12 (t=7.0s)
│ Check: tokens > 0? YES
│ Action: tokens = 1 - 1 = 0
│ Result: ALLOWED
└─────────────────────────────────────────┐
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │ Tokens: 0                               │
                        │ LastRefill: 7.0s                        │
                        └─────────────────────────────────────────┘
```

## Redis Lua Script Execution

```
┌──────────────────────────────────────────────────────────────┐
│ Redis Lua Script Execution (Atomic)                          │
└──────────────────────────────────────────────────────────────┘

1. GET rate_limit:{userId}
   ├─ If exists: Parse {tokens, lastRefill}
   └─ If not: Initialize {tokens: capacity, lastRefill: now}

2. Calculate refill
   ├─ elapsed_ms = now - lastRefill
   ├─ tokens_to_add = floor(elapsed_ms * refill_rate)
   └─ tokens = min(tokens + tokens_to_add, capacity)

3. Check availability
   ├─ If tokens > 0:
   │  ├─ allowed = true
   │  └─ tokens = tokens - 1
   └─ Else:
      └─ allowed = false

4. Save state
   └─ SET rate_limit:{userId} {tokens, lastRefill} EX 120

5. Return
   └─ {allowed, remaining_tokens, reset_timestamp}
```

## Multi-User Isolation

```
Time: t=0s

User A                          User B
┌──────────────────┐           ┌──────────────────┐
│ Tokens: 10       │           │ Tokens: 10       │
│ Key: rate_limit  │           │ Key: rate_limit  │
│      :user-a     │           │      :user-b     │
└──────────────────┘           └──────────────────┘

Time: t=0.5s (User A makes 5 requests)

User A                          User B
┌──────────────────┐           ┌──────────────────┐
│ Tokens: 5        │           │ Tokens: 10       │
│ Independent      │           │ Unaffected by    │
│ limit            │           │ User A's requests│
└──────────────────┘           └──────────────────┘

Time: t=1.0s (User A exhausted, User B makes 8 requests)

User A                          User B
┌──────────────────┐           ┌──────────────────┐
│ Tokens: 0        │           │ Tokens: 2        │
│ Rate limited     │           │ Still has quota  │
│ (429 response)   │           │ (200 response)   │
└──────────────────┘           └──────────────────┘
```

## Response Header Timeline

```
Request 1 (Allowed)
┌─────────────────────────────────────────┐
│ X-RateLimit-Limit: 10                   │
│ X-RateLimit-Remaining: 9                │
│ X-RateLimit-Reset: 1700000060           │
└─────────────────────────────────────────┘

Request 5 (Allowed)
┌─────────────────────────────────────────┐
│ X-RateLimit-Limit: 10                   │
│ X-RateLimit-Remaining: 5                │
│ X-RateLimit-Reset: 1700000060           │
└─────────────────────────────────────────┘

Request 10 (Allowed)
┌─────────────────────────────────────────┐
│ X-RateLimit-Limit: 10                   │
│ X-RateLimit-Remaining: 0                │
│ X-RateLimit-Reset: 1700000060           │
└─────────────────────────────────────────┘

Request 11 (Rejected)
┌─────────────────────────────────────────┐
│ HTTP 429                                 │
│ X-RateLimit-Limit: 10                   │
│ X-RateLimit-Remaining: 0                │
│ X-RateLimit-Reset: 1700000060           │
│ Body: {                                  │
│   "error": "Too many requests",          │
│   "message": "Rate limit exceeded...",   │
│   "retryAfter": 45                       │
│ }                                        │
└─────────────────────────────────────────┘
```

## Configuration Impact

```
RATE_LIMIT_JOBS_PER_MINUTE=5 (Strict)
┌─────────────────────────────────────────┐
│ Capacity: 5 tokens                      │
│ Refill rate: 1 token per 12 seconds     │
│ Use case: High-security, low-volume     │
└─────────────────────────────────────────┘

RATE_LIMIT_JOBS_PER_MINUTE=10 (Default)
┌─────────────────────────────────────────┐
│ Capacity: 10 tokens                     │
│ Refill rate: 1 token per 6 seconds      │
│ Use case: Balanced, most deployments    │
└─────────────────────────────────────────┘

RATE_LIMIT_JOBS_PER_MINUTE=50 (Generous)
┌─────────────────────────────────────────┐
│ Capacity: 50 tokens                     │
│ Refill rate: 1 token per 1.2 seconds    │
│ Use case: High-volume, trusted users    │
└─────────────────────────────────────────┘
```

## Error Scenarios

```
Scenario 1: Redis Down
┌──────────────────────────────────────────┐
│ checkRateLimit() catches error           │
│ Returns: {allowed: true, ...}            │
│ Result: Request allowed (fail open)      │
│ Logging: Error logged to console         │
└──────────────────────────────────────────┘

Scenario 2: No User ID
┌──────────────────────────────────────────┐
│ X-User-ID not provided                   │
│ X-Forwarded-For not provided             │
│ req.ip not available                     │
│ Fallback: userId = 'unknown'             │
│ Result: All unauthenticated users share  │
│         same rate limit bucket           │
└──────────────────────────────────────────┘

Scenario 3: Concurrent Requests
┌──────────────────────────────────────────┐
│ Multiple requests from same user         │
│ Lua script ensures atomic execution      │
│ No race conditions                       │
│ Each request properly counted            │
└──────────────────────────────────────────┘
```
