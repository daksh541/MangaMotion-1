# Production Deployment Guide

Complete guide for deploying MangaMotion to production with security best practices.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Secrets Management](#secrets-management)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Deployment Options](#deployment-options)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Backup & Disaster Recovery](#backup--disaster-recovery)
8. [Post-Deployment](#post-deployment)

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing: `npm test`, `pytest`
- [ ] Code coverage >80%
- [ ] No security vulnerabilities: `npm audit`, `pip audit`
- [ ] No hardcoded secrets or credentials
- [ ] Environment variables documented

### Infrastructure
- [ ] Kubernetes cluster provisioned (1.24+)
- [ ] Container registry configured (ECR, ACR, GCR, Docker Hub)
- [ ] Persistent storage provisioned (EBS, AzureDisk, GCP PD)
- [ ] Database backup solution configured
- [ ] CDN/Load balancer configured

### Security
- [ ] TLS certificates obtained (Let's Encrypt or CA)
- [ ] Secrets management system configured (Vault, AWS Secrets Manager)
- [ ] Network policies defined
- [ ] RBAC policies defined
- [ ] Security scanning enabled (container images)

### Monitoring
- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Alert rules configured
- [ ] Log aggregation configured (ELK, Splunk, Datadog)
- [ ] APM configured (Jaeger, DataDog, New Relic)

### Documentation
- [ ] Runbooks created for common issues
- [ ] Disaster recovery plan documented
- [ ] Scaling procedures documented
- [ ] Incident response plan documented

## Secrets Management

### Option 1: AWS Secrets Manager (Recommended for AWS)

```bash
# Create secrets
aws secretsmanager create-secret \
  --name mangamotion/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager create-secret \
  --name mangamotion/worker-secret \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager create-secret \
  --name mangamotion/db-password \
  --secret-string "$(openssl rand -base64 32)"

# Retrieve secrets
aws secretsmanager get-secret-value --secret-id mangamotion/jwt-secret --query SecretString --output text

# Use in Kubernetes (via External Secrets Operator)
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
```

### Option 2: HashiCorp Vault (Enterprise)

```bash
# Initialize Vault
vault operator init
vault operator unseal

# Create secrets
vault kv put secret/mangamotion/jwt-secret value="$(openssl rand -base64 32)"
vault kv put secret/mangamotion/worker-secret value="$(openssl rand -base64 32)"
vault kv put secret/mangamotion/db-password value="$(openssl rand -base64 32)"

# Create Kubernetes auth
vault auth enable kubernetes
vault write auth/kubernetes/config kubernetes_host="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT"

# Create policy
vault policy write mangamotion - <<EOF
path "secret/data/mangamotion/*" {
  capabilities = ["read", "list"]
}
EOF

# Create role
vault write auth/kubernetes/role/mangamotion \
  bound_service_account_names=mangamotion \
  bound_service_account_namespaces=mangamotion \
  policies=mangamotion \
  ttl=24h
```

### Option 3: Sealed Secrets (Kubernetes-native)

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Create and seal secret
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret="$(openssl rand -base64 32)" \
  --from-literal=worker-secret="$(openssl rand -base64 32)" \
  --from-literal=db-password="$(openssl rand -base64 32)" \
  --dry-run=client -o yaml | kubeseal -o yaml > sealed-secrets.yaml

# Apply sealed secret
kubectl apply -f sealed-secrets.yaml
```

## Infrastructure Setup

### AWS Deployment

```bash
# Create EKS cluster
aws eks create-cluster \
  --name mangamotion \
  --version 1.27 \
  --role-arn arn:aws:iam::ACCOUNT:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-xxx,subnet-yyy

# Create node group
aws eks create-nodegroup \
  --cluster-name mangamotion \
  --nodegroup-name workers \
  --scaling-config minSize=3,maxSize=10,desiredSize=3 \
  --subnets subnet-xxx subnet-yyy \
  --node-role arn:aws:iam::ACCOUNT:role/NodeInstanceRole

# Configure kubectl
aws eks update-kubeconfig --name mangamotion --region us-east-1

# Create RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier mangamotion-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --allocated-storage 100 \
  --master-username mmuser \
  --master-user-password "$(openssl rand -base64 32)" \
  --backup-retention-period 30

# Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id mangamotion-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --num-cache-nodes 1 \
  --automatic-failover-enabled

# Create S3 bucket
aws s3 mb s3://mangamotion-prod --region us-east-1
aws s3api put-bucket-versioning --bucket mangamotion-prod --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket mangamotion-prod --server-side-encryption-configuration '{...}'
```

### Azure Deployment

```bash
# Create AKS cluster
az aks create \
  --resource-group mangamotion \
  --name mangamotion \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard \
  --enable-managed-identity \
  --network-plugin azure

# Get credentials
az aks get-credentials --resource-group mangamotion --name mangamotion

# Create PostgreSQL
az postgres server create \
  --resource-group mangamotion \
  --name mangamotion-db \
  --location eastus \
  --admin-user mmuser \
  --admin-password "$(openssl rand -base64 32)" \
  --sku-name B_Gen5_2 \
  --storage-size 102400

# Create Redis
az redis create \
  --resource-group mangamotion \
  --name mangamotion-redis \
  --location eastus \
  --sku Basic \
  --vm-size c0

# Create Storage Account
az storage account create \
  --resource-group mangamotion \
  --name mangamotionstorage \
  --location eastus \
  --sku Standard_LRS
```

### GCP Deployment

```bash
# Create GKE cluster
gcloud container clusters create mangamotion \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials mangamotion --zone us-central1-a

# Create Cloud SQL PostgreSQL
gcloud sql instances create mangamotion-db \
  --database-version POSTGRES_15 \
  --tier db-custom-2-8192 \
  --region us-central1

# Create Memorystore Redis
gcloud redis instances create mangamotion-redis \
  --size 2 \
  --region us-central1 \
  --redis-version 7.0

# Create Cloud Storage bucket
gsutil mb gs://mangamotion-prod
gsutil versioning set on gs://mangamotion-prod
```

## Deployment Options

### Option 1: Docker Compose (Single Server)

**Use Case**: Small deployments, staging, development

```bash
# On production server
ssh user@prod-server

# Clone repository
git clone https://github.com/yourorg/mangamotion.git
cd mangamotion

# Create production .env
cat > .env.production << EOF
NODE_ENV=production
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
WORKER_SECRET=$(openssl rand -base64 32)
S3_ACCESS_KEY=$(aws secretsmanager get-secret-value --secret-id s3-key --query SecretString --output text)
S3_SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id s3-secret --query SecretString --output text)
EOF

# Build images
docker-compose -f docker-compose.yml build

# Push to registry
docker tag mangamotion-api:latest myregistry.azurecr.io/mangamotion-api:v1.0.0
docker push myregistry.azurecr.io/mangamotion-api:v1.0.0

# Deploy
docker-compose -f docker-compose.yml up -d

# Verify
docker-compose ps
curl http://localhost:3000/api/metrics
```

### Option 2: Kubernetes (Recommended for Production)

**Use Case**: High availability, auto-scaling, multi-region

```bash
# Build and push images
docker build -t myregistry.azurecr.io/mangamotion-api:v1.0.0 ./mangamotion/backend
docker build -t myregistry.azurecr.io/mangamotion-worker:v1.0.0 ./mangamotion/worker
docker push myregistry.azurecr.io/mangamotion-api:v1.0.0
docker push myregistry.azurecr.io/mangamotion-worker:v1.0.0

# Create namespace
kubectl create namespace mangamotion

# Create secrets
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=worker-secret=$(openssl rand -base64 32) \
  --from-literal=db-password=$(openssl rand -base64 32) \
  -n mangamotion

# Create ConfigMap
kubectl create configmap mangamotion-config \
  --from-literal=LOG_LEVEL=warn \
  --from-literal=LOG_FORMAT=json \
  --from-literal=RATE_LIMIT_JOBS_PER_MINUTE=100 \
  -n mangamotion

# Deploy infrastructure
kubectl apply -f k8s/postgres.yml
kubectl apply -f k8s/redis.yml
kubectl apply -f k8s/minio.yml

# Wait for services
kubectl wait --for=condition=ready pod -l app=postgres -n mangamotion --timeout=300s

# Deploy application
kubectl apply -f k8s/api.yml
kubectl apply -f k8s/worker.yml

# Deploy monitoring
kubectl apply -f k8s/prometheus.yml
kubectl apply -f k8s/grafana.yml
kubectl apply -f k8s/jaeger.yml

# Configure ingress
kubectl apply -f k8s/ingress.yml

# Verify deployment
kubectl get pods -n mangamotion
kubectl get svc -n mangamotion
```

### Option 3: Helm (Kubernetes Package Manager)

**Use Case**: Repeatable, versioned deployments

```bash
# Create Helm chart
helm create mangamotion

# Deploy
helm install mangamotion ./mangamotion \
  --namespace mangamotion \
  --create-namespace \
  --values values-prod.yaml

# Upgrade
helm upgrade mangamotion ./mangamotion \
  --namespace mangamotion \
  --values values-prod.yaml

# Rollback
helm rollback mangamotion -n mangamotion
```

## Security Hardening

### Network Security

```yaml
# Network Policy: Deny all ingress by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: mangamotion
spec:
  podSelector: {}
  policyTypes:
  - Ingress

# Allow API ingress from ingress controller
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-ingress
  namespace: mangamotion
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000

# Allow pod-to-pod communication
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal
  namespace: mangamotion
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}
```

### RBAC (Role-Based Access Control)

```yaml
# Service Account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: mangamotion
  namespace: mangamotion

---
# Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: mangamotion
  namespace: mangamotion
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: mangamotion
  namespace: mangamotion
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: mangamotion
subjects:
- kind: ServiceAccount
  name: mangamotion
  namespace: mangamotion
```

### Pod Security

```yaml
# Pod Security Policy
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: mangamotion-restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'MustRunAs'
    seLinuxOptions:
      level: "s0:c123,c456"
  fsGroup:
    rule: 'MustRunAs'
    ranges:
    - min: 1000
      max: 65535
  readOnlyRootFilesystem: true
```

### TLS/HTTPS

```yaml
# Ingress with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mangamotion
  namespace: mangamotion
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: mangamotion-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 3000
```

## Monitoring & Alerting

### Prometheus Configuration

```yaml
# Production scrape config
scrape_configs:
  - job_name: 'api'
    scrape_interval: 30s
    scrape_timeout: 10s
    static_configs:
    - targets: ['api:3000']

  - job_name: 'worker'
    scrape_interval: 30s
    static_configs:
    - targets: ['worker:8000']

  - job_name: 'postgres'
    scrape_interval: 60s
    static_configs:
    - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    scrape_interval: 60s
    static_configs:
    - targets: ['redis-exporter:9121']
```

### Alert Rules

```yaml
groups:
  - name: mangamotion-prod
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(job_failed_total[5m]) > 0.01
        for: 5m
        annotations:
          severity: critical
          summary: "High error rate detected"

      - alert: QueueBackup
        expr: redis_queue_length > 5000
        for: 10m
        annotations:
          severity: warning
          summary: "Worker queue is backing up"

      - alert: APIDown
        expr: up{job="api"} == 0
        for: 1m
        annotations:
          severity: critical
          summary: "API is down"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{pod=~"api|worker"} / container_spec_memory_limit_bytes > 0.9
        for: 5m
        annotations:
          severity: warning
          summary: "High memory usage"
```

### Log Aggregation

```bash
# ELK Stack
docker-compose -f docker-compose.elk.yml up -d

# Or use managed service
# - AWS CloudWatch
# - Azure Monitor
# - GCP Cloud Logging
# - Datadog
# - Splunk
```

## Backup & Disaster Recovery

### Database Backups

```bash
# AWS RDS automated backups
aws rds modify-db-instance \
  --db-instance-identifier mangamotion-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"

# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier mangamotion-db \
  --db-snapshot-identifier mangamotion-backup-$(date +%Y%m%d)

# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mangamotion-db-restored \
  --db-snapshot-identifier mangamotion-backup-20231122
```

### S3 Backups

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket mangamotion-prod \
  --versioning-configuration Status=Enabled

# Enable MFA Delete
aws s3api put-bucket-versioning \
  --bucket mangamotion-prod \
  --versioning-configuration Status=Enabled,MFADelete=Enabled

# Cross-region replication
aws s3api put-bucket-replication \
  --bucket mangamotion-prod \
  --replication-configuration file://replication.json
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 1 hour
2. **RPO (Recovery Point Objective)**: 15 minutes

```bash
# Backup schedule
- Database: Daily snapshots, 30-day retention
- S3: Versioning enabled, cross-region replication
- Redis: Daily snapshots, 7-day retention
- Kubernetes: Velero backups, daily

# Recovery procedures
1. Restore database from latest snapshot
2. Restore S3 data from versioning/replication
3. Restore Redis from snapshot
4. Redeploy Kubernetes manifests
5. Verify all services healthy
6. Run smoke tests
7. Notify users
```

## Post-Deployment

### Verification

```bash
# Check all services
kubectl get pods -n mangamotion

# Check service endpoints
kubectl get endpoints -n mangamotion

# Test API
curl https://api.example.com/api/metrics

# Check metrics
curl https://api.example.com/metrics

# View logs
kubectl logs -f deployment/api -n mangamotion
```

### Smoke Tests

```bash
# Run integration tests
docker-compose exec api npm run test:integration

# Test presign endpoint
curl -X POST https://api.example.com/api/presign \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg","fileSizeBytes":1024000}'

# Test upload endpoint
curl -X POST https://api.example.com/api/upload \
  -H "X-User-ID: test-user" \
  -F "pages=@test.jpg"
```

### Performance Baseline

```bash
# Establish baseline metrics
- API response time: <200ms p95
- Error rate: <0.1%
- Queue depth: <100 jobs
- Worker throughput: >10 jobs/min
- Database connections: <50
- Memory usage: <70%
```

### Documentation

- [ ] Runbook created
- [ ] Incident response plan documented
- [ ] Scaling procedures documented
- [ ] Backup/restore procedures tested
- [ ] Team trained on deployment

## Summary

Production deployment checklist:
- ✅ Infrastructure provisioned
- ✅ Secrets configured
- ✅ Security hardened
- ✅ Monitoring enabled
- ✅ Backups configured
- ✅ Disaster recovery plan
- ✅ Verification complete
- ✅ Team trained

**Ready for production!** 🚀
