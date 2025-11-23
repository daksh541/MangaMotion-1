# Production Deployment - Quick Start

## 10-Minute Local Setup

### 1. Create Environment File

```bash
cat > .env << EOF
DB_NAME=mangamotion
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_PASSWORD=redis
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=mangamotion
JWT_SECRET=dev-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret-key
STRIPE_WEBHOOK_SECRET=whsec_test
MODEL_ADAPTER_TYPE=mock
EOF
```

### 2. Start All Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Run Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

### 4. Verify Services

```bash
# Check all containers
docker-compose -f docker-compose.prod.yml ps

# Test backend
curl http://localhost:3000/api/health

# Test WebSocket stats
curl http://localhost:3000/api/ws/stats

# Access services
# Backend: http://localhost:3000
# MinIO: http://localhost:9001
# RabbitMQ: http://localhost:15672
# Redis: localhost:6379
```

## Production Deployment

### 1. Prepare Server

```bash
ssh user@production-server

git clone https://github.com/your-org/mangamotion.git
cd mangamotion

# Create .env with production secrets
nano .env
```

### 2. Setup SSL

```bash
# Using Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
mkdir -p mangamotion/deployments/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem mangamotion/deployments/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem mangamotion/deployments/ssl/key.pem
sudo chown $(whoami):$(whoami) mangamotion/deployments/ssl/*
```

### 3. Deploy

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# Verify
curl https://yourdomain.com/health
```

### 4. Setup Backups

```bash
# Create backup script
sudo tee /usr/local/bin/backup-mangamotion.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/mangamotion"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd /app/mangamotion
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres mangamotion | gzip > $BACKUP_DIR/db_$DATE.sql.gz
find $BACKUP_DIR -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-mangamotion.sh

# Add to crontab
crontab -e
# 0 2 * * * /usr/local/bin/backup-mangamotion.sh
```

## GitHub Actions Setup

### 1. Add Secrets

```bash
# In GitHub repository settings → Secrets

DEPLOY_KEY: <SSH private key>
DEPLOY_HOST: <production.example.com>
DEPLOY_USER: <deploy-user>
SLACK_WEBHOOK: <https://hooks.slack.com/...>
```

### 2. Trigger Deployment

```bash
# Push to main branch
git push origin main

# Workflow runs automatically:
# 1. Tests
# 2. Build Docker images
# 3. Deploy to production
# 4. Health checks
# 5. Slack notification
```

## Services

| Service | Port | URL |
|---------|------|-----|
| Backend | 3000 | http://localhost:3000 |
| MinIO | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| RabbitMQ | 5672 | amqp://localhost:5672 |
| RabbitMQ Console | 15672 | http://localhost:15672 |
| Redis | 6379 | redis://localhost:6379 |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Nginx | 80/443 | http(s)://localhost |

## Commands

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# With timestamps
docker-compose -f docker-compose.prod.yml logs -f --timestamps
```

### Manage Services

```bash
# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# Restart
docker-compose -f docker-compose.prod.yml restart backend

# Scale
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Database

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d mangamotion

# Backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres mangamotion > backup.sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres mangamotion < backup.sql
```

### MinIO

```bash
# Create bucket
docker-compose -f docker-compose.prod.yml exec minio mc mb minio/mangamotion

# List objects
docker-compose -f docker-compose.prod.yml exec minio mc ls minio/mangamotion

# Remove object
docker-compose -f docker-compose.prod.yml exec minio mc rm minio/mangamotion/path/to/object
```

## Monitoring

```bash
# Health check
curl https://yourdomain.com/health

# WebSocket stats
curl https://yourdomain.com/api/ws/stats

# Container stats
docker stats

# Disk usage
docker system df

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker-compose logs backend` |
| Database connection error | Verify PostgreSQL is running and healthy |
| High memory usage | Restart service: `docker-compose restart backend` |
| SSL certificate error | Verify cert paths in nginx.conf |
| Rate limiting errors | Check nginx rate limit zones |

## Key Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production orchestration |
| `mangamotion/deployments/nginx.conf` | Reverse proxy config |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `.env` | Environment variables |

## Next Steps

1. Configure DNS to point to server
2. Setup SSL certificates
3. Configure backups
4. Setup monitoring (Sentry, Prometheus)
5. Configure Stripe webhook
6. Setup email notifications
7. Monitor logs and metrics

## Documentation

- Full docs: `PRODUCTION_DEPLOYMENT_README.md`
- Docker: `docker-compose.prod.yml`
- Nginx: `mangamotion/deployments/nginx.conf`
- CI/CD: `.github/workflows/deploy.yml`
