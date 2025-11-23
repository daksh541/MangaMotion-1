# Deploy Script & E2E Tests - Quick Start

## 5-Minute Setup

### 1. Make Deploy Script Executable

```bash
chmod +x deploy.sh
```

### 2. Configure Environment

```bash
# Edit .env with your environment variables
nano .env

# For staging/production, add:
STAGING_HOST=staging.example.com
STAGING_USER=deploy
PRODUCTION_HOST=production.example.com
PRODUCTION_USER=deploy
```

### 3. Deploy to Dev

```bash
# Build images
./deploy.sh dev build

# Deploy
./deploy.sh dev deploy

# Check status
./deploy.sh dev status
```

### 4. Setup Cypress

```bash
# Install Cypress
npm install --save-dev cypress

# Open Cypress UI
npx cypress open
```

### 5. Run E2E Tests

```bash
# Run all tests
npx cypress run

# Run specific test
npx cypress run --spec "cypress/e2e/complete-flow.cy.js"

# Open UI
npx cypress open
```

## Deploy Commands

### Build

```bash
# Dev
./deploy.sh dev build

# Staging
./deploy.sh staging build

# Production
./deploy.sh production build
```

### Deploy

```bash
# Dev (local)
./deploy.sh dev deploy

# Staging (remote)
./deploy.sh staging deploy

# Production (remote)
./deploy.sh production deploy
```

### Status

```bash
./deploy.sh production status
```

### Logs

```bash
./deploy.sh production logs
```

### Rollback

```bash
./deploy.sh production rollback
```

## E2E Tests

### Run Tests

```bash
# Headless
npx cypress run

# Interactive UI
npx cypress open

# Specific test
npx cypress run --spec "cypress/e2e/complete-flow.cy.js"

# Specific browser
npx cypress run --browser chrome
```

### Test Results

- Screenshots: `cypress/screenshots/`
- Videos: `cypress/videos/`
- Reports: `cypress/reports/`

### Test Coverage

| Area | Tests |
|------|-------|
| Registration | 3 |
| Login | 2 |
| Job Creation | 3 |
| Status Polling | 3 |
| Result Viewing | 3 |
| Regeneration | 3 |
| Dashboard | 5 |
| Logout | 2 |
| Error Handling | 3 |
| **Total** | **27** |

## Deployment Flow

### Dev (Local)

```bash
./deploy.sh dev deploy
# 1. Build images
# 2. Stop containers
# 3. Start containers
# 4. Run migrations
# 5. Health check
```

### Staging (Remote)

```bash
./deploy.sh staging deploy
# 1. Backup database
# 2. SSH to staging
# 3. Pull code
# 4. Pull images
# 5. Start containers
# 6. Run migrations
# 7. Health check
# 8. Slack notification
```

### Production (Remote)

```bash
./deploy.sh production deploy
# 1. Backup database
# 2. SSH to production
# 3. Pull code
# 4. Pull images
# 5. Start containers
# 6. Run migrations
# 7. Health check
# 8. Slack notification
```

## Workflow

### Before Deployment

```bash
# 1. Run tests
npm test
npx cypress run

# 2. Build images
./deploy.sh production build

# 3. Check status
./deploy.sh production status
```

### Deploy

```bash
# 1. Deploy to staging
./deploy.sh staging deploy

# 2. Test on staging
npx cypress run --env baseUrl=https://staging.example.com

# 3. Deploy to production
./deploy.sh production deploy

# 4. Verify production
./deploy.sh production status
```

### After Deployment

```bash
# 1. Check logs
./deploy.sh production logs

# 2. Monitor health
curl https://production.example.com/health

# 3. Run smoke tests
npx cypress run --spec "cypress/e2e/complete-flow.cy.js"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH connection fails | Check SSH key and host |
| Docker build fails | Check disk space, clean up |
| Health check fails | Check logs: `./deploy.sh production logs` |
| Tests timeout | Increase timeout in cypress.config.js |
| Tests fail | Check backend is running on localhost:3000 |

## Key Files

| File | Purpose |
|------|---------|
| `deploy.sh` | Deployment automation |
| `cypress/e2e/complete-flow.cy.js` | E2E tests |
| `cypress.config.js` | Cypress configuration |
| `.env` | Environment variables |

## Features

✅ Multi-environment deployment
✅ Automated backups
✅ Health checks
✅ Rollback capability
✅ Comprehensive E2E tests
✅ Error handling
✅ Logging and monitoring
✅ CI/CD integration

## Next Steps

1. Configure SSH keys for production
2. Setup Slack notifications
3. Configure monitoring (Sentry, Prometheus)
4. Setup log aggregation (ELK, Datadog)
5. Create runbook for operations
6. Train team on deployment process

## Documentation

- Full docs: `DEPLOY_AND_E2E_TESTS_README.md`
- Deploy script: `deploy.sh`
- E2E tests: `cypress/e2e/complete-flow.cy.js`
