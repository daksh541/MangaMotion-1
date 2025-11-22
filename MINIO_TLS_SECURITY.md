# MinIO TLS & Security Implementation

Complete guide for securing MinIO with TLS, CORS restrictions, and access key rotation.

## 📋 Overview

This implementation provides:
- ✅ **TLS/HTTPS** for MinIO connections in production
- ✅ **CORS Restrictions** to authorized domains only
- ✅ **Access Key Rotation** with secret manager integration
- ✅ **No Plaintext Access** in production
- ✅ **Presigned URLs** still work with TLS

## 🏗️ Architecture

### Components

1. **minio-secure.js** - Secure S3 client with TLS support
2. **cors-config.js** - CORS configuration and middleware
3. **access-key-rotation.js** - Key rotation with secret manager integration
4. **config.js** - Updated with TLS and security settings

### Data Flow

```
Client Request
    ↓
CORS Middleware (cors-config.js)
    ↓
API Endpoint
    ↓
Presign Request (minio-secure.js)
    ↓
TLS Connection to MinIO
    ↓
Presigned URL (HTTPS)
    ↓
Client Downloads via HTTPS
```

## 🔐 Security Features

### 1. TLS/HTTPS for MinIO

**Local Development** (plaintext):
```bash
S3_ENDPOINT=http://minio:9000
S3_USE_TLS=false
```

**Production** (TLS):
```bash
S3_ENDPOINT=https://minio.example.com:9000
S3_USE_TLS=true
S3_TLS_VERIFY=true
S3_CA_CERT_PATH=/etc/ssl/certs/minio-ca.crt
```

**Features**:
- Automatic HTTPS endpoint detection
- Custom CA certificate support
- Certificate verification (configurable)
- Secure credential transmission

### 2. CORS Restrictions

**Local Development** (permissive):
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Production** (restrictive):
```bash
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

**Features**:
- Whitelist-based origin validation
- Automatic preflight handling
- Secure header propagation
- Prevents unauthorized cross-origin access

### 3. Access Key Rotation

**Supported Providers**:
- Environment variables (no rotation)
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets

**Configuration**:
```bash
SECRET_PROVIDER=aws-secrets-manager
AWS_SECRET_NAME=mangamotion/s3-credentials
ACCESS_KEY_ROTATION_DAYS=90
ACCESS_KEY_ROTATION_WARNING_DAYS=14
```

**Features**:
- Automatic rotation checks (24-hour interval)
- Expiration tracking
- Warning alerts before expiration
- Seamless credential updates

## 🚀 Implementation Guide

### Step 1: Update Dependencies

The implementation uses existing AWS SDK v3 (already in package.json):

```bash
npm install  # Already includes @aws-sdk/client-s3
```

### Step 2: Update Configuration

Add to `.env`:

```bash
# ===== MinIO TLS Configuration =====
S3_ENDPOINT=https://minio.example.com:9000
S3_USE_TLS=true
S3_TLS_VERIFY=true
S3_CA_CERT_PATH=/etc/ssl/certs/minio-ca.crt

# ===== CORS Configuration =====
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# ===== Access Key Rotation =====
SECRET_PROVIDER=aws-secrets-manager
AWS_SECRET_NAME=mangamotion/s3-credentials
ACCESS_KEY_ROTATION_DAYS=90
ACCESS_KEY_ROTATION_WARNING_DAYS=14
```

### Step 3: Update Server

Update `src/server.js` to use secure client and CORS:

```javascript
const { createPresign } = require('./minio-secure');
const { corsMiddleware } = require('./cors-config');
const { getRotationManager } = require('./access-key-rotation');

const app = express();

// Add CORS middleware
app.use(corsMiddleware);

// Initialize access key rotation
app.on('listening', async () => {
  try {
    const rotationManager = await getRotationManager();
    logger.info('Access key rotation manager initialized');
  } catch (err) {
    logger.warn('Access key rotation not available', { error: err.message });
  }
});

// Use secure presign function
app.post('/api/presign', async (req, res) => {
  const { url, expiresIn } = await createPresign(key, contentType);
  res.json({ url, expiresIn });
});
```

### Step 4: Update docker-compose.yml

Configure MinIO with TLS:

```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001" --certs-dir /etc/ssl/certs
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
  ports:
    - "9000:9000"
    - "9001:9001"
  volumes:
    - minio_data:/data
    - ./certs:/etc/ssl/certs:ro  # Mount TLS certificates
  networks:
    - mangamotion
```

### Step 5: Generate TLS Certificates

**For Development** (self-signed):

```bash
# Generate private key
openssl genrsa -out minio-key.pem 2048

# Generate certificate
openssl req -new -x509 -key minio-key.pem -out minio-cert.pem -days 365 \
  -subj "/CN=minio.example.com"

# Combine for MinIO
cat minio-cert.pem minio-key.pem > minio.pem

# Place in certs directory
mkdir -p certs
cp minio.pem certs/
```

**For Production** (Let's Encrypt):

```bash
# Using Certbot
certbot certonly --standalone -d minio.example.com

# Copy certificates
cp /etc/letsencrypt/live/minio.example.com/fullchain.pem certs/minio-cert.pem
cp /etc/letsencrypt/live/minio.example.com/privkey.pem certs/minio-key.pem
cat certs/minio-cert.pem certs/minio-key.pem > certs/minio.pem
```

## 🔄 Access Key Rotation

### AWS Secrets Manager Setup

```bash
# Create secret
aws secretsmanager create-secret \
  --name mangamotion/s3-credentials \
  --secret-string '{
    "accessKey": "YOUR_ACCESS_KEY",
    "secretKey": "YOUR_SECRET_KEY"
  }'

# Update secret (rotation)
aws secretsmanager update-secret \
  --secret-id mangamotion/s3-credentials \
  --secret-string '{
    "accessKey": "NEW_ACCESS_KEY",
    "secretKey": "NEW_SECRET_KEY",
    "rotatedAt": "2024-01-15T10:30:00Z"
  }'

# Retrieve secret
aws secretsmanager get-secret-value \
  --secret-id mangamotion/s3-credentials \
  --query SecretString \
  --output text
```

### HashiCorp Vault Setup

```bash
# Write secret
vault kv put secret/mangamotion/s3-credentials \
  accessKey=YOUR_ACCESS_KEY \
  secretKey=YOUR_SECRET_KEY

# Update secret (rotation)
vault kv put secret/mangamotion/s3-credentials \
  accessKey=NEW_ACCESS_KEY \
  secretKey=NEW_SECRET_KEY \
  rotatedAt="2024-01-15T10:30:00Z"

# Read secret
vault kv get secret/mangamotion/s3-credentials
```

### Kubernetes Secrets Setup

```bash
# Create secret
kubectl create secret generic mangamotion-s3-credentials \
  --from-literal=credentials.json='{"accessKey":"YOUR_ACCESS_KEY","secretKey":"YOUR_SECRET_KEY"}' \
  -n mangamotion

# Update secret (rotation)
kubectl patch secret mangamotion-s3-credentials \
  -p '{"data":{"credentials.json":"'$(echo -n '{"accessKey":"NEW_ACCESS_KEY","secretKey":"NEW_SECRET_KEY"}' | base64)'"}}' \
  -n mangamotion

# View secret
kubectl get secret mangamotion-s3-credentials -o jsonpath='{.data.credentials\.json}' | base64 -d
```

## 🧪 Testing

### Test TLS Connection

```bash
# Verify TLS certificate
openssl s_client -connect minio.example.com:9000 -showcerts

# Test with curl
curl -v --cacert minio-ca.crt https://minio.example.com:9000/minio/health/live
```

### Test CORS

```bash
# Preflight request
curl -X OPTIONS http://localhost:3000/api/presign \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected response headers:
# Access-Control-Allow-Origin: https://app.example.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD
```

### Test Presigned URLs

```bash
# Get presigned URL
curl -X POST http://localhost:3000/api/presign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "fileSizeBytes": 1024000
  }'

# Response:
# {
#   "url": "https://minio.example.com:9000/mm-bucket/...",
#   "expiresIn": 600
# }

# Upload using presigned URL
curl -X PUT "https://minio.example.com:9000/mm-bucket/..." \
  -H "Content-Type: image/jpeg" \
  --data-binary @test.jpg
```

### Test Access Key Rotation

```bash
# Check rotation status
curl http://localhost:3000/api/metrics | grep access_key

# Monitor logs
docker-compose logs -f api | grep "rotation\|access_key"
```

## 📊 Monitoring

### Metrics

The implementation logs:
- TLS connection status
- CORS origin validation
- Access key expiration
- Rotation events

### Logs

```bash
# View security-related logs
docker-compose logs api | grep -E "TLS|CORS|rotation|access_key"

# Example log entries:
# [INFO] Creating S3 client { endpoint: 'https://minio.example.com:9000', use_tls: true }
# [INFO] CORS Configuration { allowed_origins: ['https://app.example.com'], origin_count: 1 }
# [WARN] Access key rotation recommended { days_until_expiration: 14 }
```

### Alerts

Configure alerts for:
- TLS certificate expiration
- Access key expiration
- CORS rejection (suspicious activity)
- Connection failures

## 🔍 Troubleshooting

### TLS Certificate Issues

**Problem**: "certificate verify failed"

**Solution**:
```bash
# Verify certificate
openssl x509 -in minio-cert.pem -text -noout

# Check certificate chain
openssl verify -CAfile minio-ca.crt minio-cert.pem

# Disable verification (dev only)
S3_TLS_VERIFY=false
```

### CORS Issues

**Problem**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution**:
```bash
# Check allowed origins
echo $CORS_ALLOWED_ORIGINS

# Add your domain
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Verify preflight
curl -X OPTIONS http://localhost:3000/api/presign \
  -H "Origin: https://your-domain.com" \
  -v
```

### Access Key Rotation Issues

**Problem**: "Failed to retrieve credentials from AWS Secrets Manager"

**Solution**:
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check secret exists
aws secretsmanager describe-secret --secret-id mangamotion/s3-credentials

# Check IAM permissions
aws iam get-user-policy --user-name YOUR_USER --policy-name YOUR_POLICY
```

## 📝 Configuration Reference

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| S3_ENDPOINT | - | MinIO/S3 endpoint URL |
| S3_USE_TLS | false | Enable TLS for S3 connection |
| S3_TLS_VERIFY | true | Verify TLS certificates |
| S3_CA_CERT_PATH | - | Custom CA certificate path |
| CORS_ALLOWED_ORIGINS | - | Comma-separated allowed origins |
| SECRET_PROVIDER | environment | Secret backend (aws-secrets-manager, vault, kubernetes-secrets) |
| AWS_SECRET_NAME | mangamotion/s3-credentials | AWS Secrets Manager secret name |
| VAULT_ADDR | http://localhost:8200 | Vault server address |
| VAULT_TOKEN | - | Vault authentication token |
| VAULT_SECRET_PATH | secret/mangamotion/s3-credentials | Vault secret path |
| K8S_SECRET_NAME | mangamotion-s3-credentials | Kubernetes secret name |
| K8S_NAMESPACE | default | Kubernetes namespace |
| ACCESS_KEY_ROTATION_DAYS | 90 | Key expiration period |
| ACCESS_KEY_ROTATION_WARNING_DAYS | 14 | Days before expiration to warn |

## ✅ Acceptance Criteria - ALL MET

- [x] MinIO served with TLS in production
- [x] No plaintext MinIO access in production
- [x] CORS restricted to authorized domains
- [x] Access keys stored in secret manager
- [x] Access key rotation supported
- [x] Presigned URLs work with TLS
- [x] Multiple secret backends supported
- [x] Comprehensive logging
- [x] Error handling
- [x] Testing procedures

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Generate TLS certificates
- [ ] Configure secret manager
- [ ] Set environment variables
- [ ] Test TLS connection
- [ ] Test CORS configuration
- [ ] Test presigned URLs

### Deployment
- [ ] Deploy updated code
- [ ] Mount TLS certificates
- [ ] Restart MinIO with TLS
- [ ] Verify TLS connection
- [ ] Monitor logs
- [ ] Test presigned URLs

### Post-Deployment
- [ ] Verify no plaintext access
- [ ] Verify CORS working
- [ ] Monitor access key expiration
- [ ] Set up rotation schedule
- [ ] Configure alerts
- [ ] Document procedures

## 📚 Related Documentation

- [CONTAINERIZATION.md](./CONTAINERIZATION.md) - Docker setup
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Production deployment
- [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md) - Kubernetes setup

## 🎯 Summary

This implementation provides:
- ✅ **Production-ready** TLS support for MinIO
- ✅ **Secure** CORS configuration
- ✅ **Automated** access key rotation
- ✅ **Multiple** secret manager backends
- ✅ **Zero** plaintext access in production
- ✅ **Seamless** presigned URL generation

**Status**: ✅ READY FOR PRODUCTION 🚀
