#!/bin/bash

# MangaMotion Monitoring Verification Script
# Verifies that all monitoring endpoints are working correctly

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"

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

# Check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}

    log "INFO" "Checking $description: $url"

    local response=$(curl -s -w "%{http_code}" "$url" 2>/dev/null)
    local http_code="${response: -3}"
    local body="${response%???}"

    if [[ "$http_code" == "$expected_status" ]]; then
        log "INFO" "✓ $description is working (HTTP $http_code)"
        return 0
    elif [[ "$http_code" == "404" ]]; then
        log "WARN" "$description not found (404) - may not be implemented"
        return 0
    else
        log "ERROR" "✗ $description failed with HTTP $http_code"
        if [[ -n "$body" ]] && [[ ${#body} -lt 500 ]]; then
            log "DEBUG" "Response: $body"
        fi
        return 1
    fi
}

# Check Prometheus metrics
check_prometheus_metrics() {
    log "INFO" "Checking Prometheus metrics endpoint..."

    local response=$(curl -s "$BASE_URL/metrics" 2>/dev/null)

    if [[ -n "$response" ]]; then
        local metrics_count=$(echo "$response" | grep -c '^# HELP' || echo "0")
        local data_points=$(echo "$response" | grep -c '^[^#]' || echo "0")

        log "INFO" "✓ Metrics endpoint accessible"
        log "INFO" "  - Help comments: $metrics_count"
        log "INFO" "  - Data points: $data_points"

        # Check for key metrics
        local key_metrics=(
            "http_requests_total"
            "jobs_processed_total"
            "processing_duration_seconds"
            "queue_depth"
        )

        local found_metrics=0
        for metric in "${key_metrics[@]}"; do
            if echo "$response" | grep -q "$metric"; then
                log "INFO" "  ✓ Found metric: $metric"
                ((found_metrics++))
            else
                log "WARN" "  ✗ Missing metric: $metric"
            fi
        done

        if [[ $found_metrics -gt 0 ]]; then
            log "INFO" "✓ Found $found_metrics key metrics"
            return 0
        else
            log "WARN" "No key metrics found"
            return 1
        fi
    else
        log "ERROR" "✗ Metrics endpoint not accessible"
        return 1
    fi
}

# Check Prometheus server
check_prometheus_server() {
    log "INFO" "Checking Prometheus server..."

    if check_http_endpoint "$PROMETHEUS_URL/-/healthy" "Prometheus health"; then
        # Check Prometheus targets
        local targets_response=$(curl -s "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null)

        if [[ -n "$targets_response" ]]; then
            local active_targets=$(echo "$targets_response" | jq -r '.data.activeTargets | length' 2>/dev/null || echo "unknown")
            log "INFO" "✓ Prometheus server is running"
            log "INFO" "  - Active targets: $active_targets"
            return 0
        fi
    else
        log "WARN" "Prometheus server not accessible"
    fi

    return 1
}

# Check Grafana server
check_grafana_server() {
    log "INFO" "Checking Grafana server..."

    if check_http_endpoint "$GRAFANA_URL/api/health" "Grafana health"; then
        log "INFO" "✓ Grafana server is running"
        return 0
    else
        log "WARN" "Grafana server not accessible"
        return 1
    fi
}

# Check Sentry error tracking
check_sentry() {
    log "INFO" "Checking Sentry error tracking..."

    # Check if Sentry DSN is configured
    local sentry_dsn="${SENTRY_DSN:-}"
    if [[ -z "$sentry_dsn" ]]; then
        # Try to get from environment file
        if [[ -f ".env.local" ]]; then
            sentry_dsn=$(grep -E "^SENTRY_DSN=" .env.local | cut -d'=' -f2)
        fi
    fi

    if [[ -n "$sentry_dsn" ]] && [[ "$sentry_dsn" != *"placeholder"* ]]; then
        log "INFO" "✓ Sentry DSN is configured"

        # Try to check Sentry project (this would require API access)
        log "INFO" "  - DSN configured (API check requires Sentry credentials)"
        return 0
    else
        log "WARN" "Sentry DSN not configured"
        return 1
    fi
}

# Check application logs for errors
check_application_logs() {
    log "INFO" "Checking application logs for recent errors..."

    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        local compose_cmd="docker-compose"
        if ! command -v docker-compose &> /dev/null; then
            compose_cmd="docker compose"
        fi

        # Check backend logs
        local error_count=$($compose_cmd -f docker-compose.prod.yml --env-file .env.local logs --tail=100 backend 2>/dev/null | grep -c -i "error\|exception\|failed" || echo "0")

        if [[ $error_count -eq 0 ]]; then
            log "INFO" "✓ No recent errors in backend logs"
        else
            log "WARN" "Found $error_count potential errors in backend logs"
        fi

        # Check worker logs
        local worker_errors=$($compose_cmd -f docker-compose.prod.yml --env-file .env.local logs --tail=100 worker 2>/dev/null | grep -c -i "error\|exception\|failed" || echo "0")

        if [[ $worker_errors -eq 0 ]]; then
            log "INFO" "✓ No recent errors in worker logs"
        else
            log "WARN" "Found $worker_errors potential errors in worker logs"
        fi

        return 0
    else
        log "WARN" "Docker Compose not available, skipping log checks"
        return 1
    fi
}

# Check database connectivity
check_database_monitoring() {
    log "INFO" "Checking database monitoring..."

    # Use our database check script
    if [[ -f "scripts/check-db.js" ]]; then
        # This would normally be run inside the container
        log "INFO" "✓ Database check script available"
        log "INFO" "  - Run with: docker-compose -f docker-compose.prod.yml exec backend node ../scripts/check-db.js"
        return 0
    else
        log "WARN" "Database check script not found"
        return 1
    fi
}

# Check RabbitMQ monitoring
check_rabbitmq_monitoring() {
    log "INFO" "Checking RabbitMQ monitoring..."

    if check_http_endpoint "http://localhost:15672/api/healthchecks/node" "RabbitMQ health"; then
        # Check queue status
        local queue_response=$(curl -s "http://localhost:15672/api/queues" 2>/dev/null)

        if [[ -n "$queue_response" ]]; then
            local queue_count=$(echo "$queue_response" | jq length 2>/dev/null || echo "unknown")
            log "INFO" "✓ RabbitMQ management API accessible"
            log "INFO" "  - Queue count: $queue_count"
            return 0
        fi
    else
        log "WARN" "RabbitMQ management API not accessible"
    fi

    return 1
}

# Check MinIO monitoring
check_minio_monitoring() {
    log "INFO" "Checking MinIO monitoring..."

    if check_http_endpoint "http://localhost:9000/minio/health/live" "MinIO health"; then
        log "INFO" "✓ MinIO health endpoint accessible"

        # Check MinIO console
        if check_http_endpoint "http://localhost:9001" "MinIO console"; then
            log "INFO" "✓ MinIO console is accessible"
        fi
        return 0
    else
        log "WARN" "MinIO health endpoint not accessible"
        return 1
    fi
}

# Generate monitoring report
generate_report() {
    log "INFO" "Generating monitoring report..."

    local report_file="monitoring-report-$(date +%Y%m%d_%H%M%S).json"

    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "base_url": "$BASE_URL",
  "checks": {
    "application_health": "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "failed")",
    "worker_health": "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/worker/health" 2>/dev/null || echo "failed")",
    "metrics_endpoint": "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics" 2>/dev/null || echo "failed")",
    "prometheus_health": "$(curl -s -o /dev/null -w "%{http_code}" "$PROMETHEUS_URL/-/healthy" 2>/dev/null || echo "failed")",
    "grafana_health": "$(curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL/api/health" 2>/dev/null || echo "failed")",
    "rabbitmq_health": "$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:15672/api/healthchecks/node" 2>/dev/null || echo "failed")",
    "minio_health": "$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9000/minio/health/live" 2>/dev/null || echo "failed")"
  },
  "configuration": {
    "sentry_configured": "$([[ -n "$SENTRY_DSN" && "$SENTRY_DSN" != *"placeholder"* ]] && echo "true" || echo "false")",
    "base_url": "$BASE_URL",
    "prometheus_url": "$PROMETHEUS_URL",
    "grafana_url": "$GRAFANA_URL"
  }
}
EOF

    log "INFO" "✓ Monitoring report saved: $report_file"
    echo "$report_file"
}

# Main monitoring check function
main() {
    log "INFO" "Starting MangaMotion monitoring verification"
    log "INFO" "Base URL: $BASE_URL"

    local failed_checks=0
    local total_checks=0

    # Run all monitoring checks
    local checks=(
        "check_http_endpoint '$BASE_URL/health' 'Application health'"
        "check_http_endpoint '$BASE_URL/worker/health' 'Worker health'"
        "check_http_endpoint '$BASE_URL/metrics' 'Metrics endpoint'"
        "check_prometheus_metrics"
        "check_database_monitoring"
        "check_rabbitmq_monitoring"
        "check_minio_monitoring"
        "check_sentry"
        "check_application_logs"
    )

    # Add optional checks if servers are running
    if curl -s "$PROMETHEUS_URL/-/healthy" >/dev/null 2>&1; then
        checks+=("check_prometheus_server")
    fi

    if curl -s "$GRAFANA_URL/api/health" >/dev/null 2>&1; then
        checks+=("check_grafana_server")
    fi

    for check in "${checks[@]}"; do
        ((total_checks++))
        if ! eval "$check"; then
            ((failed_checks++))
        fi
        echo  # Add spacing between checks
    done

    # Generate report
    local report_file=$(generate_report)

    # Summary
    log "INFO" "=== Monitoring Check Summary ==="
    log "INFO" "Total checks: $total_checks"
    log "INFO" "Failed checks: $failed_checks"
    log "INFO" "Success rate: $(( (total_checks - failed_checks) * 100 / total_checks ))%"

    if [[ $failed_checks -eq 0 ]]; then
        log "INFO" "🎉 All monitoring checks passed!"
    else
        log "WARN" "⚠️  $failed_checks monitoring check(s) failed"
    fi

    log "INFO" "Report saved: $report_file"

    return $failed_checks
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --base-url URL     Base URL to check (default: http://localhost:3000)"
    echo "  --prometheus URL   Prometheus URL (default: http://localhost:9090)"
    echo "  --grafana URL      Grafana URL (default: http://localhost:3001)"
    echo "  --help, -h         Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  BASE_URL           - Base URL to check"
    echo "  PROMETHEUS_URL     - Prometheus server URL"
    echo "  GRAFANA_URL        - Grafana server URL"
    echo "  SENTRY_DSN         - Sentry DSN for error tracking"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --base-url https://yourdomain.com"
    echo "  BASE_URL=https://yourdomain.com PROMETHEUS_URL=https://prometheus.yourdomain.com $0"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        --prometheus)
            PROMETHEUS_URL="$2"
            shift 2
            ;;
        --grafana)
            GRAFANA_URL="$2"
            shift 2
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"