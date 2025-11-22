# ClamAV Deployment Guide

## Quick Start (Docker)

### 1. Start ClamAV Daemon

```bash
docker run -d \
  --name clamav \
  -p 3310:3310 \
  --restart unless-stopped \
  clamav/clamav:latest
```

### 2. Configure Backend

Add to `.env`:
```bash
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=30000
SCAN_ON_UPLOAD=true
```

### 3. Start Scan Worker

```bash
# Terminal 1: Main server
npm start

# Terminal 2: Scan worker
node src/queue/workers/scan-worker.js
```

### 4. Test

```bash
# Upload clean file
curl -X POST http://localhost:3000/api/upload -F "pages=@test.jpg"

# Check status
curl http://localhost:3000/api/status/{jobId}
```

## Production Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  clamav:
    image: clamav/clamav:latest
    ports:
      - "3310:3310"
    volumes:
      - clamav-data:/var/lib/clamav
    environment:
      - FRESHCLAM_CHECKS=24
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "clamdscan", "--ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build: .
    environment:
      - CLAMAV_ENABLED=true
      - CLAMAV_HOST=clamav
      - CLAMAV_PORT=3310
      - CLAMAV_TIMEOUT_MS=30000
    depends_on:
      clamav:
        condition: service_healthy
    restart: unless-stopped

  scan-worker:
    build: .
    command: node src/queue/workers/scan-worker.js
    environment:
      - CLAMAV_ENABLED=true
      - CLAMAV_HOST=clamav
      - CLAMAV_PORT=3310
      - SCAN_WORKER_CONCURRENCY=2
    depends_on:
      clamav:
        condition: service_healthy
    restart: unless-stopped

volumes:
  clamav-data:
```

### Kubernetes Deployment

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: clamav-config
data:
  CLAMAV_ENABLED: "true"
  CLAMAV_HOST: "clamav-service"
  CLAMAV_PORT: "3310"
  CLAMAV_TIMEOUT_MS: "30000"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clamav
spec:
  replicas: 1
  selector:
    matchLabels:
      app: clamav
  template:
    metadata:
      labels:
        app: clamav
    spec:
      containers:
      - name: clamav
        image: clamav/clamav:latest
        ports:
        - containerPort: 3310
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          tcpSocket:
            port: 3310
          initialDelaySeconds: 60
          periodSeconds: 30

---
apiVersion: v1
kind: Service
metadata:
  name: clamav-service
spec:
  selector:
    app: clamav
  ports:
  - port: 3310
    targetPort: 3310

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scan-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: scan-worker
  template:
    metadata:
      labels:
        app: scan-worker
    spec:
      containers:
      - name: scan-worker
        image: mangamotion-backend:latest
        command: ["node", "src/queue/workers/scan-worker.js"]
        envFrom:
        - configMapRef:
            name: clamav-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAMAV_ENABLED` | `false` | Enable/disable scanning |
| `CLAMAV_HOST` | `localhost` | ClamAV daemon host |
| `CLAMAV_PORT` | `3310` | ClamAV daemon port |
| `CLAMAV_TIMEOUT_MS` | `30000` | Scan timeout in milliseconds |
| `SCAN_ON_UPLOAD` | `true` | Trigger scan on every upload |
| `SCAN_WORKER_CONCURRENCY` | `2` | Number of concurrent scans |

### Tuning for Performance

**High-Volume Scanning:**
```bash
SCAN_WORKER_CONCURRENCY=4
CLAMAV_TIMEOUT_MS=60000
```

**Low-Latency:**
```bash
SCAN_WORKER_CONCURRENCY=1
CLAMAV_TIMEOUT_MS=15000
```

**Strict Security:**
```bash
CLAMAV_TIMEOUT_MS=60000
SCAN_WORKER_CONCURRENCY=1
```

## Health Checks

### ClamAV Daemon Health

```bash
# Check if daemon is running
docker exec clamav clamdscan --ping

# Check virus definitions age
docker exec clamav clamscan --version

# Monitor daemon logs
docker logs -f clamav
```

### Backend Health

```bash
# Check scan worker status
curl http://localhost:3000/api/status/{jobId}

# Monitor scan queue
redis-cli LLEN scan-job:active

# Check failed scans
redis-cli LLEN scan-job:failed
```

## Monitoring & Logging

### Prometheus Metrics

Add to backend:

```javascript
const prometheus = require('prom-client');

const scanCounter = new prometheus.Counter({
  name: 'scans_total',
  help: 'Total number of scans',
  labelNames: ['result']
});

const scanDuration = new prometheus.Histogram({
  name: 'scan_duration_seconds',
  help: 'Scan duration in seconds'
});
```

### Log Aggregation

Configure logging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'scan.log' }),
    new winston.transports.Console()
  ]
});
```

### Alerting

Set up alerts for:
- ClamAV daemon down
- High virus detection rate
- Scan timeout frequency
- Scan queue backlog

## Maintenance

### Update Virus Definitions

**Automatic (Docker):**
```bash
docker exec clamav freshclam
```

**Scheduled (Cron):**
```bash
0 */6 * * * docker exec clamav freshclam
```

**Manual:**
```bash
freshclam
```

### Update ClamAV

**Docker:**
```bash
docker pull clamav/clamav:latest
docker stop clamav
docker rm clamav
# Restart with new image
```

**Local:**
```bash
brew upgrade clamav
sudo systemctl restart clamav-daemon
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
telnet localhost 3310

# Check firewall
sudo ufw status
sudo ufw allow 3310

# Check logs
docker logs clamav
```

### Performance Issues

```bash
# Check ClamAV resource usage
docker stats clamav

# Monitor scan queue
redis-cli LLEN scan-job:active

# Check database size
du -sh /var/lib/clamav/
```

### False Positives

```bash
# Test file directly
clamscan -i /path/to/file

# Check ClamAV version
clamscan --version

# Update definitions
freshclam
```

## Scaling

### Horizontal Scaling

**Multiple Scan Workers:**
```bash
# Start multiple workers
for i in {1..4}; do
  node src/queue/workers/scan-worker.js &
done
```

**Docker Compose:**
```yaml
scan-worker:
  deploy:
    replicas: 4
```

**Kubernetes:**
```yaml
spec:
  replicas: 4
```

### Vertical Scaling

**Increase ClamAV Resources:**
```yaml
resources:
  limits:
    memory: "4Gi"
    cpu: "4000m"
```

**Increase Worker Concurrency:**
```bash
SCAN_WORKER_CONCURRENCY=8
```

## Cost Optimization

### Resource Allocation

```yaml
# Development
CLAMAV_TIMEOUT_MS: 15000
SCAN_WORKER_CONCURRENCY: 1

# Production
CLAMAV_TIMEOUT_MS: 30000
SCAN_WORKER_CONCURRENCY: 2

# High-Volume
CLAMAV_TIMEOUT_MS: 60000
SCAN_WORKER_CONCURRENCY: 4
```

### Storage Optimization

```bash
# Compress old logs
gzip scan.log

# Archive to S3
aws s3 cp scan.log.gz s3://bucket/logs/
```

## Security Hardening

### Network Security

```yaml
# Restrict ClamAV access
ports:
  - "3310:3310"  # Only expose internally

# Use network policies
networkPolicy:
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
```

### File Permissions

```bash
# Restrict ClamAV data directory
chmod 700 /var/lib/clamav
chown clamav:clamav /var/lib/clamav
```

### Audit Logging

```javascript
// Log all scan events
logger.info('Scan completed', {
  jobId,
  filesScanned,
  result: scanResults,
  timestamp: new Date()
});
```

## Disaster Recovery

### Backup Strategy

```bash
# Backup ClamAV definitions
docker cp clamav:/var/lib/clamav ./clamav-backup

# Restore
docker cp ./clamav-backup clamav:/var/lib/clamav
```

### Recovery Procedures

**If ClamAV crashes:**
1. Restart daemon: `docker restart clamav`
2. Update definitions: `docker exec clamav freshclam`
3. Verify health: `docker exec clamav clamdscan --ping`

**If scan queue backs up:**
1. Increase workers: `SCAN_WORKER_CONCURRENCY=4`
2. Increase timeout: `CLAMAV_TIMEOUT_MS=60000`
3. Monitor: `redis-cli LLEN scan-job:active`

## Compliance

### GDPR Compliance

- Log scan events with user consent
- Retain scan logs for audit trail
- Delete infected files securely
- Document scanning procedures

### Security Standards

- Follow NIST guidelines for malware detection
- Implement defense-in-depth
- Regular security audits
- Incident response procedures

## References

- [ClamAV Documentation](https://www.clamav.net/documents/installing-clamav)
- [Docker ClamAV](https://hub.docker.com/r/clamav/clamav)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/security/)
