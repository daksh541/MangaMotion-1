# WebSocket Live Updates - Quick Start

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd mangamotion/backend
npm install ws ioredis
```

### 2. Start Redis

```bash
docker run -d -p 6379:6379 redis:latest
```

### 3. Update Server (server.js)

```javascript
const http = require('http');
const { initializeWebSocket } = require('./src/websocket');

const httpServer = http.createServer(app);
const wsServer = initializeWebSocket(httpServer);

httpServer.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 4. Start Backend

```bash
npm start
```

### 5. Test WebSocket Connection

```bash
# Get access token
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Connect to WebSocket (using wscat)
npm install -g wscat
wscat -c "ws://localhost:3000/ws?token={accessToken}"

# Subscribe to job
{"type":"subscribe","data":{"jobId":"job-123"}}
```

## Frontend Integration

### 1. Use Hook

```javascript
import { useJobProgress } from './hooks/useJobProgress';

export function JobStatus({ jobId, accessToken }) {
  const { progress, status, stage, isConnected } = useJobProgress(jobId, accessToken);

  return (
    <div>
      <div className="progress-bar" style={{ width: `${progress}%` }}>
        {progress}%
      </div>
      <p>Status: {status}</p>
      <p>Stage: {stage}</p>
      <p>Connected: {isConnected ? '✓' : '✗'}</p>
    </div>
  );
}
```

### 2. Update ResultPage.jsx

```javascript
import { useJobProgress } from '../hooks/useJobProgress';

export default function ResultPage() {
  const { jobId } = useParams();
  const accessToken = localStorage.getItem('accessToken');
  
  const { progress, status, stage, message, isConnected } = useJobProgress(
    jobId,
    accessToken,
    { enableWebSocket: true, enablePolling: true }
  );

  return (
    <div>
      <div className="progress-bar">
        <div style={{ width: `${progress}%` }}>{progress}%</div>
      </div>
      <p>Status: {status}</p>
      <p>Stage: {stage}</p>
      <p>Message: {message}</p>
      <p>Connection: {isConnected ? 'WebSocket' : 'Polling'}</p>
    </div>
  );
}
```

## Environment Variables

```bash
# .env
REDIS_URL=redis://127.0.0.1:6379
WS_PATH=/ws
WS_ENABLED=true
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ws` | WebSocket | Real-time updates |
| `/api/ws/stats` | GET | Connection statistics |

## Message Types

**Client → Server:**
- `subscribe` - Subscribe to job updates
- `unsubscribe` - Unsubscribe from job
- `ping` - Keep-alive

**Server → Client:**
- `connected` - Connection established
- `progress` - Job progress update
- `subscribed` - Subscription confirmed
- `error` - Error message

## Run Tests

```bash
# Manual test
wscat -c "ws://localhost:3000/ws?token={accessToken}"

# Browser test
open http://localhost:3000
# Open DevTools Console
# Create job and watch progress updates
```

## Key Files

| File | Purpose |
|------|---------|
| `mangamotion/backend/src/websocket/ws-server.js` | WebSocket server |
| `mangamotion/backend/src/websocket/index.js` | Integration |
| `mangamotion/frontend/src/hooks/useJobProgress.js` | React hook |

## Features

✅ Real-time progress updates
✅ WebSocket with fallback to polling
✅ Redis pub/sub for scaling
✅ Automatic reconnection
✅ JWT authentication
✅ Connection statistics
✅ Error handling
✅ Graceful degradation

## Workflow

1. **Client Connects** → WebSocket with token
2. **Server Validates** → JWT verification
3. **Client Subscribes** → To job updates
4. **Worker Updates** → Publishes to Redis
5. **Server Broadcasts** → To connected clients
6. **Frontend Updates** → Real-time progress

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Check Redis is running |
| Invalid token | Verify access token |
| No updates | Check worker is publishing |
| High latency | Check network connection |
| Memory leak | Verify clients disconnect |

## Next Steps

1. Integrate hook into ResultPage
2. Update Dashboard with live updates
3. Add connection indicator UI
4. Implement message compression
5. Add presence tracking

## Documentation

- Full docs: `WEBSOCKET_LIVE_UPDATES_README.md`
- Server: `mangamotion/backend/src/websocket/ws-server.js`
- Hook: `mangamotion/frontend/src/hooks/useJobProgress.js`
