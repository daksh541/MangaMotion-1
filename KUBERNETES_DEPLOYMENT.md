# MangaMotion Kubernetes Deployment

Production-ready Kubernetes deployment with secrets management, auto-scaling, and monitoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture](#architecture)
3. [Secrets Management](#secrets-management)
4. [Deployment Steps](#deployment-steps)
5. [Configuration](#configuration)
6. [Scaling](#scaling)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Kubernetes 1.24+
- kubectl configured
- Container registry (Docker Hub, ECR, ACR, GCR)
- Helm 3.0+ (optional but recommended)
- Persistent storage provisioner (EBS, AzureDisk, GCP Persistent Disk)

## Architecture

### Namespace Isolation

```
┌─────────────────────────────────────────────┐
│         mangamotion namespace               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │      API Deployment (3 replicas)    │   │
│  │  - Pod 1, Pod 2, Pod 3              │   │
│  │  - Service: LoadBalancer            │   │
│  │  - Ingress: api.example.com         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   Worker Deployment (2-5 replicas)  │   │
│  │  - Pod 1, Pod 2, Pod 3...           │   │
│  │  - HPA: 2-5 based on CPU/Memory     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   Infrastructure Services           │   │
│  │  - PostgreSQL StatefulSet           │   │
│  │  - Redis StatefulSet                │   │
│  │  - MinIO StatefulSet                │   │
│  │  - ClamAV Deployment                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   Monitoring Stack                  │   │
│  │  - Prometheus Deployment            │   │
│  │  - Grafana Deployment               │   │
│  │  - Jaeger Deployment                │   │
│  │  - AlertManager Deployment          │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Network Policies

```
API ↔ PostgreSQL, Redis, MinIO, ClamAV
Worker ↔ PostgreSQL, Redis, MinIO, ClamAV
Prometheus → API, Worker (metrics)
Jaeger ← API, Worker (traces)
```

## Secrets Management

### Option 1: Kubernetes Secrets (Built-in)

```bash
# Create secret
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=worker-secret=$(openssl rand -base64 32) \
  --from-literal=db-password=$(openssl rand -base64 32) \
  -n mangamotion

# Verify
kubectl get secrets -n mangamotion
kubectl describe secret mangamotion-secrets -n mangamotion
```

### Option 2: Sealed Secrets (Encrypted)

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Create sealed secret
echo -n "my-secret-value" | kubectl create secret generic my-secret --dry-run=client --from-file=/dev/stdin -o yaml | kubeseal -o yaml > my-sealed-secret.yaml

# Apply sealed secret
kubectl apply -f my-sealed-secret.yaml
```

### Option 3: External Secrets Operator (Vault/AWS Secrets Manager)

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create SecretStore (Vault example)
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: mangamotion
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "mangamotion"

# Create ExternalSecret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: mangamotion-secrets
  namespace: mangamotion
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: mangamotion-secrets
    creationPolicy: Owner
  data:
    - secretKey: jwt-secret
      remoteRef:
        key: mangamotion/jwt-secret
    - secretKey: worker-secret
      remoteRef:
        key: mangamotion/worker-secret
```

## Deployment Steps

### Step 1: Create Namespace

```bash
kubectl create namespace mangamotion
kubectl label namespace mangamotion environment=production
```

### Step 2: Create Secrets

```bash
# Generate secure random values
JWT_SECRET=$(openssl rand -base64 32)
WORKER_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)

# Create secret
kubectl create secret generic mangamotion-secrets \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=worker-secret="$WORKER_SECRET" \
  --from-literal=db-password="$DB_PASSWORD" \
  -n mangamotion

# Create Docker registry secret (if using private registry)
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.azurecr.io \
  --docker-username=<username> \
  --docker-password=<password> \
  -n mangamotion
```

### Step 3: Create ConfigMap

```bash
kubectl create configmap mangamotion-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=LOG_FORMAT=json \
  --from-literal=RATE_LIMIT_JOBS_PER_MINUTE=100 \
  --from-literal=CLAMAV_ENABLED=true \
  --from-literal=TRACING_ENABLED=true \
  --from-literal=JAEGER_SAMPLER=probabilistic \
  --from-literal=JAEGER_SAMPLER_PARAM=0.1 \
  -n mangamotion
```

### Step 4: Deploy Infrastructure

```bash
# PostgreSQL
kubectl apply -f k8s/postgres.yml

# Redis
kubectl apply -f k8s/redis.yml

# MinIO
kubectl apply -f k8s/minio.yml

# Wait for services to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n mangamotion --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n mangamotion --timeout=300s
kubectl wait --for=condition=ready pod -l app=minio -n mangamotion --timeout=300s
```

### Step 5: Deploy Application

```bash
# API
kubectl apply -f k8s/api.yml

# Worker
kubectl apply -f k8s/worker.yml

# Verify deployment
kubectl get deployments -n mangamotion
kubectl get pods -n mangamotion
```

### Step 6: Deploy Monitoring

```bash
# Prometheus
kubectl apply -f k8s/prometheus.yml

# Grafana
kubectl apply -f k8s/grafana.yml

# Jaeger
kubectl apply -f k8s/jaeger.yml

# AlertManager
kubectl apply -f k8s/alertmanager.yml
```

### Step 7: Configure Ingress

```bash
# Install Ingress Controller (if not present)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.0/deploy/static/provider/cloud/deploy.yaml

# Apply Ingress
kubectl apply -f k8s/ingress.yml

# Verify
kubectl get ingress -n mangamotion
```

## Configuration

### Environment Variables

**API Deployment**:
```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "3000"
  - name: REDIS_URL
    value: "redis://redis:6379"
  - name: PGHOST
    value: "postgres"
  - name: PGUSER
    value: "mmuser"
  - name: PGPASSWORD
    valueFrom:
      secretKeyRef:
        name: mangamotion-secrets
        key: db-password
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: mangamotion-secrets
        key: jwt-secret
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: mangamotion-config
        key: LOG_LEVEL
```

### Resource Requests & Limits

**API Pod**:
```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

**Worker Pod**:
```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi
```

### Health Checks

**Liveness Probe** (restart if unhealthy):
```yaml
livenessProbe:
  httpGet:
    path: /api/metrics
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Readiness Probe** (remove from load balancer if not ready):
```yaml
readinessProbe:
  httpGet:
    path: /api/metrics
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

## Scaling

### Horizontal Pod Autoscaling (HPA)

**API Auto-scaling**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: mangamotion
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Worker Auto-scaling** (based on queue depth):
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: mangamotion
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Pods
    pods:
      metric:
        name: redis_queue_length
      target:
        type: AverageValue
        averageValue: "100"
```

### Manual Scaling

```bash
# Scale API to 5 replicas
kubectl scale deployment api --replicas=5 -n mangamotion

# Scale Worker to 10 replicas
kubectl scale deployment worker --replicas=10 -n mangamotion

# Verify
kubectl get pods -n mangamotion
```

## Monitoring

### Prometheus Scrape Targets

```yaml
scrape_configs:
  - job_name: 'api'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - mangamotion
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: api
      - source_labels: [__meta_kubernetes_pod_port_name]
        action: keep
        regex: metrics

  - job_name: 'worker'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - mangamotion
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: worker
      - source_labels: [__meta_kubernetes_pod_port_name]
        action: keep
        regex: metrics
```

### Grafana Dashboards

Pre-built dashboards available:
- Job Processing Metrics
- Error Rates & Alerts
- Resource Utilization
- Queue Depth & Throughput
- Malware Detection
- Trace Analysis

### Alert Rules

```yaml
groups:
  - name: mangamotion
    rules:
      - alert: HighAPIErrorRate
        expr: rate(job_failed_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High API error rate"

      - alert: WorkerQueueBackup
        expr: redis_queue_length > 1000
        for: 10m
        annotations:
          summary: "Worker queue is backing up"

      - alert: APIDown
        expr: up{job="api"} == 0
        for: 1m
        annotations:
          summary: "API is down"
```

## Troubleshooting

### Check Pod Status

```bash
# Get all pods
kubectl get pods -n mangamotion

# Get pod details
kubectl describe pod <pod-name> -n mangamotion

# Get pod logs
kubectl logs <pod-name> -n mangamotion

# Get logs from previous crashed pod
kubectl logs <pod-name> -n mangamotion --previous

# Stream logs
kubectl logs -f <pod-name> -n mangamotion
```

### Check Service Connectivity

```bash
# Get services
kubectl get svc -n mangamotion

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup redis.mangamotion.svc.cluster.local

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://api:3000/api/metrics
```

### Check Resource Usage

```bash
# Pod resource usage
kubectl top pods -n mangamotion

# Node resource usage
kubectl top nodes

# Describe resource requests/limits
kubectl describe node <node-name>
```

### Database Issues

```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n mangamotion -- psql -U mmuser -d mangamotion

# Check database size
SELECT pg_size_pretty(pg_database_size('mangamotion'));

# Check active connections
SELECT count(*) FROM pg_stat_activity;
```

### Redis Issues

```bash
# Connect to Redis
kubectl exec -it redis-0 -n mangamotion -- redis-cli

# Check memory usage
INFO memory

# Check key count
DBSIZE

# Monitor commands
MONITOR
```

### Deployment Issues

```bash
# Check deployment status
kubectl describe deployment api -n mangamotion

# Check rollout history
kubectl rollout history deployment/api -n mangamotion

# Rollback to previous version
kubectl rollout undo deployment/api -n mangamotion

# Check events
kubectl get events -n mangamotion --sort-by='.lastTimestamp'
```

### Network Issues

```bash
# Check network policies
kubectl get networkpolicies -n mangamotion

# Check service endpoints
kubectl get endpoints -n mangamotion

# Test pod-to-pod connectivity
kubectl exec -it <pod-name> -n mangamotion -- ping <other-pod-name>
```

## Production Checklist

- [ ] Secrets configured in Vault/AWS Secrets Manager
- [ ] Database backups configured (daily)
- [ ] MinIO backups configured (daily)
- [ ] Monitoring alerts configured
- [ ] Log aggregation configured (ELK, Splunk, etc.)
- [ ] Network policies configured
- [ ] RBAC policies configured
- [ ] Resource quotas configured
- [ ] Pod Disruption Budgets configured
- [ ] Ingress TLS certificates configured
- [ ] Auto-scaling configured
- [ ] Disaster recovery plan documented

## Summary

This Kubernetes deployment provides:

✅ **High Availability**: Multiple replicas with load balancing
✅ **Auto-scaling**: HPA based on metrics
✅ **Secrets Management**: Multiple options (K8s, Sealed Secrets, Vault)
✅ **Monitoring**: Prometheus, Grafana, Jaeger
✅ **Health Checks**: Liveness and readiness probes
✅ **Resource Management**: Requests, limits, quotas
✅ **Production Ready**: Complete configuration and troubleshooting

**Next Steps**:
1. Create K8s manifests in `k8s/` directory
2. Configure secrets management
3. Deploy to staging cluster
4. Run integration tests
5. Deploy to production
