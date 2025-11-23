# Production Deployment - Phase 8

## Overview

Phase 8 provides production-ready deployment infrastructure including Docker containers, docker-compose orchestration, nginx reverse proxy, and GitHub Actions CI/CD pipeline.

## Components

### Docker Images

1. **Backend** (`Dockerfile.backend`)
   - Node.js 20 Alpine
   - Production dependencies only
   - Health checks
   - Port 3000

2. **Worker** (`Dockerfile.python_worker`)
   - Python 3.11
   - ML model dependencies
   - RabbitMQ consumer
   - MinIO integration

3. **Services** (docker-compose.prod.yml)
   - PostgreSQL 15
   - Redis 7
   - RabbitMQ 3.12
   - MinIO (latest)
   - Nginx (Alpine)

### Infrastructure

```
┌─────────────────────────────────────────┐
│         Internet / Load Balancer        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Nginx Reverse Proxy (SSL/TLS)      │
│  • Rate limiting                        │
│  • Gzip compression                     │
│  • Static caching                       │
│  • WebSocket support                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Backend API (Node.js)              │
│  • Express server                       │
│  • WebSocket server                     │
│  • Health checks                        │
└─────────────────────────────────────────┘
        ↓              ↓              ↓
    ┌────────┐    ┌────────┐    ┌────────┐
    │ PostgreSQL  │ Redis   │ RabbitMQ │
    │ Database    │ Cache   │ Queue    │
    └────────┘    └────────┘    └────────┘
        ↓
    ┌────────┐
    │ MinIO  │
    │ Storage│
    └────────┘
        ↓
    ┌────────┐
    │ Worker │
    │ Process│
    └────────┘
```

## Deployment

### Prerequisites

- Docker & Docker Compose
- SSL certificates (or Let's Encrypt)
- Environment variables configured
- GitHub secrets configured (for CI/CD)

### Local Development

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# Stop all services
docker-compose -f docker-compose.prod.yml down
```

### Production Deployment

#### 1. Prepare Server

```bash
# SSH into production server
ssh user@production-server

# Clone repository
git clone https://github.com/your-org/mangamotion.git
cd mangamotion

# Create .env file
cat > .env << EOF
# Database
DB_NAME=mangamotion
DB_USER=postgres
DB_PASSWORD=$(openssl rand -base64 32)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# RabbitMQ
RABBITMQ_USER=rabbitmq
RABBITMQ_PASSWORD=$(openssl rand -base64 32)

# MinIO
MINIO_ACCESS_KEY=$(openssl rand -base64 16)
MINIO_SECRET_KEY=$(openssl rand -base64 32)
MINIO_BUCKET=mangamotion

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Stripe
STRIPE_WEBHOOK_SECRET=whsec_...

# Model
MODEL_ADAPTER_TYPE=mock
EOF
```

#### 2. SSL Certificates

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem mangamotion/deployments/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem mangamotion/deployments/ssl/key.pem
sudo chown $(whoami):$(whoami) mangamotion/deployments/ssl/*
```

#### 3. Start Services

```bash
# Build and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# Create MinIO bucket
docker-compose -f docker-compose.prod.yml exec minio mc mb minio/mangamotion

# Verify health
curl https://yourdomain.com/health
```

#### 4. Backup Strategy

```bash
# Daily backup script
cat > /usr/local/bin/backup-mangamotion.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/mangamotion"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres mangamotion | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup MinIO
docker-compose -f docker-compose.prod.yml exec -T minio \
  mc mirror minio/mangamotion $BACKUP_DIR/minio_$DATE

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-mangamotion.sh

# Add to crontab
crontab -e
# 0 2 * * * /usr/local/bin/backup-mangamotion.sh
```

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/deploy.yml` file provides:

1. **Test Stage**
   - Run unit tests
   - Generate coverage reports
   - Upload to Codecov

2. **Build Stage**
   - Build Docker images
   - Push to container registry
   - Cache layers for speed

3. **Deploy Stage**
   - SSH into production
   - Pull latest code
   - Run migrations
   - Health checks
   - Slack notifications

### Setup CI/CD

```bash
# Add GitHub secrets
# DEPLOY_KEY: SSH private key
# DEPLOY_HOST: Production server hostname
# DEPLOY_USER: SSH username
# SLACK_WEBHOOK: Slack webhook URL
```

## Monitoring

### Health Checks

```bash
# Backend health
curl https://yourdomain.com/api/health

# WebSocket stats
curl https://yourdomain.com/api/ws/stats

# Database
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# RabbitMQ
docker-compose -f docker-compose.prod.yml exec rabbitmq rabbitmq-diagnostics ping
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# View with timestamps
docker-compose -f docker-compose.prod.yml logs -f --timestamps
```

### Metrics

```bash
# CPU and memory usage
docker stats

# Disk usage
docker system df

# Network stats
docker network inspect mangamotion
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml - scale backend
services:
  backend:
    deploy:
      replicas: 3
```

### Load Balancing

Nginx automatically load balances with `least_conn` algorithm:

```nginx
upstream backend {
    least_conn;
    server backend:3000 max_fails=3 fail_timeout=30s;
    server backend-2:3000 max_fails=3 fail_timeout=30s;
    server backend-3:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### Database Scaling

- Use PostgreSQL replication for read scaling
- Redis Cluster for distributed caching
- RabbitMQ clustering for queue scaling

## Security

### SSL/TLS

- Automatic HTTPS redirect
- TLS 1.2+ only
- Strong cipher suites
- HSTS headers

### Rate Limiting

- Auth endpoints: 5 requests/minute
- API endpoints: 10 requests/second
- Burst allowance for legitimate traffic

### Security Headers

```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Environment Variables

Never commit secrets to git:

```bash
# Use .env file (in .gitignore)
# Or use environment variable management:
# - AWS Secrets Manager
# - HashiCorp Vault
# - GitHub Secrets
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check health
docker-compose -f docker-compose.prod.yml ps

# Restart service
docker-compose -f docker-compose.prod.yml restart backend
```

### Database Connection Issues

```bash
# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d mangamotion -c "SELECT 1"

# Check logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### High Memory Usage

```bash
# Check service memory
docker stats

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Check for memory leaks
docker-compose -f docker-compose.prod.yml exec backend node --inspect
```

## Maintenance

### Updates

```bash
# Update images
docker-compose -f docker-compose.prod.yml pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Verify
curl https://yourdomain.com/health
```

### Cleanup

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## Files

### Docker
- `mangamotion/deployments/Dockerfile.backend` - Backend image
- `mangamotion/deployments/Dockerfile.python_worker` - Worker image
- `docker-compose.prod.yml` - Production orchestration

### Nginx
- `mangamotion/deployments/nginx.conf` - Reverse proxy config

### CI/CD
- `.github/workflows/deploy.yml` - GitHub Actions workflow

### Documentation
- `PRODUCTION_DEPLOYMENT_README.md` - This file
- `PRODUCTION_DEPLOYMENT_QUICKSTART.md` - Quick start guide

## Support

For issues or questions, refer to the main project README or contact the development team.
