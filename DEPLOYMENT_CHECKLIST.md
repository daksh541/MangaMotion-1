# MangaMotion Deployment Checklist

Complete checklist for deploying MangaMotion from local development to production.

## 🚀 Quick Deployment Paths

### Path 1: Local Development (5 minutes)
```
1. cp .env.example .env
2. docker-compose up -d
3. docker-compose ps
4. Access http://localhost:3000
```

### Path 2: Docker Compose Single Server (30 minutes)
```
1. Build images
2. Push to registry
3. SSH to server
4. docker-compose up -d
5. Configure reverse proxy
6. Verify services
```

### Path 3: Kubernetes (1-2 hours)
```
1. Build and push images
2. Create K8s cluster
3. Create secrets
4. kubectl apply -f k8s/
5. Configure ingress
6. Verify deployment
```

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing: `npm test`, `pytest`
- [ ] Code coverage >80%
- [ ] No security vulnerabilities: `npm audit`, `pip audit`
- [ ] No hardcoded secrets
- [ ] Environment variables documented
- [ ] Code reviewed and approved

### Infrastructure
- [ ] Compute resources provisioned
- [ ] Database service provisioned
- [ ] Cache service provisioned
- [ ] Object storage provisioned
- [ ] Networking configured
- [ ] DNS configured
- [ ] TLS certificates obtained

### Security
- [ ] Secrets management configured
- [ ] Network policies defined
- [ ] RBAC policies defined
- [ ] Container images scanned
- [ ] Firewall rules configured
- [ ] DDoS protection enabled (if applicable)

### Monitoring
- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Alert rules configured
- [ ] Log aggregation configured
- [ ] APM configured
- [ ] Backup monitoring enabled

### Documentation
- [ ] Runbooks created
- [ ] Disaster recovery plan documented
- [ ] Scaling procedures documented
- [ ] Incident response plan documented
- [ ] Team trained

## 📋 Local Development Deployment

### Step 1: Environment Setup
```bash
# Navigate to project
cd /Users/saidaksh/Desktop/MangaMotion-1

# Copy environment
cp .env.example .env

# Verify environment
cat .env | grep -E "^[A-Z_]+=.*" | wc -l
# Expected: >40 variables
```

### Step 2: Start Services
```bash
# Start all services
docker-compose up -d

# Monitor startup
docker-compose logs -f

# Wait for services to be healthy (2-3 minutes)
# Press Ctrl+C to stop watching logs
```

### Step 3: Verify Services
```bash
# Check all services
docker-compose ps

# Verify health
curl http://localhost:3000/api/metrics
curl http://localhost:3001/api/health
curl http://localhost:9090/-/healthy
```

### Step 4: Run Tests
```bash
# Backend tests
docker-compose exec api npm run test:integration

# Worker tests
docker-compose exec worker python -m pytest

# All tests
docker-compose exec api npm test
```

### Step 5: Access Dashboards
```
Grafana:      http://localhost:3001 (admin/admin)
Jaeger:       http://localhost:16686
Prometheus:   http://localhost:9090
MinIO:        http://localhost:9001 (minioadmin/minioadmin)
AlertManager: http://localhost:9093
```

## 🐳 Docker Compose Single Server Deployment

### Step 1: Build Images
```bash
# Build API image
docker build -t myregistry.azurecr.io/mangamotion-api:v1.0.0 ./mangamotion/backend

# Build Worker image
docker build -t myregistry.azurecr.io/mangamotion-worker:v1.0.0 ./mangamotion/worker

# Verify images
docker images | grep mangamotion
```

### Step 2: Push to Registry
```bash
# Login to registry
docker login myregistry.azurecr.io

# Push images
docker push myregistry.azurecr.io/mangamotion-api:v1.0.0
docker push myregistry.azurecr.io/mangamotion-worker:v1.0.0

# Verify push
docker pull myregistry.azurecr.io/mangamotion-api:v1.0.0
```

### Step 3: Prepare Server
```bash
# SSH to server
ssh user@prod-server

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 4: Deploy Services
```bash
# Clone repository
git clone https://github.com/yourorg/mangamotion.git
cd mangamotion

# Create production .env
cat > .env.production << EOF
NODE_ENV=production
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
WORKER_SECRET=$(openssl rand -base64 32)
# ... (other variables)
EOF

# Update docker-compose.yml to use production images
# Change image: mangamotion-api to image: myregistry.azurecr.io/mangamotion-api:v1.0.0

# Start services
docker-compose -f docker-compose.yml up -d

# Verify services
docker-compose ps
```

### Step 5: Configure Reverse Proxy
```bash
# Install nginx
sudo apt-get install -y nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/mangamotion << EOF
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/mangamotion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup TLS (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

### Step 6: Verify Deployment
```bash
# Check services
docker-compose ps

# Check logs
docker-compose logs -f api

# Test API
curl https://api.example.com/api/metrics

# Check metrics
curl https://api.example.com/metrics
```

## ☸️ Kubernetes Deployment

### Step 1: Build and Push Images
```bash
# Build images
docker build -t myregistry.azurecr.io/mangamotion-api:v1.0.0 ./mangamotion/backend
docker build -t myregistry.azurecr.io/mangamotion-worker:v1.0.0 ./mangamotion/worker

# Push images
docker push myregistry.azurecr.io/mangamotion-api:v1.0.0
docker push myregistry.azurecr.io/mangamotion-worker:v1.0.0
```

### Step 2: Create Kubernetes Cluster
```bash
# AWS EKS
aws eks create-cluster \
  --name mangamotion \
  --version 1.27 \
  --role-arn arn:aws:iam::ACCOUNT:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-xxx,subnet-yyy

# Or Azure AKS
az aks create \
  --resource-group mangamotion \
  --name mangamotion \
  --node-count 3

# Or GCP GKE
gcloud container clusters create mangamotion \
  --zone us-central1-a \
  --num-nodes 3
```

### Step 3: Configure kubectl
```bash
# AWS
aws eks update-kubeconfig --name mangamotion --region us-east-1

# Azure
az aks get-credentials --resource-group mangamotion --name mangamotion

# GCP
gcloud container clusters get-credentials mangamotion --zone us-central1-a

# Verify
kubectl cluster-info
```

### Step 4: Create Namespace and Secrets
```bash
# Create namespace
kubectl create namespace mangamotion

# Create secrets
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=worker-secret=$(openssl rand -base64 32) \
  --from-literal=db-password=$(openssl rand -base64 32) \
  -n mangamotion

# Create image pull secret (if using private registry)
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.azurecr.io \
  --docker-username=<username> \
  --docker-password=<password> \
  -n mangamotion
```

### Step 5: Deploy Infrastructure
```bash
# Create K8s manifests in k8s/ directory
# (See KUBERNETES_DEPLOYMENT.md for templates)

# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yml

# Deploy Redis
kubectl apply -f k8s/redis.yml

# Deploy MinIO
kubectl apply -f k8s/minio.yml

# Wait for services
kubectl wait --for=condition=ready pod -l app=postgres -n mangamotion --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n mangamotion --timeout=300s
kubectl wait --for=condition=ready pod -l app=minio -n mangamotion --timeout=300s
```

### Step 6: Deploy Application
```bash
# Deploy API
kubectl apply -f k8s/api.yml

# Deploy Worker
kubectl apply -f k8s/worker.yml

# Verify deployment
kubectl get pods -n mangamotion
kubectl get svc -n mangamotion
```

### Step 7: Deploy Monitoring
```bash
# Deploy Prometheus
kubectl apply -f k8s/prometheus.yml

# Deploy Grafana
kubectl apply -f k8s/grafana.yml

# Deploy Jaeger
kubectl apply -f k8s/jaeger.yml

# Deploy AlertManager
kubectl apply -f k8s/alertmanager.yml
```

### Step 8: Configure Ingress
```bash
# Install Ingress Controller (if not present)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.0/deploy/static/provider/cloud/deploy.yaml

# Apply Ingress
kubectl apply -f k8s/ingress.yml

# Verify
kubectl get ingress -n mangamotion
```

### Step 9: Verify Deployment
```bash
# Check pods
kubectl get pods -n mangamotion

# Check services
kubectl get svc -n mangamotion

# Check ingress
kubectl get ingress -n mangamotion

# Get ingress IP
kubectl get ingress -n mangamotion -o wide

# Test API
curl https://api.example.com/api/metrics
```

## 🔐 Secrets Management Setup

### Local Development
```bash
# Use .env file (not in git)
cp .env.example .env
# Edit .env with development values
```

### Production - AWS Secrets Manager
```bash
# Create secrets
aws secretsmanager create-secret \
  --name mangamotion/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# Retrieve secrets
aws secretsmanager get-secret-value \
  --secret-id mangamotion/jwt-secret \
  --query SecretString \
  --output text
```

### Production - HashiCorp Vault
```bash
# Initialize Vault
vault operator init
vault operator unseal

# Create secrets
vault kv put secret/mangamotion/jwt-secret value="$(openssl rand -base64 32)"

# Retrieve secrets
vault kv get secret/mangamotion/jwt-secret
```

### Production - Kubernetes Secrets
```bash
# Create secrets
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  -n mangamotion

# Reference in pod spec
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: mangamotion-secrets
        key: jwt-secret
```

## 📊 Post-Deployment Verification

### Health Checks
```bash
# API health
curl https://api.example.com/api/metrics

# Database health
kubectl exec -it postgres-0 -n mangamotion -- psql -U mmuser -d mangamotion -c "SELECT 1;"

# Redis health
kubectl exec -it redis-0 -n mangamotion -- redis-cli ping

# MinIO health
kubectl exec -it minio-0 -n mangamotion -- mc ls minio/
```

### Smoke Tests
```bash
# Run integration tests
docker-compose exec api npm run test:integration

# Or in K8s
kubectl exec -it deployment/api -n mangamotion -- npm run test:integration
```

### Monitoring Verification
```bash
# Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Grafana dashboards
curl http://grafana:3000/api/dashboards/home

# Jaeger services
curl http://jaeger:16686/api/services
```

### Performance Baseline
```bash
# Establish baseline metrics
# - API response time: <200ms p95
# - Error rate: <0.1%
# - Queue depth: <100 jobs
# - Worker throughput: >10 jobs/min
# - Database connections: <50
# - Memory usage: <70%

# Monitor with Grafana
# http://grafana:3000
```

## 🔄 Rollback Procedures

### Docker Compose Rollback
```bash
# Stop current version
docker-compose down

# Restore previous version
docker-compose -f docker-compose.v1.0.0.yml up -d

# Or restart from backup
docker-compose restart
```

### Kubernetes Rollback
```bash
# Check rollout history
kubectl rollout history deployment/api -n mangamotion

# Rollback to previous version
kubectl rollout undo deployment/api -n mangamotion

# Rollback to specific revision
kubectl rollout undo deployment/api --to-revision=2 -n mangamotion
```

### Database Rollback
```bash
# AWS RDS
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mangamotion-db-restored \
  --db-snapshot-identifier mangamotion-backup-20231122

# Or restore from backup
pg_restore -h localhost -U mmuser -d mangamotion backup.sql
```

## 📝 Post-Deployment Documentation

### Update Runbooks
- [ ] Deployment runbook
- [ ] Scaling runbook
- [ ] Backup/restore runbook
- [ ] Incident response runbook
- [ ] Troubleshooting guide

### Update Team
- [ ] Team trained on new deployment
- [ ] Access credentials distributed
- [ ] On-call procedures updated
- [ ] Escalation procedures updated

### Monitor Metrics
- [ ] Establish baseline metrics
- [ ] Configure alerts
- [ ] Set up dashboards
- [ ] Monitor for 24 hours

## ✅ Deployment Sign-Off

- [ ] All pre-deployment checks passed
- [ ] Services deployed successfully
- [ ] All health checks passing
- [ ] Smoke tests passed
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Runbooks updated
- [ ] Team trained
- [ ] Baseline metrics established
- [ ] Ready for production traffic

**Deployment Status**: ✅ COMPLETE

Date: [DATE]
Deployed By: [NAME]
Verified By: [NAME]

## 🚀 Next Steps

1. Monitor metrics for 24 hours
2. Verify no alerts triggered
3. Confirm user traffic flowing
4. Update status page
5. Notify stakeholders
6. Schedule post-deployment review

## 📞 Support

For issues during deployment:
1. Check logs: `docker-compose logs -f` or `kubectl logs -f`
2. Check health: `docker-compose ps` or `kubectl get pods`
3. See troubleshooting guide in CONTAINERIZATION.md
4. Contact on-call engineer
