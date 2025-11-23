# Credit System - Quick Start

## 5-Minute Setup

### 1. Environment Variables

```bash
# .env
DEFAULT_FREE_CREDITS=100
JOB_COST=1
STRIPE_WEBHOOK_SECRET=whsec_test_secret
```

### 2. Database Migration

```bash
cd mangamotion/backend
npm run migrate
```

This adds the `credits` column to users and creates the transactions table.

### 3. Start Backend

```bash
npm start
```

### 4. Test Endpoints

**Get credit balance:**
```bash
curl -X GET "http://localhost:3000/api/me/credits" \
  -H "Authorization: Bearer {accessToken}"
```

**Get transaction history:**
```bash
curl -X GET "http://localhost:3000/api/me/transactions" \
  -H "Authorization: Bearer {accessToken}"
```

**Create job (deducts 1 credit):**
```bash
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"prompt":"test prompt"}'
```

**Create top-up:**
```bash
curl -X POST "http://localhost:3000/api/credits/topup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"amount":100}'
```

**Confirm top-up (dev):**
```bash
curl -X POST "http://localhost:3000/api/credits/topup/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"sessionId":"cs_test_...","amount":100}'
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/me/credits` | Get credit balance | Required |
| GET | `/api/me/transactions` | Get transaction history | Required |
| POST | `/api/credits/topup` | Create top-up session | Required |
| POST | `/api/credits/topup/confirm` | Confirm top-up (dev) | Required |
| POST | `/api/stripe/webhook` | Stripe webhook | None |

## Response Format

**Credit Balance:**
```json
{
  "currentBalance": 99,
  "totalSpent": 1,
  "totalEarned": 0,
  "totalTransactions": 1
}
```

**Transactions:**
```json
{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "jobId": "job-123",
      "amount": -1,
      "type": "job_creation",
      "description": "Job creation - Job: job-123",
      "createdAt": "2025-11-23T18:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

**Top-up Session:**
```json
{
  "sessionId": "cs_test_abc123...",
  "amount": 100,
  "currency": "usd",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_abc123...",
  "devTestUrl": "/api/credits/topup/confirm?sessionId=cs_test_abc123..."
}
```

**Insufficient Credits (402):**
```json
{
  "error": "insufficient_credits",
  "message": "Insufficient credits. Required: 1, Available: 0",
  "requiredCredits": 1,
  "availableCredits": 0
}
```

## Run Tests

```bash
npm test -- credits.test.js
```

## Key Files

| File | Purpose |
|------|---------|
| `mangamotion/backend/src/credits/credits.js` | Core logic |
| `mangamotion/backend/src/credits/routes.js` | API endpoints |
| `mangamotion/backend/src/credits/credits.test.js` | Tests |

## Features

✅ Default 100 free credits per user
✅ 1 credit per job
✅ Credit deduction on job creation
✅ 402 Payment Required on insufficient credits
✅ Credit top-ups via Stripe
✅ Transaction history tracking
✅ Credit refunds for failed jobs
✅ Credit summary and statistics
✅ Stripe webhook integration
✅ Admin credit grants

## Workflow

1. **User registers** → Gets 100 free credits
2. **User creates job** → 1 credit deducted, transaction recorded
3. **User runs out of credits** → 402 error on job creation
4. **User initiates top-up** → Stripe session created
5. **User completes payment** → Credits added via webhook
6. **User can create more jobs** → Credits deducted again

## Frontend Integration

### Display Credit Counter
```javascript
const [credits, setCredits] = useState(null);

useEffect(() => {
  fetch('/api/me/credits', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  .then(r => r.json())
  .then(d => setCredits(d.currentBalance));
}, []);

return <div>Credits: {credits}</div>;
```

### Handle 402 Error
```javascript
const res = await fetch('/api/generate-from-prompt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ prompt })
});

if (res.status === 402) {
  const data = await res.json();
  showTopupModal(data.requiredCredits, data.availableCredits);
}
```

### Initiate Top-up
```javascript
const res = await fetch('/api/credits/topup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ amount: 100 })
});

const { checkoutUrl } = await res.json();
window.location.href = checkoutUrl;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insufficient credits" | Top-up via /api/credits/topup |
| Job creation fails with 402 | Check available credits |
| Top-up not working | Verify Stripe webhook secret |
| Transaction not recorded | Check database transactions table |

## Next Steps

1. Integrate credit counter into UI
2. Add top-up modal for 402 errors
3. Display transaction history
4. Implement Stripe webhook in production
5. Add credit analytics

## Documentation

- Full docs: `CREDIT_SYSTEM_README.md`
- Backend: `mangamotion/backend/src/credits/credits.js`
- Routes: `mangamotion/backend/src/credits/routes.js`
