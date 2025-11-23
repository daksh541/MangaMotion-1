# Authentication - Quick Start

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd mangamotion/backend
npm install bcrypt jsonwebtoken cookie-parser
```

### 2. Run Migrations

```bash
npm run migrate
```

This creates the `users` and `transactions` tables.

### 3. Start Backend

```bash
npm start
```

### 4. Register User

```bash
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securePassword123"}' \
  -c cookies.txt
```

**Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. Get Current User

```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer {accessToken}"
```

**Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "credits": 100,
  "createdAt": "2025-11-23T18:30:00.000Z",
  "updatedAt": "2025-11-23T18:30:00.000Z"
}
```

### 6. Login

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securePassword123"}' \
  -c cookies.txt
```

### 7. Refresh Token

```bash
curl -X POST "http://localhost:3000/api/auth/token/refresh" \
  -b cookies.txt
```

### 8. Logout

```bash
curl -X POST "http://localhost:3000/api/auth/logout" \
  -b cookies.txt
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/token/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

## Key Files

| File | Purpose |
|------|---------|
| `mangamotion/backend/src/auth/auth.js` | Core auth logic |
| `mangamotion/backend/src/auth/routes.js` | Express routes |
| `mangamotion/backend/src/auth/auth.test.js` | Unit tests |
| `mangamotion/backend/src/auth/routes.test.js` | Integration tests |
| `mangamotion/backend/migrations/create_users.sql` | Database schema |

## Run Tests

```bash
npm test -- auth.test.js
npm test -- routes.test.js
```

## Environment Variables

```bash
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_COST=12
```

## Middleware Usage

### Require Authentication

```javascript
const { authRequired } = require('./auth/auth');

app.get('/api/protected', authRequired, (req, res) => {
  res.json({ userId: req.user.userId });
});
```

### Optional Authentication

```javascript
const { authOptional } = require('./auth/auth');

app.get('/api/public', authOptional, (req, res) => {
  if (req.user) {
    res.json({ message: `Hello ${req.user.userId}` });
  } else {
    res.json({ message: 'Hello anonymous' });
  }
});
```

## Frontend Integration

### Store Token in Memory

```javascript
let accessToken = null;

// After login/register
accessToken = response.accessToken;

// Use in API calls
fetch('/api/protected', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### Refresh Token Automatically

```javascript
async function fetchWithRefresh(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshRes = await fetch('/api/auth/token/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (refreshRes.ok) {
      const { accessToken: newToken } = await refreshRes.json();
      accessToken = newToken;

      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }
  }

  return response;
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid email format" | Use valid email (user@domain.com) |
| "Password must be at least 8 characters" | Use password with 8+ chars |
| "Email already registered" | Use different email or login |
| "Rate limited" | Wait 15 minutes before retry |
| "Invalid token" | Refresh token or re-login |

## Next Steps

1. Integrate with frontend (Login/Register pages)
2. Protect job creation endpoints with authRequired
3. Add user-jobs relationship (Phase 4)
4. Implement credit system (Phase 5)

## Documentation

- Full docs: `AUTH_SYSTEM_README.md`
- Backend auth: `mangamotion/backend/src/auth/auth.js`
- Routes: `mangamotion/backend/src/auth/routes.js`
