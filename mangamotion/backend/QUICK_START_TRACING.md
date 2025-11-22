# Quick Start: OpenTelemetry Tracing with Jaeger

## 5-Minute Setup

### 1. Start Jaeger

```bash
# Option A: Docker (recommended)
docker run -d \
  --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Option B: Docker Compose
docker-compose -f docker-compose.tracing.yml up -d

# Option C: Homebrew (macOS)
brew install jaeger
jaeger-all-in-one
```

### 2. Configure Backend

Create `.env` file:

```bash
TRACING_ENABLED=true
JAEGER_HOST=localhost
JAEGER_PORT=6831
JAEGER_SAMPLER=const
JAEGER_SAMPLER_PARAM=1.0
SERVICE_NAME=mangamotion-backend
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Backend

```bash
npm start
```

Expected output:
```
[Tracing] Initialized with Jaeger at localhost:6831
Server listening on 3000
```

### 5. Generate Traces

```bash
# Presign a file
curl -X POST http://localhost:3000/api/presign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "fileSizeBytes": 1024000
  }'

# Upload files
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-ID: user-123" \
  -F "pages=@test.jpg" \
  -F "pages=@test2.jpg"
```

### 6. View Traces

Open http://localhost:16686

1. **Service**: Select "mangamotion-backend"
2. **Operation**: Select "POST /api/upload"
3. **Limit**: Set to 20
4. **Find Traces**: Click button

## Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| http://localhost:16686 | Jaeger UI |
| http://localhost:6831 | Jaeger agent (UDP) |
| http://localhost:14268 | Jaeger collector (HTTP) |

## Common Operations

### Find Traces by Operation

1. Service: "mangamotion-backend"
2. Operation: "POST /api/upload"
3. Click "Find Traces"

### Find Traces by User

1. Service: "mangamotion-backend"
2. Tags: Add "user.id = user-123"
3. Click "Find Traces"

### Find Failed Traces

1. Service: "mangamotion-backend"
2. Tags: Add "error = true"
3. Click "Find Traces"

### Find Slow Traces

1. Service: "mangamotion-backend"
2. Min Duration: "5000ms"
3. Click "Find Traces"

## Trace Structure

### Upload Trace

```
POST /api/upload (HTTP Middleware)
└── upload (Manual Span)
    ├── user.id: user-123
    ├── file.count: 2
    ├── file.total_size_mb: 5.2
    ├── job.id: job-abc123
    └── scan.queued: true
```

### Presign Trace

```
POST /api/presign (HTTP Middleware)
└── presign (Manual Span)
    ├── file.name: test.jpg
    ├── file.content_type: image/jpeg
    ├── file.size_bytes: 1024000
    └── s3.key: uuid_test.jpg
```

### Worker Trace

```
worker.scan (Manual Span)
├── job.id: scan-job-xyz
├── job.parent_id: job-abc123
├── file.count: 2
└── job.attempt: 1
```

## Configuration

### Development (Sample All)

```bash
JAEGER_SAMPLER=const
JAEGER_SAMPLER_PARAM=1.0
```

### Production (Sample 10%)

```bash
JAEGER_SAMPLER=probabilistic
JAEGER_SAMPLER_PARAM=0.1
```

### Production (Max 100 traces/sec)

```bash
JAEGER_SAMPLER=rateLimiting
JAEGER_SAMPLER_PARAM=100
```

## Troubleshooting

### Jaeger Not Running

```bash
# Check if running
docker ps | grep jaeger

# Start Jaeger
docker run -d \
  --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

### No Traces Appearing

1. Check backend logs for errors
2. Verify JAEGER_HOST and JAEGER_PORT
3. Check firewall allows UDP 6831
4. Verify TRACING_ENABLED=true

```bash
# Test connection
telnet localhost 6831
```

### High Memory Usage

Reduce sampling rate:

```bash
JAEGER_SAMPLER=probabilistic
JAEGER_SAMPLER_PARAM=0.1
```

## Jaeger UI Tips

### Timeline View
- Shows span duration and nesting
- Click span for details
- Hover for timing info

### Span Details
- Attributes: Key-value pairs
- Events: Span events
- Logs: Structured logs
- Status: Success/error

### Service Graph
- Shows service dependencies
- Click service for traces
- Hover for error rates

### Comparison
- Compare two traces
- Highlight differences
- Useful for debugging

## Example Traces

### Successful Upload

```
Trace ID: abc123def456
Duration: 1.25s
Status: OK

POST /api/upload (1.25s)
└── upload (1.24s)
    ├── user.id: user-123
    ├── file.count: 2
    ├── file.total_size_mb: 5.2
    ├── job.id: job-abc123
    └── scan.queued: true
```

### Failed Upload

```
Trace ID: xyz789abc123
Duration: 2.50s
Status: ERROR

POST /api/upload (2.50s) [ERROR]
└── upload (2.49s) [ERROR]
    ├── user.id: user-123
    ├── error: "Validation failed"
    └── error_stack: "..."
```

## Performance

- **Tracing overhead**: <1ms per span
- **Memory per span**: ~100 bytes
- **Export latency**: <100ms (batched)
- **CPU impact**: <1%

## Next Steps

1. **Integrate with logging**: Correlate trace IDs with logs
2. **Set up alerts**: Alert on error rates
3. **Configure sampling**: Adjust for production
4. **Add custom spans**: Instrument business logic
5. **Export to cloud**: Send traces to cloud provider

## Cleanup

```bash
# Stop Jaeger
docker stop jaeger
docker rm jaeger

# Or with Docker Compose
docker-compose -f docker-compose.tracing.yml down
```

## Documentation

- **OPENTELEMETRY_TRACING.md** - Complete reference
- **OpenTelemetry Docs**: https://opentelemetry.io/docs/
- **Jaeger Docs**: https://www.jaegertracing.io/docs/

## Support

For issues:
1. Check Jaeger is running
2. Verify configuration
3. Check backend logs
4. Review OPENTELEMETRY_TRACING.md
