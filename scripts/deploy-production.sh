#!/bin/bash

# MangaMotion Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.local"
HEALTH_CHECK_TIMEOUT=300
SLEEP_INTERVAL=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message"
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log "ERROR" "Docker Compose is not installed"
        exit 1
    fi

    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log "ERROR" "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    if [[ ! -f "$ENV_FILE" ]]; then
        log "ERROR" "Environment file not found: $ENV_FILE"
        exit 1
    fi

    # Check for required environment variables
    if ! grep -q "DATABASE_URL" "$ENV_FILE" || grep -q "<GENERATE" "$ENV_FILE"; then
        log "ERROR" "Environment file contains placeholder values. Please update with actual secrets."
        exit 1
    fi

    log "INFO" "Prerequisites check passed"
}

# Generate secrets if needed
generate_secrets() {
    log "INFO" "Checking if secrets need to be generated..."

    if [[ -f "$ENV_FILE" ]] && grep -q "<GENERATE" "$ENV_FILE"; then
        log "WARN" "Found placeholder values in environment file. Generating new secrets..."

        # Generate secure random values
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        RABBITMQ_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        MINIO_ACCESS_KEY=$(openssl rand -base64 15 | tr -d "=+/" | cut -c1-15 | tr '[:upper:]' '[:lower:]')
        MINIO_SECRET_KEY=$(openssl rand -base64 40 | tr -d "=+/" | cut -c1-40)
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        WORKER_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

        # Update environment file
        sed -i.bak "s/<GENERATE_STRONG_PASSWORD_32_CHARS>/$DB_PASSWORD/g" "$ENV_FILE"
        sed -i "s/<GENERATE_ACCESS_KEY_20_CHARS>/$MINIO_ACCESS_KEY/g" "$ENV_FILE"
        sed -i "s/<GENERATE_SECRET_KEY_40_CHARS>/$MINIO_SECRET_KEY/g" "$ENV_FILE"
        sed -i "s/<GENERATE_JWT_SECRET_64_CHARS_RANDOM>/$JWT_SECRET/g" "$ENV_FILE"
        sed -i "s/<GENERATE_REFRESH_SECRET_64_CHARS_RANDOM>/$JWT_REFRESH_SECRET/g" "$ENV_FILE"
        sed -i "s/<GENERATE_WORKER_SECRET_32_CHARS>/$WORKER_SECRET/g" "$ENV_FILE"

        # Update URLs with generated passwords
        sed -i "s/<GENERATE_STRONG_PASSWORD_32_CHARS>/$DB_PASSWORD/g" "$ENV_FILE"
        sed -i "s/<GENERATE_STRONG_PASSWORD_32_CHARS>/$REDIS_PASSWORD/g" "$ENV_FILE"
        sed -i "s/<GENERATE_STRONG_PASSWORD_32_CHARS>/$RABBITMQ_PASSWORD/g" "$ENV_FILE"

        log "INFO" "Secrets generated successfully"
    else
        log "INFO" "Secrets already configured"
    fi
}

# Deploy services
deploy_services() {
    log "INFO" "Starting deployment..."

    # Stop any existing services
    log "INFO" "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down || true

    # Pull latest images
    log "INFO" "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

    # Build and start services
    log "INFO" "Building and starting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

    log "INFO" "Deployment initiated"
}

# Wait for services to be healthy
wait_for_health() {
    log "INFO" "Waiting for services to become healthy..."

    local elapsed=0
    while [[ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]]; do
        local healthy_count=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null | grep -c "healthy" || echo "0")
        local total_count=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q | wc -l)

        log "INFO" "Healthy services: $healthy_count/$total_count (elapsed: ${elapsed}s)"

        if [[ $healthy_count -eq $total_count ]] && [[ $healthy_count -gt 0 ]]; then
            log "INFO" "All services are healthy"
            return 0
        fi

        sleep $SLEEP_INTERVAL
        elapsed=$((elapsed + SLEEP_INTERVAL))
    done

    log "ERROR" "Timeout waiting for services to become healthy"
    return 1
}

# Run database migrations
run_migrations() {
    log "INFO" "Running database migrations..."

    # Wait a bit more for database to be fully ready
    sleep 10

    # Check database connectivity first
    log "INFO" "Checking database connectivity..."
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend node ../scripts/check-db.js; then
        log "INFO" "Database connectivity check passed"
    else
        log "ERROR" "Database connectivity check failed"
        return 1
    fi

    # Run migrations
    log "INFO" "Applying database migrations..."
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend npm run migrate; then
        log "INFO" "Database migrations completed successfully"
    else
        log "ERROR" "Database migrations failed"
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    log "INFO" "Verifying deployment..."

    # Check service health endpoints
    local backend_health=$(curl -f -s http://localhost:3000/health 2>/dev/null || echo "failed")
    if [[ "$backend_health" == *"healthy"* ]]; then
        log "INFO" "Backend health check passed"
    else
        log "ERROR" "Backend health check failed"
        return 1
    fi

    # Check worker health
    local worker_health=$(curl -f -s http://localhost:3000/worker/health 2>/dev/null || echo "failed")
    if [[ "$worker_health" == *"healthy"* ]] || [[ "$worker_health" == *"ok"* ]]; then
        log "INFO" "Worker health check passed"
    else
        log "WARN" "Worker health check returned: $worker_health"
    fi

    # Check external services connectivity
    log "INFO" "Checking external services..."

    # MinIO connectivity
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend curl -f -s http://minio:9000/minio/health/live > /dev/null 2>&1; then
        log "INFO" "MinIO connectivity check passed"
    else
        log "WARN" "MinIO connectivity check failed"
    fi

    # RabbitMQ connectivity
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend curl -f -s http://rabbitmq:15672/api/healthchecks/node > /dev/null 2>&1; then
        log "INFO" "RabbitMQ connectivity check passed"
    else
        log "WARN" "RabbitMQ connectivity check failed"
    fi

    log "INFO" "Deployment verification completed"
}

# Run smoke tests
run_smoke_tests() {
    log "INFO" "Running smoke tests..."

    # Test authentication endpoint
    local auth_response=$(curl -s -w "%{http_code}" -o /tmp/auth_response.json http://localhost:3000/api/auth/me || echo "000")
    if [[ "$auth_response" == "401" ]] || [[ "$auth_response" == "200" ]]; then
        log "INFO" "Authentication endpoint test passed"
    else
        log "WARN" "Authentication endpoint returned: $auth_response"
    fi

    # Test prompt generation endpoint (should be rate limited or require auth)
    local gen_response=$(curl -s -w "%{http_code}" -o /tmp/gen_response.json \
        -X POST "http://localhost:3000/api/generate-from-prompt" \
        -H "Content-Type: application/json" \
        -d '{"prompt":"smoke-test","style":"cinematic","seed":42}' || echo "000")

    if [[ "$gen_response" == "401" ]] || [[ "$gen_response" == "429" ]] || [[ "$gen_response" == "200" ]]; then
        log "INFO" "Generation endpoint test passed (HTTP $gen_response)"
    else
        log "WARN" "Generation endpoint returned unexpected status: $gen_response"
    fi

    # Cleanup test files
    rm -f /tmp/auth_response.json /tmp/gen_response.json

    log "INFO" "Smoke tests completed"
}

# Display service status
show_status() {
    log "INFO" "Service status:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

    log "INFO" "Useful URLs:"
    echo "  - Application: http://localhost:3000"
    echo "  - Health check: http://localhost:3000/health"
    echo "  - Worker health: http://localhost:3000/worker/health"
    echo "  - MinIO Console: http://localhost:9001"
    echo "  - RabbitMQ Management: http://localhost:15672"
    echo "  - Grafana: http://localhost:3001"
    echo "  - Prometheus: http://localhost:9090"
}

# Cleanup function
cleanup() {
    log "INFO" "Performing cleanup..."
    # Add any cleanup tasks here
}

# Main execution
main() {
    log "INFO" "Starting MangaMotion Production Deployment"

    # Set up trap for cleanup
    trap cleanup EXIT

    # Run deployment steps
    check_prerequisites
    generate_secrets
    deploy_services

    # Wait for services to be healthy
    if wait_for_health; then
        run_migrations
        verify_deployment
        run_smoke_tests
        show_status

        log "INFO" "Production deployment completed successfully!"
    else
        log "ERROR" "Deployment failed during health check phase"
        log "ERROR" "Check service logs with: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "check")
        check_prerequisites
        ;;
    "secrets")
        generate_secrets
        ;;
    "deploy")
        deploy_services
        ;;
    "migrate")
        run_migrations
        ;;
    "verify")
        verify_deployment
        ;;
    "test")
        run_smoke_tests
        ;;
    "status")
        show_status
        ;;
    "stop")
        log "INFO" "Stopping services..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "${2:-}"
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [check|secrets|deploy|migrate|verify|test|status|stop|logs [service]]"
        exit 1
        ;;
esac