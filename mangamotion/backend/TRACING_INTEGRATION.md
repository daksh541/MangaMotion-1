# OpenTelemetry Tracing Integration Guide

## Overview

This guide explains how to integrate OpenTelemetry tracing into your MangaMotion application.

## What's Already Integrated

### Backend (src/server.js)
- ✅ Tracing initialization
- ✅ HTTP middleware for automatic tracing
- ✅ POST /api/presign endpoint tracing
- ✅ POST /api/upload endpoint tracing
- ✅ Error recording

### Workers (src/queue/workers/scan-worker.js)
- ✅ Worker span creation
- ✅ Job attributes
- ✅ Error handling

## Architecture

### Trace Flow

```
Client Request
    ↓
HTTP Middleware (automatic)
    ├── Span: HTTP POST /api/upload
    ├── Attributes: method, url, user_agent, user.id
    └── Status: success/error
    
Application Logic (manual)
    ├── Span: upload
    ├── Attributes: user.id, file.count, job.id
    └── Child Spans: queueAdd, queueScan
    
Worker Processing (manual)
    ├── Span: worker.scan
    ├── Attributes: job.id, file.count, attempt
    └── Child Spans: scanner.checkFiles
    
Jaeger Export (automatic)
    └── Batched UDP to Jaeger collector
```

## Configuration

### Environment Variables

```bash
# Enable/disable tracing
TRACING_ENABLED=true

# Jaeger configuration
JAEGER_HOST=localhost
JAEGER_PORT=6831
JAEGER_SAMPLER=const
JAEGER_SAMPLER_PARAM=1.0
SERVICE_NAME=mangamotion-backend
```

### Sampler Types

| Type | Parameter | Use Case |
|------|-----------|----------|
| const | 0 or 1 | Always off/on |
| probabilistic | 0.0-1.0 | Percentage sampling |
| rateLimiting | traces/sec | Max traces per second |
| remote | - | Get from Jaeger agent |

## Integration Steps

### 1. Install Dependencies

```bash
npm install
```

Dependencies added to package.json:
- @opentelemetry/api
- @opentelemetry/sdk-node
- @opentelemetry/auto-instrumentations-node
- @opentelemetry/sdk-trace-base
- @opentelemetry/exporter-trace-jaeger
- @opentelemetry/core
- @opentelemetry/propagator-jaeger
- @opentelemetry/instrumentation

### 2. Start Jaeger

```bash
# Docker
docker run -d \
  --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Or Docker Compose
docker-compose -f docker-compose.tracing.yml up -d
```

### 3. Configure Environment

Create `.env`:

```bash
TRACING_ENABLED=true
JAEGER_HOST=localhost
JAEGER_PORT=6831
JAEGER_SAMPLER=const
JAEGER_SAMPLER_PARAM=1.0
SERVICE_NAME=mangamotion-backend
```

### 4. Start Backend

```bash
npm start
```

### 5. Generate Traces

```bash
# Presign
curl -X POST http://localhost:3000/api/presign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "fileSizeBytes": 1024000
  }'

# Upload
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-ID: user-123" \
  -F "pages=@test.jpg"
```

### 6. View in Jaeger

Open http://localhost:16686

## Adding Custom Spans

### Span in API Endpoint

```javascript
const { withSpan, setAttribute } = require('./tracing');

app.post('/api/custom', async (req, res) => {
  return withSpan('custom_operation', async () => {
    setAttribute('user.id', req.headers['x-user-id']);
    setAttribute('operation', 'custom');
    
    // Your logic here
    
    return res.json({ status: 'ok' });
  });
});
```

### Span in Worker

```javascript
const { withSpan, setAttribute } = require('./tracing');

const worker = new Worker('queue', async (job) => {
  return withSpan('worker.process', async () => {
    setAttribute('job.id', job.id);
    setAttribute('job.attempt', job.attemptsMade + 1);
    
    // Your logic here
    
    return result;
  });
});
```

### Span in Function

```javascript
const { withSpan, setAttribute, recordException } = require('./tracing');

async function processFile(filePath) {
  return withSpan('process_file', async () => {
    try {
      setAttribute('file.path', filePath);
      
      // Your logic here
      
      return result;
    } catch (err) {
      recordException(err);
      throw err;
    }
  });
}
```

## Attributes

### Standard Attributes

| Attribute | Type | Example |
|-----------|------|---------|
| user.id | string | "user-123" |
| job.id | string | "job-456" |
| file.name | string | "test.jpg" |
| file.count | number | 5 |
| file.size_bytes | number | 1024000 |
| operation | string | "upload" |
| error | string | "Validation failed" |

### HTTP Attributes (Automatic)

| Attribute | Type | Example |
|-----------|------|---------|
| http.method | string | "POST" |
| http.url | string | "/api/upload" |
| http.status_code | number | 200 |
| http.user_agent | string | "curl/7.64.1" |

### Adding Attributes

```javascript
const { setAttribute } = require('./tracing');

setAttribute('user.id', userId);
setAttribute('file.count', 5);
setAttribute('operation', 'upload');
```

## Error Handling

### Recording Exceptions

```javascript
const { recordException } = require('./tracing');

try {
  // Your code
} catch (err) {
  recordException(err);
  throw err;
}
```

### Error Attributes

Errors automatically include:
- Error message
- Stack trace
- Status: ERROR

## Sampling

### Development

Sample all traces:

```bash
JAEGER_SAMPLER=const
JAEGER_SAMPLER_PARAM=1.0
```

### Staging

Sample 50%:

```bash
JAEGER_SAMPLER=probabilistic
JAEGER_SAMPLER_PARAM=0.5
```

### Production

Sample 10%:

```bash
JAEGER_SAMPLER=probabilistic
JAEGER_SAMPLER_PARAM=0.1
```

Or limit to 100 traces/sec:

```bash
JAEGER_SAMPLER=rateLimiting
JAEGER_SAMPLER_PARAM=100
```

## Correlation with Logging

### Add Trace ID to Logs

```javascript
const { trace } = require('@opentelemetry/api');
const { logger } = require('./logger');

const span = trace.getActiveSpan();
const traceId = span?.spanContext().traceId;

logger.info('Operation', {
  trace_id: traceId,
  user_id: userId
});
```

### Example Log with Trace ID

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Job created",
  "job_id": "job-123",
  "trace_id": "abc123def456",
  "user_id": "user-456"
}
```

## Monitoring

### Jaeger Queries

**Find all uploads:**
```
service.name="mangamotion-backend" AND operation="POST /api/upload"
```

**Find failed operations:**
```
service.name="mangamotion-backend" AND error=true
```

**Find slow operations (>1s):**
```
service.name="mangamotion-backend" AND duration>1000ms
```

**Find by user:**
```
service.name="mangamotion-backend" AND user.id="user-123"
```

### Metrics from Traces

- **Request rate**: Traces per second
- **Error rate**: Failed traces / total traces
- **Latency**: Span duration percentiles
- **Service dependencies**: Span relationships

## Performance Tuning

### Reduce Overhead

1. **Lower sampling rate**:
   ```bash
   JAEGER_SAMPLER_PARAM=0.1
   ```

2. **Batch export**:
   - Default: 512 spans per batch
   - Interval: 5 seconds

3. **Disable in tests**:
   ```bash
   TRACING_ENABLED=false
   ```

### Memory Management

- Spans are batched before export
- Default batch size: 512 spans
- Memory per span: ~100 bytes
- Max queue: 2048 spans

## Troubleshooting

### No Traces in Jaeger

1. **Check Jaeger is running**:
   ```bash
   docker ps | grep jaeger
   ```

2. **Check configuration**:
   ```bash
   echo $JAEGER_HOST
   echo $JAEGER_PORT
   ```

3. **Check backend logs**:
   ```bash
   npm start 2>&1 | grep Tracing
   ```

4. **Test connection**:
   ```bash
   telnet localhost 6831
   ```

### High Memory Usage

1. **Reduce sampling**:
   ```bash
   JAEGER_SAMPLER=probabilistic
   JAEGER_SAMPLER_PARAM=0.1
   ```

2. **Increase batch size**:
   - Edit src/tracing.js
   - Increase maxQueueSize

3. **Disable tracing**:
   ```bash
   TRACING_ENABLED=false
   ```

### Missing Attributes

1. **Check span is active**:
   ```javascript
   const span = trace.getActiveSpan();
   if (!span) console.log('No active span');
   ```

2. **Use correct attribute names**:
   ```javascript
   setAttribute('user.id', userId);  // Correct
   setAttribute('userId', userId);   // Wrong format
   ```

3. **Set before span ends**:
   ```javascript
   // Correct
   setAttribute('job.id', jobId);
   return result;
   
   // Wrong
   return result;
   setAttribute('job.id', jobId);  // Too late
   ```

## Advanced Topics

### Custom Propagators

Add custom header propagation:

```javascript
const { CompositePropagator } = require('@opentelemetry/core');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');

const propagator = new CompositePropagator({
  propagators: [
    new W3CTraceContextPropagator(),
    // Add custom propagators
  ]
});
```

### Multiple Exporters

Export to multiple backends:

```javascript
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { JaegerExporter } = require('@opentelemetry/exporter-trace-jaeger');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

tracerProvider.addSpanProcessor(
  new BatchSpanProcessor(new JaegerExporter())
);
tracerProvider.addSpanProcessor(
  new BatchSpanProcessor(new OTLPTraceExporter())
);
```

### Span Processors

Control span processing:

```javascript
// Batch processor (production)
new BatchSpanProcessor(exporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000
});

// Simple processor (testing)
new SimpleSpanProcessor(exporter);
```

## Best Practices

1. **Initialize early**: Call initializeTracing() first
2. **Use meaningful names**: "upload", "worker.scan", not "operation"
3. **Add relevant attributes**: user.id, job.id, file.count
4. **Record exceptions**: Use recordException() for errors
5. **Sample in production**: Use probabilistic or rateLimiting
6. **Correlate with logs**: Include trace_id in logs
7. **Monitor latency**: Use Jaeger to find slow operations
8. **Test tracing**: Verify traces appear in Jaeger

## References

- [OpenTelemetry Node.js](https://github.com/open-telemetry/opentelemetry-js)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Best Practices](https://opentelemetry.io/docs/reference/specification/protocol/exporter/)

## Summary

✅ **Complete tracing integration** with OpenTelemetry
✅ **Jaeger visualization** for trace analysis
✅ **Automatic HTTP instrumentation**
✅ **Manual span creation** for business logic
✅ **Error tracking** with exceptions
✅ **Configurable sampling** for production
✅ **Production-ready** implementation

**Status: READY FOR PRODUCTION** 🚀
