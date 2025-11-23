# Credit System - Phase 5

## Overview

Phase 5 implements a complete credit system for job creation. Users start with free credits and can purchase more via Stripe. Jobs consume credits, and failed jobs can be refunded.

## Features

### Credit Management
- ✅ Default free credits (100 per user)
- ✅ Credit deduction on job creation
- ✅ Credit top-ups via Stripe
- ✅ Transaction history tracking
- ✅ Credit refunds for failed jobs
- ✅ Credit summary and statistics

### API Endpoints

#### GET /api/me/credits
Get user's credit balance and summary.

**Response:**
```json
{
  "currentBalance": 85,
  "totalSpent": 15,
  "totalEarned": 0,
  "totalTransactions": 1
}
```

#### GET /api/me/transactions
Get user's transaction history (paginated).

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Response:**
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

#### POST /api/credits/topup
Create a credit top-up session (Stripe).

**Request:**
```json
{
  "amount": 100
}
```

**Response:**
```json
{
  "sessionId": "cs_test_abc123...",
  "amount": 100,
  "currency": "usd",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_abc123...",
  "devTestUrl": "/api/credits/topup/confirm?sessionId=cs_test_abc123..."
}
```

#### POST /api/credits/topup/confirm
Confirm credit top-up (dev/test endpoint).

**Request:**
```json
{
  "sessionId": "cs_test_abc123...",
  "amount": 100
}
```

**Response:**
```json
{
  "message": "Top-up confirmed",
  "amount": 100,
  "newBalance": 200
}
```

#### POST /api/stripe/webhook
Stripe webhook for payment events.

**Payload:**
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_123...",
      "amount": 10000,
      "metadata": {
        "userId": "user-123"
      }
    }
  }
}
```

### Job Creation with Credits

When creating a job via `POST /api/generate-from-prompt`:

**Success (202):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
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

## Database Schema

### Users Table
Added `credits` column:
```sql
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 100;
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  job_id TEXT REFERENCES jobs(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
```

**Transaction Types:**
- `job_creation` - Credit deduction for job
- `topup` - Credit purchase via Stripe
- `refund` - Credit refund for failed job
- `stripe_payment` - Stripe payment processed
- `admin_grant` - Admin-granted credits

## Configuration

### Environment Variables

```bash
# Credit system
DEFAULT_FREE_CREDITS=100        # Credits per new user
JOB_COST=1                      # Credits per job
STRIPE_WEBHOOK_SECRET=whsec_... # Stripe webhook secret
```

### Stripe Integration

In production, configure Stripe:
1. Create Stripe account
2. Get API keys from dashboard
3. Set `STRIPE_WEBHOOK_SECRET` from webhook settings
4. Configure webhook endpoint: `POST /api/stripe/webhook`

## Usage Examples

### JavaScript/React

```javascript
// Get credit balance
const creditsRes = await fetch('/api/me/credits', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { currentBalance } = await creditsRes.json();

// Get transaction history
const transRes = await fetch('/api/me/transactions?limit=20', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { transactions } = await transRes.json();

// Create top-up session
const topupRes = await fetch('/api/credits/topup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ amount: 100 })
});
const { checkoutUrl } = await topupRes.json();
window.location.href = checkoutUrl;

// Confirm top-up (dev)
const confirmRes = await fetch('/api/credits/topup/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ sessionId: 'cs_test_...', amount: 100 })
});
```

### cURL

```bash
# Get credits
curl -X GET "http://localhost:3000/api/me/credits" \
  -H "Authorization: Bearer {accessToken}"

# Get transactions
curl -X GET "http://localhost:3000/api/me/transactions?limit=20" \
  -H "Authorization: Bearer {accessToken}"

# Create top-up
curl -X POST "http://localhost:3000/api/credits/topup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"amount":100}'

# Confirm top-up (dev)
curl -X POST "http://localhost:3000/api/credits/topup/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"sessionId":"cs_test_...","amount":100}'
```

## Frontend Integration

### Credit Counter Component

```javascript
import { useEffect, useState } from 'react';

export function CreditCounter() {
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    const fetchCredits = async () => {
      const res = await fetch('/api/me/credits', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      setCredits(data.currentBalance);
    };
    fetchCredits();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Credits:</span>
      <span className="text-lg font-bold text-purple-400">{credits}</span>
    </div>
  );
}
```

### 402 Error Handler

```javascript
async function createJob(prompt) {
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
    showTopupModal({
      required: data.requiredCredits,
      available: data.availableCredits
    });
    return;
  }

  if (!res.ok) {
    throw new Error('Job creation failed');
  }

  return res.json();
}
```

### Top-up Modal

```javascript
export function TopupModal({ required, available, onClose }) {
  const [amount, setAmount] = useState(required);

  const handleTopup = async () => {
    const res = await fetch('/api/credits/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ amount })
    });

    const data = await res.json();
    window.location.href = data.checkoutUrl;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md">
        <h2 className="text-xl font-bold mb-4">Insufficient Credits</h2>
        <p className="text-gray-400 mb-4">
          You need {required} credits but have {available}
        </p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value))}
          min={required}
          className="w-full bg-slate-900 border border-purple-500/30 rounded px-3 py-2 mb-4"
        />
        <button
          onClick={handleTopup}
          className="w-full bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded font-medium"
        >
          Top Up ${amount}
        </button>
      </div>
    </div>
  );
}
```

## Security Considerations

### Credit Deduction
- Checked before job creation
- Atomic transaction (deduct + record)
- Prevents negative balance
- Logged for audit trail

### Stripe Integration
- Webhook signature verification
- Metadata validation (userId)
- Idempotent operations
- Error handling and retries

### Rate Limiting
- Top-up amount validation (1-10000)
- Transaction history pagination
- Admin endpoints protected

## Testing

### Run Tests

```bash
npm test -- credits.test.js
```

### Test Coverage
- Get user credits
- Check sufficient credits
- Deduct credits with validation
- Add credits (top-up)
- Refund credits
- Transaction history
- Credit summary
- Integration workflows

### Manual Testing

```bash
# 1. Register user
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Check initial credits
curl -X GET "http://localhost:3000/api/me/credits" \
  -H "Authorization: Bearer {accessToken}"

# 3. Create job (should deduct 1 credit)
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"prompt":"test"}'

# 4. Check credits again
curl -X GET "http://localhost:3000/api/me/credits" \
  -H "Authorization: Bearer {accessToken}"

# 5. Create top-up
curl -X POST "http://localhost:3000/api/credits/topup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"amount":50}'

# 6. Confirm top-up (dev)
curl -X POST "http://localhost:3000/api/credits/topup/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"sessionId":"cs_test_...","amount":50}'

# 7. Check final credits
curl -X GET "http://localhost:3000/api/me/credits" \
  -H "Authorization: Bearer {accessToken}"
```

## Error Handling

### 402 Payment Required
```json
{
  "error": "insufficient_credits",
  "message": "Insufficient credits. Required: 1, Available: 0",
  "requiredCredits": 1,
  "availableCredits": 0
}
```

### 400 Bad Request
```json
{
  "error": "invalid_amount",
  "message": "Amount must be between 1 and 10000"
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "error details"
}
```

## Future Enhancements

1. **Subscription Plans:** Monthly credit allowances
2. **Bulk Discounts:** Cheaper per-credit rates for large purchases
3. **Promotional Codes:** Discount codes for credits
4. **Credit Expiry:** Credits expire after X days
5. **Usage Analytics:** Detailed usage reports
6. **Credit Sharing:** Share credits between users
7. **Referral Bonuses:** Credits for referrals
8. **Free Trial:** Extended trial period for new users
9. **Seasonal Promotions:** Limited-time credit offers
10. **Credit Tiers:** Different pricing for different credit amounts

## Troubleshooting

### "Insufficient Credits" Error
- Check current balance: `GET /api/me/credits`
- Top-up credits: `POST /api/credits/topup`
- Confirm top-up: `POST /api/credits/topup/confirm`

### Top-up Not Working
- Verify Stripe webhook secret is set
- Check webhook endpoint is accessible
- Review Stripe dashboard for payment status

### Transaction Not Recorded
- Verify database has transactions table
- Check user_id is set correctly
- Review database logs

## Files

### Backend
- `mangamotion/backend/src/credits/credits.js` - Core logic
- `mangamotion/backend/src/credits/routes.js` - API endpoints
- `mangamotion/backend/src/credits/credits.test.js` - Tests

### Documentation
- `CREDIT_SYSTEM_README.md` - This file
- `CREDIT_SYSTEM_QUICKSTART.md` - Quick start guide

## Support

For issues or questions, refer to the main project README or contact the development team.
