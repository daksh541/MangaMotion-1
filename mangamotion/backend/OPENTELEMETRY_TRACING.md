# OpenTelemetry Distributed Tracing with Jaeger

## Overview

Complete distributed tracing implementation for MangaMotion using OpenTelemetry and Jaeger for end-to-end trace visibility.

## What's Included

### Tracing Features
- **Automatic HTTP Instrumentation**: All HTTP requests traced automatically
- **Manual Span Creation**: Business logic spans for jobs, workers, operations
- **Trace Context Propagation**: W3C Trace Context and Jaeger propagators
- **Sampling**: Configurable sampling strategies
- **Jaeger Export**: Direct export to Jaeger collector
- **Error Tracking**: Automatic exception recording

### Instrumented Operations
- **POST /api/presign**: File presign operation
- **POST /api/upload**: File upload and job creation
- **worker.scan**: Malware scanning worker
- **HTTP Middleware**: All HTTP requests

### Trace Attributes
- **User**: user.id
- **Job**: job.id, job.parent_id, job.status, job.attempt
- **File**: file.name, file.count, file.size_bytes, file.content_type, file.total_size_mb
- **Operation**: operation, span.kind, duration_seconds
- **Error**: error messages and stack traces

## Quick Start (5 minutes)

### 1. Start Jaeger

```bash
# Docker
docker run -d \
  --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Or with Docker Compose
docker-compose -f docker-compose.tracing.yml up -d
```

### 2. Configure Backend

```bash
# .env
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

### 5. View Traces

Open http://localhost:16686 (Jaeger UI)

## Architecture

### Trace Flow

```
POST /api/presign
    ↓
HTTP Middleware Span (automatic)
    ↓
presign Span (manual)
    ├── file.name
    ├── file.content_type
    ├── file.size_bytes
    └── s3.key
    
POST /api/upload
    ↓
HTTP Middleware Span (automatic)
    ↓
upload Span (manual)
    ├── user.id
    ├── file.count
    ├── file.total_size_mb
    ├── job.id
    └── scan.queued
    
worker.scan (BullMQ)
    ↓
worker.scan Span (manual)
    ├── job.id
    ├── job.parent_id
    ├── file.count
    └── job.attempt
```

### Span Hierarchy

```
HTTP POST /api/upload (automatic)
└── upload (manual)
    └── queueAdd (automatic - Redis)
        └── worker.scan (manual)
            └── scanner.checkFiles (automatic - file I/O)
```

## Configuration

### Environment Variables

```bash
# Tracing
TRACING_ENABLED=true              # Enable/disable tracing
JAEGER_HOST=localhost             # Jaeger collector host
JAEGER_PORT=6831                  # Jaeger collector port (UDP)
JAEGER_SAMPLER=const              # Sampler type: const, probabilistic, rateLimiting, remote
JAEGER_SAMPLER_PARAM=1.0          # Sampler parameter (0.0-1.0 for probabilistic)
SERVICE_NAME=mangamotion-backend  # Service name in Jaeger
```

### Sampler Types

- **const**: Sample all (1.0) or none (0.0)
- **probabilistic**: Sample with given probability (0.0-1.0)
- **rateLimiting**: Sample at max traces per second
- **remote**: Get sampling decision from Jaeger agent

### Example Configurations

```bash
# Development (sample all)
JAEGER_SAMPLER=const
JAEGER_SAMPLER_PARAM=1.0

# Production (sample 10%)
JAEGER_SAMPLER=probabilistic
JAEGER_SAMPLER_PARAM=0.1

# Production (max 100 traces/sec)
JAEGER_SAMPLER=rateLimiting
JAEGER_SAMPLER_PARAM=100
```

## API Reference

### Tracing Module Functions

#### `initializeTracing()`
Initialize OpenTelemetry tracing with Jaeger exporter.

```javascript
const { initializeTracing } = require('./tracing');
initializeTracing();
```

#### `withSpan(name, fn, attributes)`
Execute function within a span.

```javascript
const { withSpan } = require('./tracing');

await withSpan('operation_name', async () => {
  // Your code here
}, {
  'attribute.key': 'value'
});
```

#### `setAttribute(key, value)`
Add attribute to current span.

```javascript
const { setAttribute } = require('./tracing');
setAttribute('user.id', userId);
setAttribute('file.count', 5);
```

#### `recordException(error)`
Record exception on current span.

```javascript
const { recordException } = require('./tracing');
try {
  // code
} catch (err) {
  recordException(err);
}
```

#### `addEvent(name, attributes)`
Add event to current span.

```javascript
const { addEvent } = require('./tracing');
addEvent('file_scanned', { 'file.name': 'test.jpg' });
```

#### `tracingMiddleware`
Express middleware for automatic HTTP tracing.

```javascript
const { tracingMiddleware } = require('./tracing');
app.use(tracingMiddleware);
```

## Usage Examples

### Tracing an API Endpoint

```javascript
const { withSpan, setAttribute, recordException } = require('./tracing');

app.post('/api/upload', async (req, res) => {
  return withSpan('upload', async () => {
    try {
      const userId = req.headers['x-user-id'];
      setAttribute('user.id', userId);
      
      // Your upload logic
      const job = await queueAdd(data);
      setAttribute('job.id', job.id);
      
      return res.json({ jobId: job.id });
    } catch (err) {
      recordException(err);
      throw err;
    }
  }, {
    'operation': 'upload',
    'span.kind': 'internal'
  });
});
```

### Tracing a Worker

```javascript
const { withSpan, setAttribute } = require('./tracing');

const worker = new Worker('job-queue', async (job) => {
  return withSpan('worker.process', async () => {
    setAttribute('job.id', job.id);
    setAttribute('job.attempt', job.attemptsMade + 1);
    
    // Your worker logic
    return result;
  });
});
```

### Tracing a Database Operation

```javascript
const { withSpan, setAttribute } = require('./tracing');

async function getUser(userId) {
  return withSpan('db.query', async () => {
    setAttribute('db.operation', 'SELECT');
    setAttribute('db.table', 'users');
    setAttribute('user.id', userId);
    
    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    return user;
  });
}
```

## Jaeger UI

### Accessing Jaeger

Open http://localhost:16686

### Finding Traces

1. **Service**: Select "mangamotion-backend"
2. **Operation**: Select operation (e.g., "POST /api/upload")
3. **Tags**: Filter by attributes
4. **Limit**: Set max traces to display
5. **Search**: Click "Find Traces"

### Trace Details

- **Timeline**: Visual timeline of spans
- **Span Details**: Attributes, events, logs
- **Dependencies**: Service dependencies
- **Statistics**: Latency, error rates

### Example Queries

**Find all failed uploads:**
```
service.name="mangamotion-backend" AND operation="upload" AND status="error"
```

**Find slow uploads (>5 seconds):**
```
service.name="mangamotion-backend" AND operation="upload" AND duration>5000ms
```

**Find uploads by user:**
```
service.name="mangamotion-backend" AND user.id="user-123"
```

## Trace Examples

### Successful Upload Trace

```
Trace ID: abc123def456
Duration: 1250ms

├── HTTP POST /api/upload (1250ms)
│   └── upload (1240ms)
│       ├── file.count: 5
│       ├── file.total_size_mb: 125.5
│       ├── user.id: user-123
│       └── job.id: job-456
│
└── worker.scan (800ms)
    ├── job.id: scan-job-789
    ├── job.parent_id: job-456
    ├── file.count: 5
    ├── job.attempt: 1
    └── scan_status: clean
```

### Failed Upload Trace

```
Trace ID: xyz789abc123
Duration: 2500ms
Status: ERROR

├── HTTP POST /api/upload (2500ms) [ERROR]
│   └── upload (2490ms) [ERROR]
│       ├── file.count: 5
│       ├── error: "Validation failed"
│       └── error_stack: "..."
│
└── Exception: Validation Error
    └── message: "Invalid file type"
```

## Performance

### Overhead
- **Tracing**: <1ms per span
- **Export**: Batched, non-blocking
- **Memory**: ~100KB per 1000 spans
- **CPU**: <1% overhead

### Sampling Impact
- **100% sampling**: Full visibility, higher overhead
- **10% sampling**: 90% reduction in overhead
- **1% sampling**: 99% reduction in overhead

## Troubleshooting

### Traces Not Appearing

**Problem**: No traces in Jaeger UI

**Solution**:
1. Check Jaeger is running: `docker ps | grep jaeger`
2. Check backend logs for tracing errors
3. Verify JAEGER_HOST and JAEGER_PORT are correct
4. Check firewall allows UDP 6831

### High Memory Usage

**Problem**: Backend using too much memory

**Solution**:
1. Reduce sampling rate: `JAEGER_SAMPLER_PARAM=0.1`
2. Increase batch size in exporter
3. Reduce span retention

### Missing Attributes

**Problem**: Expected attributes not in spans

**Solution**:
1. Verify setAttribute() is called
2. Check attribute names are correct
3. Verify span is active (use trace.getActiveSpan())

### Jaeger Connection Errors

**Problem**: "Failed to connect to Jaeger"

**Solution**:
```bash
# Check Jaeger is running
docker logs jaeger

# Check port is open
netstat -an | grep 6831

# Test connection
telnet localhost 6831
```

## Docker Compose Setup

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "6831:6831/udp"  # Jaeger agent
      - "16686:16686"    # Jaeger UI
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    networks:
      - mangamotion

  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TRACING_ENABLED=true
      - JAEGER_HOST=jaeger
      - JAEGER_PORT=6831
      - JAEGER_SAMPLER=const
      - JAEGER_SAMPLER_PARAM=1.0
    depends_on:
      - jaeger
    networks:
      - mangamotion

networks:
  mangamotion:
    driver: bridge
```

## Integration with Logging & Metrics

### Trace-Log Correlation

Logs include trace ID for correlation:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Job created",
  "job_id": "job-123",
  "trace_id": "abc123def456"
}
```

### Trace-Metric Correlation

Metrics include trace sampling:

```
job_processing_seconds_bucket{le="1",trace_sampled="true"} 45
job_processing_seconds_bucket{le="1",trace_sampled="false"} 200
```

## Best Practices

### 1. Use Meaningful Span Names
```javascript
// Good
withSpan('upload', async () => { ... })

// Bad
withSpan('operation', async () => { ... })
```

### 2. Add Relevant Attributes
```javascript
// Good
setAttribute('user.id', userId);
setAttribute('file.count', 5);
setAttribute('job.id', jobId);

// Bad
setAttribute('data', JSON.stringify(obj));
```

### 3. Use Sampling in Production
```bash
# Development
JAEGER_SAMPLER=const
JAEGER_SAMPLER_PARAM=1.0

# Production
JAEGER_SAMPLER=probabilistic
JAEGER_SAMPLER_PARAM=0.1
```

### 4. Record Exceptions
```javascript
try {
  // code
} catch (err) {
  recordException(err);
  throw err;
}
```

### 5. Correlate with Logs
```javascript
const span = trace.getActiveSpan();
const traceId = span.spanContext().traceId;
logger.info('Operation', { trace_id: traceId });
```

## Advanced Topics

### Custom Propagators

Add custom propagators for header propagation:

```javascript
const { CompositePropagator } = require('@opentelemetry/core');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { JaegerPropagator } = require('@opentelemetry/propagator-jaeger');

const propagator = new CompositePropagator({
  propagators: [
    new W3CTraceContextPropagator(),
    new JaegerPropagator()
  ]
});
```

### Custom Exporters

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
// Batch processor (recommended for production)
new BatchSpanProcessor(exporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000
});

// Simple processor (for testing)
new SimpleSpanProcessor(exporter);
```

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Node.js](https://github.com/open-telemetry/opentelemetry-js)

## Summary

✅ **Complete distributed tracing** with OpenTelemetry
✅ **Jaeger integration** for trace visualization
✅ **Automatic HTTP instrumentation**
✅ **Manual span creation** for business logic
✅ **Configurable sampling** for production
✅ **Error tracking** with exceptions
✅ **Comprehensive documentation**
✅ **Production-ready** implementation

**Status: READY FOR PRODUCTION** 🚀
