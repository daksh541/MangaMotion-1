# MangaMotion Containerization & Docker Compose

Complete containerization setup for MangaMotion with Docker and Docker Compose for local development, staging, and production deployments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Services](#services)
4. [Local Development](#local-development)
5. [Integration Testing](#integration-testing)
6. [Production Deployment](#production-deployment)
7. [Kubernetes Deployment](#kubernetes-deployment)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

### Start All Services

```bash
# Copy environment file
cp .env.example .env

# Start all services (includes core + monitoring)
docker-compose up -d

# Verify services are healthy
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f worker
```

### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:3000 | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin/admin |
| Jaeger | http://localhost:16686 | - |
| AlertManager | http://localhost:9093 | - |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin |
| Redis Commander | http://localhost:8081 | - (dev-tools profile) |
| pgAdmin | http://localhost:5050 | admin@example.com/admin (dev-tools profile) |

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Architecture

### Service Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     API      │  │    Worker    │  │   ClamAV     │      │
│  │  (Node.js)   │  │  (Python)    │  │  (Scanner)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│  ┌──────┴─────────────────┴──────────────────┴──────┐      │
│  │                                                   │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │      │
│  │  │  Redis   │  │Postgres  │  │  MinIO   │       │      │
│  │  │  Queue   │  │   DB     │  │   S3     │       │      │
│  │  └──────────┘  └──────────┘  └──────────┘       │      │
│  └───────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Prometheus   │  │   Grafana    │  │    Jaeger    │      │
│  │  (Metrics)   │  │ (Dashboard)  │  │  (Tracing)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            AlertManager (Alerts)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Client Request
    ↓
API (Port 3000)
    ├─→ Validate & Rate Limit
    ├─→ Store in MinIO
    ├─→ Queue Job in Redis
    ├─→ Log to Prometheus
    └─→ Trace to Jaeger
    ↓
Worker (Python)
    ├─→ Claim Job from Redis
    ├─→ Download from MinIO
    ├─→ Scan with ClamAV
    ├─→ Process (thumbnail, etc)
    ├─→ Upload Results to MinIO
    ├─→ Update PostgreSQL
    └─→ Emit Metrics
    ↓
Monitoring Stack
    ├─→ Prometheus scrapes metrics
    ├─→ Grafana displays dashboards
    ├─→ Jaeger shows traces
    └─→ AlertManager sends alerts
```

## Services

### Core Services

#### Redis (Queue & Cache)
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Volume**: `redis_data` (persistent)
- **Health Check**: `redis-cli ping`
- **Purpose**: Job queue, rate limiting, caching

#### PostgreSQL (Database)
- **Image**: `postgres:15-alpine`
- **Port**: 5432
- **Volume**: `postgres_data` (persistent)
- **Health Check**: `pg_isready`
- **Purpose**: Job state, user data, audit logs
- **Init Scripts**: Migrations from `./mangamotion/backend/migrations/`

#### MinIO (S3-compatible Storage)
- **Image**: `minio/minio:latest`
- **Ports**: 9000 (API), 9001 (Console)
- **Volume**: `minio_data` (persistent)
- **Health Check**: MinIO health endpoint
- **Purpose**: File storage (uploads, thumbnails, results)

### Application Services

#### API (Node.js Backend)
- **Build**: `./mangamotion/backend/Dockerfile`
- **Port**: 3000
- **Features**:
  - Express.js REST API
  - OpenTelemetry tracing
  - Structured logging
  - Prometheus metrics
  - Rate limiting
  - File validation
- **Health Check**: GET `/api/metrics` (200 OK)
- **Volumes**: 
  - Source code (dev mode)
  - Uploads directory

#### Worker (Python)
- **Build**: `./mangamotion/worker/Dockerfile`
- **Features**:
  - Async job processing
  - FFmpeg thumbnail generation
  - Malware scanning integration
  - Structured logging
  - Prometheus metrics
- **Volumes**:
  - `/tmp` for temporary files
  - Source code (dev mode)

#### ClamAV (Malware Scanner)
- **Image**: `clamav/clamav:latest`
- **Port**: 3310
- **Profile**: `with-clamav` (optional)
- **Purpose**: Virus/malware scanning
- **Note**: Enable with `docker-compose --profile with-clamav up`

### Monitoring Services

#### Prometheus
- **Image**: `prom/prometheus:latest`
- **Port**: 9090
- **Config**: `./mangamotion/backend/prometheus.yml`
- **Alerts**: `./mangamotion/backend/alert_rules.yml`
- **Scrape Interval**: 15s
- **Retention**: 15 days

#### Grafana
- **Image**: `grafana/grafana:latest`
- **Port**: 3001
- **Dashboard**: Pre-configured with 12 panels
- **Credentials**: admin/admin (configurable)

#### Jaeger (Distributed Tracing)
- **Image**: `jaegertracing/all-in-one:latest`
- **Port**: 16686 (UI), 6831 (UDP collector)
- **Purpose**: Trace visualization and analysis

#### AlertManager
- **Image**: `prom/alertmanager:latest`
- **Port**: 9093
- **Config**: `./mangamotion/backend/alertmanager.yml`
- **Integrations**: Slack, PagerDuty, email

### Development Tools (Optional)

Enable with: `docker-compose --profile dev-tools up`

#### Redis Commander
- **Port**: 8081
- **Purpose**: Redis key inspection and management

#### pgAdmin
- **Port**: 5050
- **Purpose**: PostgreSQL database management

## Local Development

### Setup

```bash
# 1. Clone and navigate
cd /path/to/MangaMotion-1

# 2. Copy environment
cp .env.example .env

# 3. Install dependencies (optional, Docker handles it)
cd mangamotion/backend && npm install
cd ../worker && pip install -r requirements.txt

# 4. Start services
docker-compose up -d

# 5. Verify health
docker-compose ps
```

### Development Workflow

#### Hot Reload (API)

The API service mounts source code as volume, enabling hot reload:

```bash
# Changes to ./mangamotion/backend/src are reflected immediately
# Restart if needed:
docker-compose restart api
```

#### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker

# Last 100 lines
docker-compose logs --tail=100 api
```

#### Execute Commands

```bash
# Run command in API container
docker-compose exec api npm test

# Run command in Worker container
docker-compose exec worker python -m pytest

# Interactive shell
docker-compose exec api sh
docker-compose exec worker bash
```

#### Database Migrations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U mmuser -d mangamotion

# Run migrations manually
docker-compose exec postgres psql -U mmuser -d mangamotion < migrations/001_add_failed_jobs_table.sql
```

#### Redis Operations

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# View all keys
KEYS *

# Get job queue
LRANGE bull:jobs:0 0 -1

# Monitor in real-time
MONITOR
```

#### MinIO Operations

```bash
# Access MinIO Console
# http://localhost:9001
# Username: minioadmin
# Password: minioadmin

# Or use MinIO CLI
mc alias set minio http://localhost:9000 minioadmin minioadmin
mc ls minio/mm-bucket
```

## Integration Testing

### Run Tests Locally

```bash
# Backend unit tests
docker-compose exec api npm run test:unit

# Backend integration tests
docker-compose exec api npm run test:integration

# All tests with coverage
docker-compose exec api npm test

# Worker tests
docker-compose exec worker python -m pytest
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/api/metrics

# Presign endpoint
curl -X POST http://localhost:3000/api/presign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "fileSizeBytes": 1024000
  }'

# Upload endpoint
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-ID: test-user" \
  -F "pages=@test.jpg"

# Get job status
curl http://localhost:3000/api/status/{jobId}

# Prometheus metrics
curl http://localhost:3000/metrics

# JSON metrics
curl http://localhost:3000/api/metrics
```

### Integration Test Suite

```bash
# Run full integration test
docker-compose exec api npm run test:integration

# Expected flow:
# 1. Presign request → Get S3 URL
# 2. Upload file → Create job
# 3. Job queued → Worker processes
# 4. Metrics recorded → Prometheus scrapes
# 5. Traces exported → Jaeger displays
```

### Cypress E2E Tests

```bash
# Run Cypress tests (requires X11 or headless)
docker-compose exec api npx cypress run

# Or interactive mode
docker-compose exec api npx cypress open
```

## Production Deployment

### Environment Variables for Production

Create `.env.production`:

```bash
# Security
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
WORKER_SECRET=$(openssl rand -base64 32)

# Database (use managed service)
PGHOST=prod-db.example.com
PGUSER=prod_user
PGPASSWORD=$(openssl rand -base64 32)
PGDATABASE=mangamotion_prod

# Redis (use managed service)
REDIS_URL=redis://prod-redis.example.com:6379

# S3 (use AWS S3)
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=${AWS_ACCESS_KEY_ID}
S3_SECRET_KEY=${AWS_SECRET_ACCESS_KEY}
S3_REGION=us-east-1
S3_BUCKET=mangamotion-prod
S3_FORCE_PATH_STYLE=false

# Tracing
JAEGER_HOST=jaeger.example.com
JAEGER_PORT=6831
JAEGER_SAMPLER=probabilistic
JAEGER_SAMPLER_PARAM=0.1

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json

# Rate limiting
RATE_LIMIT_JOBS_PER_MINUTE=100
```

### Secrets Management

#### Option 1: Environment Variables (Simple)

```bash
# Load from secure source
export JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id jwt-secret --query SecretString --output text)
export WORKER_SECRET=$(aws secretsmanager get-secret-value --secret-id worker-secret --query SecretString --output text)

# Start container
docker run --env-file .env.production ...
```

#### Option 2: Docker Secrets (Swarm)

```bash
# Create secrets
echo "secret-value" | docker secret create jwt_secret -
echo "secret-value" | docker secret create worker_secret -

# Reference in docker-compose
secrets:
  jwt_secret:
    external: true
  worker_secret:
    external: true

services:
  api:
    secrets:
      - jwt_secret
      - worker_secret
```

#### Option 3: HashiCorp Vault (Enterprise)

```bash
# Initialize Vault client
vault auth enable jwt
vault write auth/jwt/config jwks_uri="https://example.com/.well-known/jwks.json"

# Fetch secrets at runtime
vault kv get secret/mangamotion/jwt-secret
vault kv get secret/mangamotion/worker-secret
```

#### Option 4: Kubernetes Secrets (K8s)

```bash
# Create secret
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=worker-secret=$(openssl rand -base64 32)

# Reference in pod spec
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: mangamotion-secrets
        key: jwt-secret
```

### Docker Compose Production

```bash
# Build images
docker-compose -f docker-compose.yml build

# Push to registry
docker tag mangamotion-api:latest myregistry.azurecr.io/mangamotion-api:v1.0.0
docker push myregistry.azurecr.io/mangamotion-api:v1.0.0

# Deploy
docker-compose -f docker-compose.yml up -d
```

### Health Checks & Monitoring

```bash
# Verify all services healthy
docker-compose ps

# Check logs for errors
docker-compose logs --tail=50 api worker

# Monitor resource usage
docker stats

# Check metrics
curl http://localhost:3000/metrics
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.24+
- kubectl configured
- Container registry access

### Build & Push Images

```bash
# Build images
docker build -t myregistry.azurecr.io/mangamotion-api:v1.0.0 ./mangamotion/backend
docker build -t myregistry.azurecr.io/mangamotion-worker:v1.0.0 ./mangamotion/worker

# Push to registry
docker push myregistry.azurecr.io/mangamotion-api:v1.0.0
docker push myregistry.azurecr.io/mangamotion-worker:v1.0.0
```

### Create Kubernetes Manifests

See `KUBERNETES_DEPLOYMENT.md` for complete K8s setup with:
- Deployments (API, Worker)
- Services (ClusterIP, LoadBalancer)
- ConfigMaps (configuration)
- Secrets (credentials)
- PersistentVolumes (data)
- Ingress (routing)
- HPA (auto-scaling)

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace mangamotion

# Create secrets
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=worker-secret=$(openssl rand -base64 32) \
  -n mangamotion

# Apply manifests
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/configmap.yml
kubectl apply -f k8s/secrets.yml
kubectl apply -f k8s/postgres.yml
kubectl apply -f k8s/redis.yml
kubectl apply -f k8s/minio.yml
kubectl apply -f k8s/api.yml
kubectl apply -f k8s/worker.yml
kubectl apply -f k8s/monitoring.yml

# Verify deployment
kubectl get pods -n mangamotion
kubectl get svc -n mangamotion
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs api
docker-compose logs worker

# Common issues:
# - Port already in use: Change port in docker-compose.yml
# - Out of memory: Increase Docker memory limit
# - Network issues: Check docker network
docker network ls
docker network inspect mangamotion
```

### Database Connection Failed

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# Connect directly
docker-compose exec postgres psql -U mmuser -d mangamotion

# Check connection string
echo $PGHOST $PGPORT $PGUSER $PGDATABASE
```

### Redis Connection Failed

```bash
# Check Redis is healthy
docker-compose ps redis

# Connect directly
docker-compose exec redis redis-cli ping

# Check connection string
echo $REDIS_URL
```

### MinIO Connection Failed

```bash
# Check MinIO is healthy
docker-compose ps minio

# Access console
# http://localhost:9001

# Check bucket exists
docker-compose exec minio mc ls minio/mm-bucket
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs -f worker

# Check Redis queue
docker-compose exec redis redis-cli LLEN bull:jobs:0

# Check job status
curl http://localhost:3000/api/status/{jobId}

# Restart worker
docker-compose restart worker
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Reduce concurrency
SCAN_WORKER_CONCURRENCY=1

# Restart services
docker-compose restart api worker
```

### Metrics Not Appearing

```bash
# Check Prometheus scrape
curl http://localhost:9090/api/v1/targets

# Check metrics endpoint
curl http://localhost:3000/metrics

# Verify Prometheus config
docker-compose exec prometheus cat /etc/prometheus/prometheus.yml
```

### Traces Not Appearing in Jaeger

```bash
# Check Jaeger is receiving spans
curl http://localhost:16686/api/services

# Check JAEGER_HOST and JAEGER_PORT
echo $JAEGER_HOST $JAEGER_PORT

# Verify tracing is enabled
echo $TRACING_ENABLED
```

## Performance Tuning

### Resource Limits

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Database Optimization

```bash
# Increase connections
PGMAXCONNECTIONS=200

# Enable query logging
docker-compose exec postgres psql -U mmuser -d mangamotion -c "ALTER SYSTEM SET log_statement = 'all';"
```

### Redis Optimization

```bash
# Increase memory
docker-compose exec redis redis-cli CONFIG SET maxmemory 2gb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Worker Scaling

```bash
# Run multiple workers
docker-compose up -d --scale worker=3

# Monitor queue depth
docker-compose exec redis redis-cli LLEN bull:jobs:0
```

## Maintenance

### Backup Data

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U mmuser mangamotion > backup.sql

# Backup MinIO
docker-compose exec minio mc mirror minio/mm-bucket ./backup/

# Backup Redis
docker-compose exec redis redis-cli BGSAVE
docker cp mangamotion-redis:/data/dump.rdb ./backup/
```

### Restore Data

```bash
# Restore PostgreSQL
docker-compose exec -T postgres psql -U mmuser mangamotion < backup.sql

# Restore MinIO
docker-compose exec minio mc mirror ./backup/ minio/mm-bucket

# Restore Redis
docker cp ./backup/dump.rdb mangamotion-redis:/data/
docker-compose restart redis
```

### Update Services

```bash
# Pull latest images
docker-compose pull

# Rebuild custom images
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Clean Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Full cleanup (WARNING: deletes data)
docker-compose down -v
docker system prune -a
```

## Summary

This containerization setup provides:

✅ **Local Development**: Full stack with hot reload and debugging
✅ **Integration Testing**: All services available for testing
✅ **Monitoring**: Prometheus, Grafana, Jaeger, AlertManager
✅ **Production Ready**: Secrets management, health checks, scaling
✅ **Kubernetes Ready**: Easy migration to K8s
✅ **Documentation**: Complete guides and troubleshooting

**Next Steps**:
1. Run `docker-compose up -d` to start all services
2. Access Grafana at http://localhost:3001
3. Run integration tests: `docker-compose exec api npm run test:integration`
4. Deploy to production using environment-specific `.env` files
