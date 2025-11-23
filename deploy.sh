#!/bin/bash

################################################################################
# MangaMotion Deployment Script
# 
# Usage: ./deploy.sh [environment] [action]
# 
# Environments: dev, staging, production
# Actions: build, deploy, rollback, status, logs
#
# Examples:
#   ./deploy.sh dev build
#   ./deploy.sh staging deploy
#   ./deploy.sh production status
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
ACTION=${2:-deploy}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="mangamotion"
REGISTRY="ghcr.io"
IMAGE_NAME="${REGISTRY}/${PROJECT_NAME}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/${PROJECT_NAME}"

# Environment-specific configuration
case $ENVIRONMENT in
  dev)
    DOCKER_COMPOSE_FILE="docker-compose.yml"
    DEPLOY_HOST="localhost"
    DEPLOY_USER="$USER"
    ;;
  staging)
    DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
    DEPLOY_HOST="${STAGING_HOST:-staging.example.com}"
    DEPLOY_USER="${STAGING_USER:-deploy}"
    ;;
  production)
    DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
    DEPLOY_HOST="${PRODUCTION_HOST:-production.example.com}"
    DEPLOY_USER="${PRODUCTION_USER:-deploy}"
    ;;
  *)
    echo -e "${RED}Error: Invalid environment '${ENVIRONMENT}'${NC}"
    echo "Valid environments: dev, staging, production"
    exit 1
    ;;
esac

################################################################################
# Utility Functions
################################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
  log_info "Checking prerequisites..."
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
  fi
  
  # Check Git
  if ! command -v git &> /dev/null; then
    log_error "Git is not installed"
    exit 1
  fi
  
  log_success "All prerequisites met"
}

load_env() {
  log_info "Loading environment variables..."
  
  if [ ! -f ".env" ]; then
    log_error ".env file not found"
    exit 1
  fi
  
  set -a
  source .env
  set +a
  
  log_success "Environment variables loaded"
}

################################################################################
# Build Functions
################################################################################

build_images() {
  log_info "Building Docker images for ${ENVIRONMENT}..."
  
  cd "$SCRIPT_DIR"
  
  # Build backend
  log_info "Building backend image..."
  docker build \
    -f mangamotion/deployments/Dockerfile.backend \
    -t "${IMAGE_NAME}:backend-${TIMESTAMP}" \
    -t "${IMAGE_NAME}:backend-latest" \
    .
  
  # Build worker
  log_info "Building worker image..."
  docker build \
    -f mangamotion/deployments/Dockerfile.python_worker \
    -t "${IMAGE_NAME}:worker-${TIMESTAMP}" \
    -t "${IMAGE_NAME}:worker-latest" \
    .
  
  log_success "Docker images built successfully"
}

push_images() {
  log_info "Pushing Docker images to registry..."
  
  if [ "$ENVIRONMENT" = "dev" ]; then
    log_warning "Skipping push for dev environment"
    return
  fi
  
  docker push "${IMAGE_NAME}:backend-${TIMESTAMP}"
  docker push "${IMAGE_NAME}:backend-latest"
  docker push "${IMAGE_NAME}:worker-${TIMESTAMP}"
  docker push "${IMAGE_NAME}:worker-latest"
  
  log_success "Docker images pushed successfully"
}

################################################################################
# Deployment Functions
################################################################################

backup_database() {
  log_info "Backing up database..."
  
  mkdir -p "$BACKUP_DIR"
  
  if [ "$ENVIRONMENT" = "dev" ]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
      pg_dump -U postgres mangamotion | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
  else
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
      mkdir -p $BACKUP_DIR
      cd /app/mangamotion
      docker-compose -f docker-compose.prod.yml exec -T postgres \
        pg_dump -U postgres mangamotion | gzip > $BACKUP_DIR/db_${TIMESTAMP}.sql.gz
EOF
  fi
  
  log_success "Database backed up to $BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
}

deploy_local() {
  log_info "Deploying to local environment..."
  
  cd "$SCRIPT_DIR"
  
  # Stop existing containers
  log_info "Stopping existing containers..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" down || true
  
  # Start services
  log_info "Starting services..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
  
  # Wait for services to be ready
  log_info "Waiting for services to be ready..."
  sleep 10
  
  # Run migrations
  log_info "Running database migrations..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run migrate
  
  log_success "Local deployment completed"
}

deploy_remote() {
  log_info "Deploying to ${ENVIRONMENT} environment..."
  
  # Backup database
  backup_database
  
  # Deploy via SSH
  ssh "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
    set -e
    
    log_info() { echo "[INFO] \$1"; }
    log_success() { echo "[SUCCESS] \$1"; }
    
    cd /app/mangamotion
    
    # Pull latest code
    log_info "Pulling latest code..."
    git pull origin main
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose -f docker-compose.prod.yml pull
    
    # Start services
    log_info "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Run migrations
    log_info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate
    
    # Wait for health check
    log_info "Waiting for health check..."
    for i in {1..30}; do
      if curl -f https://${DEPLOY_HOST}/health > /dev/null 2>&1; then
        log_success "Health check passed"
        exit 0
      fi
      echo "Waiting... (\$i/30)"
      sleep 2
    done
    
    log_error "Health check failed"
    exit 1
EOF
  
  log_success "Remote deployment completed"
}

################################################################################
# Rollback Functions
################################################################################

rollback() {
  log_warning "Rolling back to previous version..."
  
  if [ "$ENVIRONMENT" = "dev" ]; then
    log_error "Rollback not supported for dev environment"
    exit 1
  fi
  
  ssh "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
    cd /app/mangamotion
    
    # Get previous commit
    PREVIOUS_COMMIT=\$(git rev-parse HEAD~1)
    
    # Checkout previous version
    git checkout \$PREVIOUS_COMMIT
    
    # Restart services
    docker-compose -f docker-compose.prod.yml restart
    
    echo "Rolled back to \$PREVIOUS_COMMIT"
EOF
  
  log_success "Rollback completed"
}

################################################################################
# Status Functions
################################################################################

status() {
  log_info "Checking deployment status for ${ENVIRONMENT}..."
  
  if [ "$ENVIRONMENT" = "dev" ]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
  else
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
      cd /app/mangamotion
      docker-compose -f docker-compose.prod.yml ps
      
      echo ""
      echo "Health check:"
      curl -s https://${DEPLOY_HOST}/health | jq . || echo "Health check failed"
      
      echo ""
      echo "WebSocket stats:"
      curl -s https://${DEPLOY_HOST}/api/ws/stats | jq . || echo "WebSocket stats unavailable"
EOF
  fi
}

logs() {
  log_info "Showing logs for ${ENVIRONMENT}..."
  
  if [ "$ENVIRONMENT" = "dev" ]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f --tail=100
  else
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
      cd /app/mangamotion
      docker-compose -f docker-compose.prod.yml logs -f --tail=100
EOF
  fi
}

################################################################################
# Test Functions
################################################################################

run_tests() {
  log_info "Running tests..."
  
  cd "$SCRIPT_DIR/mangamotion/backend"
  
  # Unit tests
  log_info "Running unit tests..."
  npm test -- --coverage
  
  # E2E tests
  log_info "Running E2E tests..."
  cd "$SCRIPT_DIR"
  npm run test:e2e
  
  log_success "All tests passed"
}

################################################################################
# Main
################################################################################

main() {
  log_info "MangaMotion Deployment Script"
  log_info "Environment: ${ENVIRONMENT}"
  log_info "Action: ${ACTION}"
  
  check_prerequisites
  load_env
  
  case $ACTION in
    build)
      build_images
      push_images
      ;;
    deploy)
      build_images
      push_images
      if [ "$ENVIRONMENT" = "dev" ]; then
        deploy_local
      else
        deploy_remote
      fi
      ;;
    rollback)
      rollback
      ;;
    status)
      status
      ;;
    logs)
      logs
      ;;
    test)
      run_tests
      ;;
    *)
      log_error "Invalid action '${ACTION}'"
      echo "Valid actions: build, deploy, rollback, status, logs, test"
      exit 1
      ;;
  esac
  
  log_success "Deployment script completed"
}

# Run main function
main
