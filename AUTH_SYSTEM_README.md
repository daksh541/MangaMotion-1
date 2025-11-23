# Authentication System

## Overview

The authentication system provides secure user registration, login, and JWT-based session management with httpOnly refresh tokens. It uses bcrypt for password hashing and JWT for stateless authentication.

## Features

- **User Registration:** Create new accounts with email and password
- **User Login:** Authenticate with email and password
- **JWT Access Tokens:** Short-lived tokens for API access (15 minutes default)
- **Refresh Tokens:** Long-lived tokens stored in httpOnly cookies (7 days default)
- **Rate Limiting:** Prevent brute force attacks (5 attempts per 15 minutes)
- **Password Security:** Bcrypt hashing with cost factor 12
- **CORS-Safe:** httpOnly cookies prevent XSS token theft
- **Middleware:** Require or optional authentication for endpoints

## Endpoints

### POST /api/auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Validation:**
- Email must be valid format (RFC 5322)
- Password must be at least 8 characters
- Email must be unique

**Response (201 Created):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Set-Cookie:**
```
refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error Responses:**
- `400 Bad Request` - Missing fields or invalid email format
- `409 Conflict` - Email already registered
- `500 Internal Server Error` - Database error

### POST /api/auth/login

Authenticate user and get tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Set-Cookie:**
```
refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error Responses:**
- `400 Bad Request` - Missing fields
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limited (5 attempts per 15 minutes)
- `500 Internal Server Error` - Database error

### POST /api/auth/token/refresh

Get a new access token using refresh token.

**Request:**
- Refresh token must be in httpOnly cookie (automatic)

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid refresh token
- `500 Internal Server Error` - Server error

### POST /api/auth/logout

Logout user (clear refresh token).

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Set-Cookie:**
```
refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

### GET /api/auth/me

Get current authenticated user info.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "credits": 100,
  "createdAt": "2025-11-23T18:30:00.000Z",
  "updatedAt": "2025-11-23T18:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  credits INTEGER DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Fields:**
- `id`: UUIDv4 primary key
- `email`: Unique email address
- `password_hash`: bcrypt hash (cost 12)
- `credits`: User credit balance (default 100)
- `created_at`: ISO 8601 timestamp
- `updated_at`: ISO 8601 timestamp

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

**Fields:**
- `id`: UUIDv4 primary key
- `user_id`: Foreign key to users
- `job_id`: Optional foreign key to jobs
- `amount`: Credit amount (positive for top-up, negative for usage)
- `type`: 'topup', 'usage', 'refund'
- `description`: Human-readable description
- `created_at`: ISO 8601 timestamp

## JWT Token Format

### Access Token

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "access",
  "iat": 1700000000,
  "exp": 1700000900
}
```

**Expiry:** 15 minutes (configurable via JWT_EXPIRY env var)

### Refresh Token

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "iat": 1700000000,
  "exp": 1700604800
}
```

**Expiry:** 7 days (configurable via JWT_REFRESH_EXPIRY env var)

## Middleware

### authRequired

Require valid JWT access token.

```javascript
const { authRequired } = require('./auth/auth');

app.get('/api/protected', authRequired, (req, res) => {
  console.log(req.user.userId); // User ID from token
  res.json({ message: 'Protected resource' });
});
```

**Error Response:**
```json
{
  "error": "unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### authOptional

Optional JWT authentication (sets req.user if token provided).

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

## Usage Examples

### JavaScript/Node.js

```javascript
// Register
const registerRes = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123'
  }),
  credentials: 'include' // Include cookies
});

const { accessToken } = await registerRes.json();

// Use access token for API calls
const meRes = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const user = await meRes.json();
console.log(user);

// Refresh token (automatic via cookie)
const refreshRes = await fetch('/api/auth/token/refresh', {
  method: 'POST',
  credentials: 'include'
});

const { accessToken: newToken } = await refreshRes.json();

// Logout
await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
```

### cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securePassword123"}' \
  -c cookies.txt

# Get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer {accessToken}"

# Refresh token
curl -X POST http://localhost:3000/api/auth/token/refresh \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### Python

```python
import requests
import json

session = requests.Session()

# Register
resp = session.post('http://localhost:3000/api/auth/register', json={
    'email': 'user@example.com',
    'password': 'securePassword123'
})
access_token = resp.json()['accessToken']

# Get current user
resp = session.get('http://localhost:3000/api/auth/me', headers={
    'Authorization': f'Bearer {access_token}'
})
print(resp.json())

# Refresh token
resp = session.post('http://localhost:3000/api/auth/token/refresh')
access_token = resp.json()['accessToken']

# Logout
session.post('http://localhost:3000/api/auth/logout')
```

## Security Considerations

### Password Security

- **Bcrypt Cost:** 12 (configurable via BCRYPT_COST env var)
- **Minimum Length:** 8 characters
- **Hashing:** One-way bcrypt hashing, never stored in plain text

### Token Security

- **Access Token:** Short-lived (15 minutes), stored in memory
- **Refresh Token:** Long-lived (7 days), stored in httpOnly cookie
- **httpOnly:** Prevents XSS token theft
- **Secure Flag:** Only sent over HTTPS in production
- **SameSite:** Strict to prevent CSRF attacks

### Rate Limiting

- **Login Attempts:** 5 per IP per 15 minutes
- **Window:** Resets after 15 minutes of inactivity
- **Response:** 429 Too Many Requests

### Email Validation

- **Format:** RFC 5322 regex validation
- **Uniqueness:** Enforced at database level

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Password Hashing
BCRYPT_COST=12

# Database
DATABASE_FILE=/path/to/db.sqlite3

# Node Environment
NODE_ENV=production
```

## Testing

Run tests:

```bash
npm test -- auth.test.js
npm test -- routes.test.js
```

**Test Coverage:**
- Password hashing and comparison
- JWT token generation and verification
- User registration with validation
- User login with credentials
- Token refresh
- Rate limiting
- Middleware authentication
- Integration tests

## Deployment Notes

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random values
- [ ] Enable HTTPS (required for Secure flag on cookies)
- [ ] Set `BCRYPT_COST=12` or higher
- [ ] Configure rate limiting per your needs
- [ ] Set up database backups
- [ ] Monitor failed login attempts
- [ ] Implement account lockout after N failed attempts
- [ ] Add email verification for new accounts
- [ ] Implement password reset flow
- [ ] Add 2FA support

### Scaling Considerations

- **Stateless:** JWT tokens don't require server-side session storage
- **Horizontal Scaling:** Multiple backend instances can validate tokens independently
- **Token Revocation:** Consider token blacklist for logout (optional)
- **Refresh Token Rotation:** Implement rotating refresh tokens for enhanced security

## Future Enhancements

1. **Email Verification:** Verify email before account activation
2. **Password Reset:** Implement forgot password flow
3. **Two-Factor Authentication:** Add 2FA support
4. **OAuth Integration:** Support Google, GitHub login
5. **Account Lockout:** Lock account after N failed attempts
6. **Session Management:** Track active sessions
7. **Audit Logging:** Log all auth events
8. **IP Whitelisting:** Restrict login from specific IPs
9. **Device Fingerprinting:** Detect suspicious login locations
10. **Passwordless Auth:** Support magic links or WebAuthn

## Troubleshooting

### "Invalid email format"
- Verify email contains @ and domain
- Check for spaces or special characters

### "Password must be at least 8 characters"
- Use password with minimum 8 characters
- Include mix of uppercase, lowercase, numbers, symbols

### "Email already registered"
- Use different email address
- Or use login endpoint if account exists

### "Rate limited"
- Wait 15 minutes before trying again
- Check for brute force attempts

### "Invalid or expired token"
- Refresh token using /api/auth/token/refresh
- Re-login if refresh token expired

### "Missing authorization header"
- Include `Authorization: Bearer {token}` header
- Verify token format is correct

## Support

For issues or questions, refer to the main project README or contact the development team.
