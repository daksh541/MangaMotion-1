# MangaMotion - Distributed Manga Processing System

A production-ready, distributed system for processing manga/comic files with comprehensive monitoring, alerting, and SLO tracking.

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone repository
git clone https://github.com/mangamotion/mangamotion.git
cd mangamotion

# 2. Start all services
docker-compose up -d

# 3. Verify services
docker-compose ps

# 4. Test API
curl http://localhost:3000/api/health

# 5. Upload and process a file
curl -X POST \
  -H "X-User-ID: dev-user" \
  -F "pages=@test-image.jpg" \
  http://localhost:3000/api/upload
```

## 📚 Documentation

### For New Developers
- **[Developer Onboarding](./DEVELOPER_ONBOARDING.md)** - Complete setup and first job processing
- **[OpenAPI Specification](./openapi.yaml)** - Full API documentation

### For Operations
- **[API Runbook](./API_RUNBOOK.md)** - Common failures and solutions
- **[Monitoring & Alerts](./MONITORING_ALERTS_SLOS.md)** - Alert configuration and SLOs
- **[Load Testing](./LOAD_TESTING.md)** - Performance testing procedures

### For Architects
- **[Architecture](./CONTAINERIZATION.md)** - System design and deployment
- **[Production Deployment](./PRODUCTION_DEPLOYMENT.md)** - Production setup guide

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Node.js)                     │
│  • Upload endpoint                                          │
│  • Presign URL generation                                   │
│  • Job status tracking                                      │
│  • Metrics & monitoring                                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
    ┌────────┐           ┌────────┐           ┌────────┐
    │ Redis  │           │ Postgres│           │ MinIO  │
    │ Queue  │           │ Database│           │Storage │
    └────────┘           └────────┘           └────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Worker (Python)                           │
│  • Job processing                                           │
│  • Malware scanning                                         │
│  • Thumbnail generation                                     │
│  • Result storage                                           │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│              Monitoring & Observability                     │
│  • Prometheus (metrics)                                     │
│  • Grafana (dashboards)                                     │
│  • Jaeger (tracing)                                         │
│  • AlertManager (alerts)                                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key Features

### ✅ Distributed Processing
- Scalable job queue (Redis)
- Multiple workers for parallel processing
- Idempotent job processing
- Automatic retry with exponential backoff

### ✅ Security
- Malware scanning (ClamAV)
- File validation (extension, MIME type, size)
- Rate limiting per user
- Access key rotation
- TLS/HTTPS support

### ✅ Monitoring & Observability
- Prometheus metrics collection
- Grafana dashboards
- Jaeger distributed tracing
- Structured JSON logging
- Real-time alerts with remediation steps

### ✅ Service Level Objectives
- Availability SLO (99.5% uptime)
- Error rate SLO (<5% failures)
- Latency SLO (P95 <5s)
- Throughput SLO (>10 jobs/min)
- Error budget tracking

### ✅ Production Ready
- Docker containerization
- Kubernetes deployment ready
- Health checks
- Graceful shutdown
- Comprehensive error handling

## 📊 System Components

### API Server (Node.js)
- Express.js REST API
- Multipart file upload
- S3 presigned URL generation
- Job status tracking
- Metrics collection

**Location:** `mangamotion/backend/src/server.js`

### Worker (Python)
- Job processing
- Malware scanning
- Thumbnail generation
- Result storage

**Location:** `mangamotion/worker/`

### Database (PostgreSQL)
- Job storage
- User tracking
- Failed job tracking

**Location:** Configured in `docker-compose.yml`

### Queue (Redis)
- Job queue
- Rate limiting
- Cache

**Location:** Configured in `docker-compose.yml`

### Storage (MinIO)
- S3-compatible object storage
- File uploads
- Processed results

**Location:** Configured in `docker-compose.yml`

## 🔌 API Endpoints

### Upload & Processing
- `POST /api/upload` - Upload files and create job
- `GET /api/status/{jobId}` - Get job status
- `POST /api/presign` - Get presigned S3 URL

### Monitoring
- `GET /api/metrics` - Metrics (JSON)
- `GET /metrics` - Metrics (Prometheus)
- `GET /api/alerts` - Alert statistics
- `GET /api/alerts/active` - Active alerts
- `GET /api/health` - Health check

### SLOs
- `GET /api/slos` - SLO status
- `GET /api/slos/violations` - SLO violations
- `GET /api/slos/error-budget` - Error budget
- `GET /api/slos/uptime-budget` - Uptime budget

See [openapi.yaml](./openapi.yaml) for complete API specification.

## 🚀 Deployment

### Local Development
```bash
docker-compose up -d
```

### Docker Compose (Staging)
```bash
docker-compose -f docker-compose.yml up -d
```

### Kubernetes (Production)
See [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md)

### AWS/Azure/GCP
See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

## 📈 Monitoring

### Dashboards
- **Grafana:** http://localhost:3001 (admin/admin)
- **Prometheus:** http://localhost:9090
- **Jaeger:** http://localhost:16686

### Metrics
```bash
# View metrics
curl http://localhost:3000/api/metrics | jq .

# View alerts
curl http://localhost:3000/api/alerts/active | jq .

# View SLOs
curl http://localhost:3000/api/slos | jq .
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm test -- --testPathPattern=integration
```

### Load Testing
```bash
bash load-tests/run-all-tests.sh
```

## 🔧 Configuration

### Environment Variables
```bash
# API
PORT=3000
NODE_ENV=development

# Database
POSTGRES_USER=mmuser
POSTGRES_PASSWORD=mmsecret
POSTGRES_DB=mangamotion

# Storage
S3_ENDPOINT=http://minio:9000
S3_BUCKET=mm-bucket

# Queue
REDIS_URL=redis://redis:6379

# Alerts
ALERT_QUEUE_LENGTH_WARNING=100
ALERT_FAILED_JOBS_RATE_WARNING=0.05
ALERT_STORAGE_WARNING=80

# Monitoring
TRACING_ENABLED=true
METRICS_ENABLED=true
```

See `.env.example` for complete configuration.

## 📋 Project Structure

```
mangamotion/
├── backend/                    # Node.js API
│   ├── src/
│   │   ├── server.js          # Express app
│   │   ├── config.js          # Configuration
│   │   ├── queue/             # Job queue
│   │   ├── metrics.js         # Prometheus metrics
│   │   ├── alert-manager.js   # Alerts
│   │   ├── slo.js             # SLOs
│   │   └── ...
│   ├── package.json
│   └── Dockerfile
│
├── worker/                     # Python worker
│   ├── thumbnail_worker.py
│   ├── prometheus_metrics.py
│   └── Dockerfile
│
├── docs/                       # Documentation
│   ├── DEVELOPER_ONBOARDING.md
│   ├── API_RUNBOOK.md
│   ├── openapi.yaml
│   └── ...
│
├── load-tests/                 # Load testing
│   ├── concurrent-uploads.js
│   ├── presign-uploads.js
│   ├── worker-processing.js
│   └── ...
│
├── docker-compose.yml          # Local development
└── README.md                   # This file
```

## 🆘 Troubleshooting

### Services won't start
```bash
# Check Docker
docker ps

# Remove old containers
docker-compose down -v

# Start fresh
docker-compose up -d
```

### API not responding
```bash
# Check logs
docker logs mangamotion-api

# Restart
docker-compose restart api

# Test
curl http://localhost:3000/api/health
```

### Jobs not processing
```bash
# Check worker
docker logs mangamotion-worker

# Check queue
redis-cli LLEN ai-job:queue

# Restart worker
docker-compose restart worker
```

See [API_RUNBOOK.md](./API_RUNBOOK.md) for detailed troubleshooting.

## 📖 Learning Path

1. **Start Here:** [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
2. **Understand APIs:** [OpenAPI Specification](./openapi.yaml)
3. **Handle Issues:** [API Runbook](./API_RUNBOOK.md)
4. **Monitor System:** [Monitoring & Alerts](./MONITORING_ALERTS_SLOS.md)
5. **Test Performance:** [Load Testing](./LOAD_TESTING.md)
6. **Deploy:** [Production Deployment](./PRODUCTION_DEPLOYMENT.md)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test: `npm test`
3. Commit: `git commit -am 'Add feature'`
4. Push: `git push origin feature/my-feature`
5. Create Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

### Documentation
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [API Runbook](./API_RUNBOOK.md)
- [OpenAPI Spec](./openapi.yaml)

### Debugging
```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f

# Test API
curl http://localhost:3000/api/health
```

### Getting Help
- Check documentation first
- Review logs: `docker logs <service>`
- Run tests: `npm test`
- Load test: `bash load-tests/run-all-tests.sh`

## 🎯 Next Steps

1. **New Developer?** → Start with [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
2. **Need API Details?** → Check [OpenAPI Spec](./openapi.yaml)
3. **Troubleshooting?** → See [API Runbook](./API_RUNBOOK.md)
4. **Setting up Production?** → Read [Production Deployment](./PRODUCTION_DEPLOYMENT.md)

---

**Status:** ✅ Production Ready

**Version:** 1.0.0

**Last Updated:** 2024-01-01
# MangaMotion-1
