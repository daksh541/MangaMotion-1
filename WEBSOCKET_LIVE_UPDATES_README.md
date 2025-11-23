# WebSocket Live Updates - Phase 7

## Overview

Phase 7 implements real-time job progress updates using WebSocket with Redis pub/sub for horizontal scaling. Clients receive live progress updates without polling.

## Architecture

### Components

```
Frontend Client
    ↓
WebSocket Connection (ws://localhost/ws?token=...)
    ↓
WebSocket Server (ws-server.js)
    ↓
Redis Pub/Sub
    ↓
Worker (publishes updates)
```

### Message Flow

```
Worker Updates Job Progress
    ↓
publishJobProgress(jobId, userId, status, progress, stage, message)
    ↓
Redis Publish: job:{jobId}
    ↓
WebSocket Server Receives
    ↓
Broadcast to User's Connected Clients
    ↓
Frontend Receives Real-Time Update
```

## Components

### WebSocket Server (ws-server.js)

**Features:**
- JWT authentication on connection
- Redis pub/sub integration
- Automatic reconnection handling
- Connection statistics
- Graceful error handling

**Key Methods:**
- `setupWebSocketHandlers()` - Connection management
- `setupRedisHandlers()` - Pub/sub integration
- `broadcastToUser()` - Send to specific user
- `broadcastToAll()` - Send to all users
- `publishJobUpdate()` - Publish via Redis
- `getStats()` - Connection statistics

### Frontend Hook (useJobProgress.js)

**Features:**
- WebSocket connection with fallback to polling
- Automatic reconnection
- Real-time progress updates
- Error handling
- Connection status tracking

**Usage:**
```javascript
const { progress, status, stage, message, isConnected, usingWebSocket } = useJobProgress(
  jobId,
  accessToken,
  { enableWebSocket: true, enablePolling: true }
);
```

## Message Format

### Client → Server

**Subscribe to Job:**
```json
{
  "type": "subscribe",
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Ping:**
```json
{
  "type": "ping"
}
```

### Server → Client

**Connected:**
```json
{
  "type": "connected",
  "message": "Connected to live updates",
  "timestamp": "2025-11-24T00:15:30.123Z"
}
```

**Progress Update:**
```json
{
  "type": "progress",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "status": "processing",
  "progress": 45,
  "stage": "inference",
  "message": "Running model inference...",
  "timestamp": "2025-11-24T00:15:30.123Z"
}
```

**Error:**
```json
{
  "type": "error",
  "error": "Invalid message format",
  "timestamp": "2025-11-24T00:15:30.123Z"
}
```

## Configuration

### Environment Variables

```bash
# Redis
REDIS_URL=redis://127.0.0.1:6379

# WebSocket
WS_PATH=/ws
WS_ENABLED=true

# Node
NODE_ENV=production
```

### Backend Setup

```javascript
// In server.js
const http = require('http');
const { initializeWebSocket } = require('./websocket');

const httpServer = http.createServer(app);
const wsServer = initializeWebSocket(httpServer, {
  path: '/ws',
  redisUrl: process.env.REDIS_URL
});

httpServer.listen(3000);
```

## Usage

### Frontend Integration

```javascript
import { useJobProgress } from './hooks/useJobProgress';

export function JobProgressDisplay({ jobId, accessToken }) {
  const { progress, status, stage, message, isConnected, usingWebSocket } = useJobProgress(
    jobId,
    accessToken,
    {
      enableWebSocket: true,
      enablePolling: true,
      pollInterval: 2000
    }
  );

  return (
    <div>
      <div className="progress-bar">
        <div style={{ width: `${progress}%` }}>{progress}%</div>
      </div>
      <p>Status: {status}</p>
      <p>Stage: {stage}</p>
      <p>Message: {message}</p>
      <p>Connected: {isConnected ? '✓' : '✗'}</p>
      <p>Using: {usingWebSocket ? 'WebSocket' : 'Polling'}</p>
    </div>
  );
}
```

### Backend Publishing

```javascript
const { publishJobProgress } = require('./websocket');

// In pipeline or worker
await publishJobProgress(
  wsServer,
  jobId,
  userId,
  'processing',
  45,
  'inference',
  'Running model inference...'
);
```

## Connection Flow

### 1. Client Connects

```
Client: ws://localhost/ws?token=eyJhbGc...
Server: Validates token
Server: Sends "connected" message
```

### 2. Client Subscribes

```
Client: { type: "subscribe", data: { jobId: "..." } }
Server: Confirms subscription
```

### 3. Server Publishes Update

```
Worker: publishJobProgress(jobId, userId, status, progress, stage, message)
Redis: Publish to job:{jobId}
Server: Receives message
Server: Broadcasts to user's clients
Client: Receives progress update
```

### 4. Client Disconnects

```
Client: Closes connection
Server: Removes from clients map
Server: Attempts reconnection on client side
```

## Horizontal Scaling

### Multi-Instance Setup

```
Client 1 ─┐
Client 2 ─┼─→ Load Balancer ─→ Server Instance 1 ─┐
Client 3 ─┘                     Server Instance 2 ─┼─→ Redis Pub/Sub
                                Server Instance 3 ─┘
                                
Worker publishes to Redis → All instances receive → Broadcast to connected clients
```

### Redis Pub/Sub

- Each server instance subscribes to `job:*` pattern
- Worker publishes to `job:{jobId}` channel
- All instances receive and broadcast to their connected clients
- No shared state between instances

## Error Handling

### Connection Errors

```javascript
// Automatic reconnection
ws.onclose = () => {
  setTimeout(() => {
    connectWebSocket(); // Retry after 5 seconds
  }, 5000);
};
```

### Message Errors

```javascript
// Server validates and sends error
if (!isValidMessage(data)) {
  ws.send(JSON.stringify({
    type: 'error',
    error: 'Invalid message format'
  }));
}
```

### Fallback to Polling

```javascript
// If WebSocket fails, fall back to polling
if (!usingWebSocket && enablePolling) {
  setInterval(pollProgress, pollInterval);
}
```

## Performance Optimization

### Connection Pooling

- Reuse WebSocket connections
- One connection per user
- Multiple tabs share same connection

### Message Batching

- Batch multiple updates
- Send once per second
- Reduce network overhead

### Selective Broadcasting

- Only broadcast to relevant users
- Filter by jobId and userId
- Reduce unnecessary messages

## Monitoring

### Connection Statistics

```bash
curl http://localhost:3000/api/ws/stats
```

**Response:**
```json
{
  "totalUsers": 5,
  "totalClients": 8,
  "clientsByUser": [
    { "userId": "user-1", "connections": 2 },
    { "userId": "user-2", "connections": 1 }
  ]
}
```

### Logs

```
[WebSocket] New connection attempt from 127.0.0.1
[WebSocket] Client authenticated: user-123
[WebSocket] Client subscribed to job abc-123
[WebSocket] Published to job:abc-123
[WebSocket] Broadcast to 2/2 clients for user user-123
[WebSocket] Client disconnected: user-123
```

## Testing

### Manual Testing

```bash
# 1. Get access token
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Create job
curl -X POST "http://localhost:3000/api/generate-from-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{"prompt":"test"}'

# 3. Connect WebSocket (using wscat or similar)
wscat -c "ws://localhost:3000/ws?token={accessToken}"

# 4. Subscribe to job
{"type":"subscribe","data":{"jobId":"{jobId}"}}

# 5. Watch for progress updates
```

### Browser Console

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/ws?token=' + accessToken);

ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = () => console.log('Closed');

// Subscribe to job
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { jobId: 'job-id' }
}));
```

## Security Considerations

### Authentication

- JWT token required on connection
- Token validated before accepting messages
- Invalid tokens rejected immediately

### Authorization

- Users only receive updates for their own jobs
- Redis channel filtering by userId
- No cross-user message leakage

### Rate Limiting

- Limit message frequency per client
- Prevent message flooding
- Graceful disconnect on abuse

## Future Enhancements

1. **Message Compression** - Compress large messages
2. **Binary Protocol** - Use binary format instead of JSON
3. **Message Queue** - Queue messages for offline clients
4. **Presence** - Show who's viewing what job
5. **Notifications** - Push notifications for job completion
6. **Analytics** - Track connection patterns
7. **Custom Events** - Allow custom event types
8. **Rate Limiting** - Per-user message limits

## Troubleshooting

### WebSocket Connection Fails

- Check Redis is running
- Verify token is valid
- Check firewall allows WebSocket
- Check browser console for errors

### No Progress Updates

- Verify worker is publishing updates
- Check Redis pub/sub is working
- Verify client is subscribed to job
- Check browser console for errors

### High Memory Usage

- Check for connection leaks
- Verify clients disconnect properly
- Monitor Redis memory usage
- Check for message queue buildup

## Files

### Backend
- `mangamotion/backend/src/websocket/ws-server.js` - WebSocket server
- `mangamotion/backend/src/websocket/index.js` - Integration

### Frontend
- `mangamotion/frontend/src/hooks/useJobProgress.js` - React hook

### Documentation
- `WEBSOCKET_LIVE_UPDATES_README.md` - This file
- `WEBSOCKET_LIVE_UPDATES_QUICKSTART.md` - Quick start guide

## Support

For issues or questions, refer to the main project README or contact the development team.
