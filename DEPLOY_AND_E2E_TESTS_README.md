# Deploy Script & E2E Tests - Phase 9

## Overview

Phase 9 provides a complete deployment automation script and comprehensive end-to-end test suite. The deploy script handles building, deploying, and managing the application across dev, staging, and production environments. The E2E tests verify the entire user workflow.

## Deploy Script (deploy.sh)

### Features

- **Multi-environment support** - dev, staging, production
- **Multiple actions** - build, deploy, rollback, status, logs, test
- **Automated backups** - Database backup before deployment
- **Health checks** - Verify deployment success
- **Rollback capability** - Revert to previous version
- **Comprehensive logging** - Color-coded output
- **SSH automation** - Remote deployment via SSH

### Usage

```bash
# Make script executable
chmod +x deploy.sh

# Build images
./deploy.sh dev build
./deploy.sh staging build
./deploy.sh production build

# Deploy
./deploy.sh dev deploy
./deploy.sh staging deploy
./deploy.sh production deploy

# Check status
./deploy.sh dev status
./deploy.sh staging status
./deploy.sh production status

# View logs
./deploy.sh dev logs
./deploy.sh staging logs
./deploy.sh production logs

# Rollback
./deploy.sh staging rollback
./deploy.sh production rollback

# Run tests
./deploy.sh dev test
```

### Configuration

Environment variables in `.env`:

```bash
# Staging
STAGING_HOST=staging.example.com
STAGING_USER=deploy

# Production
PRODUCTION_HOST=production.example.com
PRODUCTION_USER=deploy
```

### Deployment Flow

**Local (Dev):**
```
1. Build Docker images
2. Stop existing containers
3. Start new containers
4. Run migrations
5. Verify health
```

**Remote (Staging/Production):**
```
1. Backup database
2. SSH to server
3. Pull latest code
4. Pull latest images
5. Start containers
6. Run migrations
7. Health check
8. Slack notification
```

### Actions

#### Build

```bash
./deploy.sh production build
```

- Builds backend Docker image
- Builds worker Docker image
- Tags with timestamp and 'latest'
- Pushes to container registry

#### Deploy

```bash
./deploy.sh production deploy
```

- Builds images
- Pushes to registry
- Backs up database
- Deploys to environment
- Runs migrations
- Performs health checks

#### Rollback

```bash
./deploy.sh production rollback
```

- Reverts to previous Git commit
- Restarts services
- Verifies health

#### Status

```bash
./deploy.sh production status
```

- Shows container status
- Displays health check results
- Shows WebSocket stats

#### Logs

```bash
./deploy.sh production logs
```

- Streams logs from all services
- Last 100 lines
- Real-time updates

## E2E Tests (Cypress)

### Features

- **Complete user workflow** - Registration to logout
- **Job creation** - From prompt
- **Status polling** - Real-time progress
- **Result viewing** - Video player and metadata
- **Job regeneration** - Edit and recreate
- **Dashboard** - Gallery, filtering, search
- **Error handling** - Network errors, 404s, 500s
- **Authentication** - Login, logout, protected routes

### Test Structure

```
cypress/e2e/complete-flow.cy.js
├── User Registration
│   ├── Register new user
│   ├── Invalid email error
│   └── Weak password error
├── User Login
│   ├── Login with valid credentials
│   └── Invalid credentials error
├── Job Creation
│   ├── Create from prompt
│   ├── Empty prompt error
│   └── Insufficient credits error
├── Job Status Polling
│   ├── Display progress
│   ├── Update in real-time
│   └── Show completed status
├── Result Viewing
│   ├── Display video player
│   ├── Display metadata
│   └── Download result
├── Job Regeneration
│   ├── Open modal
│   ├── Prefill prompt
│   └── Edit and recreate
├── Dashboard
│   ├── Display dashboard
│   ├── Display statistics
│   ├── Search jobs
│   ├── Filter by status
│   └── Bulk delete
├── Logout
│   ├── Logout user
│   └── Prevent access after logout
└── Error Handling
    ├── Network errors
    ├── 404 errors
    └── 500 errors
```

### Running Tests

```bash
# Install Cypress
npm install --save-dev cypress

# Open Cypress UI
npx cypress open

# Run tests headless
npx cypress run

# Run specific test
npx cypress run --spec "cypress/e2e/complete-flow.cy.js"

# Run with specific browser
npx cypress run --browser chrome
npx cypress run --browser firefox
npx cypress run --browser edge
```

### Test Configuration

`cypress.config.js`:

```javascript
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // Plugins
    }
  }
};
```

### Test Data

Tests use dynamically generated email addresses to avoid conflicts:

```javascript
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!'
};
```

### Assertions

Tests verify:
- UI elements are visible
- Navigation works correctly
- API responses are correct
- Error messages appear
- Data is persisted
- State changes occur

### Screenshots & Videos

Cypress automatically captures:
- Screenshots on failure
- Videos of entire test run
- Network requests and responses

Location: `cypress/screenshots/` and `cypress/videos/`

## CI/CD Integration

### GitHub Actions

The `.github/workflows/deploy.yml` includes E2E tests:

```yaml
- name: Run E2E tests
  run: npx cypress run
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: cypress-results
    path: cypress/
```

### Local Testing

Before pushing:

```bash
# Run all tests
npm test

# Run E2E tests
npx cypress run

# Run with coverage
npm test -- --coverage
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backups configured
- [ ] Monitoring setup

### Deployment

- [ ] Run `./deploy.sh staging deploy`
- [ ] Verify staging deployment
- [ ] Run E2E tests on staging
- [ ] Run `./deploy.sh production deploy`
- [ ] Verify production deployment
- [ ] Monitor logs
- [ ] Check health endpoints

### Post-Deployment

- [ ] Verify all services running
- [ ] Check database integrity
- [ ] Monitor error rates
- [ ] Verify backups
- [ ] Notify team
- [ ] Document changes

## Troubleshooting

### Deploy Script Issues

**SSH connection fails:**
```bash
# Check SSH key
ssh-keyscan -H production.example.com >> ~/.ssh/known_hosts

# Verify credentials
ssh -i ~/.ssh/id_rsa deploy@production.example.com
```

**Docker build fails:**
```bash
# Check Docker daemon
docker ps

# Check disk space
docker system df

# Clean up
docker system prune -a
```

**Health check fails:**
```bash
# Check service logs
./deploy.sh production logs

# Verify endpoint
curl https://production.example.com/health

# Check database
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d mangamotion -c "SELECT 1"
```

### E2E Test Issues

**Tests timeout:**
```bash
# Increase timeout in cypress.config.js
defaultCommandTimeout: 20000

# Or run with longer timeout
npx cypress run --config defaultCommandTimeout=20000
```

**Tests fail intermittently:**
```bash
# Add waits
cy.wait(1000);

# Use cy.intercept for API mocking
cy.intercept('GET', '/api/status/*', { delay: 500 });
```

**Cannot connect to localhost:**
```bash
# Ensure backend is running
npm start

# Check port 3000
lsof -i :3000

# Verify frontend is built
npm run build
```

## Files

### Deploy
- `deploy.sh` - Deployment automation script

### Tests
- `cypress/e2e/complete-flow.cy.js` - E2E test suite
- `cypress.config.js` - Cypress configuration
- `cypress/support/commands.js` - Custom commands
- `cypress/support/e2e.js` - Test setup

### Documentation
- `DEPLOY_AND_E2E_TESTS_README.md` - This file
- `DEPLOY_AND_E2E_TESTS_QUICKSTART.md` - Quick start guide

## Best Practices

### Deployment

1. **Always backup before deploying**
   ```bash
   ./deploy.sh production deploy  # Automatic backup
   ```

2. **Test on staging first**
   ```bash
   ./deploy.sh staging deploy
   npx cypress run --env baseUrl=https://staging.example.com
   ```

3. **Monitor after deployment**
   ```bash
   ./deploy.sh production logs
   ```

4. **Have rollback plan**
   ```bash
   ./deploy.sh production rollback
   ```

### Testing

1. **Run tests locally before pushing**
   ```bash
   npm test
   npx cypress run
   ```

2. **Use meaningful test names**
   ```javascript
   it('should create job from prompt and display result')
   ```

3. **Test error cases**
   ```javascript
   it('should show error for insufficient credits')
   ```

4. **Keep tests independent**
   ```javascript
   // Each test should be able to run alone
   beforeEach(() => {
     // Setup for each test
   });
   ```

## Support

For issues or questions, refer to the main project README or contact the development team.
