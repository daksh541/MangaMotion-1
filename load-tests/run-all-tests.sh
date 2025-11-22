#!/bin/bash

# MangaMotion Load Test Suite Runner
# Runs all load tests in sequence and generates a comprehensive report

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="load-test-results/$TIMESTAMP"
CONCURRENT_UPLOADS_USERS="${CONCURRENT_UPLOADS_USERS:-50}"
PRESIGN_UPLOADS_USERS="${PRESIGN_UPLOADS_USERS:-30}"
WORKER_PROCESSING_USERS="${WORKER_PROCESSING_USERS:-20}"
BOTTLENECK_INITIAL_USERS="${BOTTLENECK_INITIAL_USERS:-10}"
BOTTLENECK_MAX_USERS="${BOTTLENECK_MAX_USERS:-100}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_section() {
  echo -e "\n${YELLOW}📝 $1${NC}"
  echo -e "${YELLOW}─────────────────────────────────────────────────────────────${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Pre-flight checks
pre_flight_check() {
  print_section "Pre-Flight Infrastructure Check"

  # Check k6
  if ! command -v k6 &> /dev/null; then
    print_error "k6 is not installed. Please install k6 from https://k6.io/docs/getting-started/installation/"
    exit 1
  fi
  print_success "k6 is installed"

  # Check API health
  if curl -s "$BASE_URL/api/metrics" > /dev/null 2>&1; then
    print_success "API is healthy"
  else
    print_error "API is not responding at $BASE_URL"
    exit 1
  fi

  # Check Redis
  if redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is healthy"
  else
    print_error "Redis is not responding"
    exit 1
  fi

  # Check MinIO
  if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    print_success "MinIO is healthy"
  else
    print_error "MinIO is not responding"
    exit 1
  fi

  # Check PostgreSQL
  if psql -h localhost -U mmuser -d mangamotion -c "SELECT 1" > /dev/null 2>&1; then
    print_success "PostgreSQL is healthy"
  else
    print_error "PostgreSQL is not responding"
    exit 1
  fi

  print_success "All infrastructure checks passed!"
}

# Create results directory
mkdir -p "$RESULTS_DIR"
print_info "Results will be saved to: $RESULTS_DIR"

# Print header
print_header "MangaMotion Load Test Suite"
echo -e "Timestamp: $TIMESTAMP"
echo -e "Base URL: $BASE_URL"
echo ""

# Pre-flight checks
pre_flight_check

# Test 1: Concurrent Uploads
print_section "Test 1: Concurrent Uploads (${CONCURRENT_UPLOADS_USERS} users, 5 min)"
print_info "Testing API upload endpoint under concurrent load..."
print_info "Metrics: upload_success_rate, upload_duration_ms, job creation rate"

if k6 run load-tests/concurrent-uploads.js \
  -e BASE_URL="$BASE_URL" \
  -e CONCURRENT_USERS="$CONCURRENT_UPLOADS_USERS" \
  -o json="$RESULTS_DIR/concurrent-uploads.json" \
  2>&1 | tee "$RESULTS_DIR/concurrent-uploads.log"; then
  print_success "Concurrent uploads test completed"
else
  print_error "Concurrent uploads test failed"
fi

sleep 30

# Test 2: Presign + S3 Uploads
print_section "Test 2: Presign + S3 Uploads (${PRESIGN_UPLOADS_USERS} users, 5 min)"
print_info "Testing presigned URL generation and S3 uploads..."
print_info "Metrics: presign_success_rate, s3_upload_success_rate, S3 IOPS"

if k6 run load-tests/presign-uploads.js \
  -e BASE_URL="$BASE_URL" \
  -e CONCURRENT_USERS="$PRESIGN_UPLOADS_USERS" \
  -o json="$RESULTS_DIR/presign-uploads.json" \
  2>&1 | tee "$RESULTS_DIR/presign-uploads.log"; then
  print_success "Presign + S3 uploads test completed"
else
  print_error "Presign + S3 uploads test failed"
fi

sleep 30

# Test 3: Worker Processing
print_section "Test 3: Worker Processing (${WORKER_PROCESSING_USERS} users, 5 min)"
print_info "Testing worker processing performance..."
print_info "Metrics: job_success_rate, job_completion_time, worker throughput"

if k6 run load-tests/worker-processing.js \
  -e BASE_URL="$BASE_URL" \
  -e CONCURRENT_USERS="$WORKER_PROCESSING_USERS" \
  -o json="$RESULTS_DIR/worker-processing.json" \
  2>&1 | tee "$RESULTS_DIR/worker-processing.log"; then
  print_success "Worker processing test completed"
else
  print_error "Worker processing test failed"
fi

sleep 30

# Test 4: Bottleneck Detection
print_section "Test 4: Bottleneck Detection (ramp-up from ${BOTTLENECK_INITIAL_USERS} to ${BOTTLENECK_MAX_USERS} users)"
print_info "Gradually increasing load to identify breaking points..."
print_info "Metrics: API degradation, error rate, queue saturation, resource usage"

if k6 run load-tests/bottleneck-detection.js \
  -e BASE_URL="$BASE_URL" \
  -e INITIAL_USERS="$BOTTLENECK_INITIAL_USERS" \
  -e MAX_USERS="$BOTTLENECK_MAX_USERS" \
  -o json="$RESULTS_DIR/bottleneck-detection.json" \
  2>&1 | tee "$RESULTS_DIR/bottleneck-detection.log"; then
  print_success "Bottleneck detection test completed"
else
  print_error "Bottleneck detection test failed"
fi

# Generate summary report
print_section "Generating Summary Report"

cat > "$RESULTS_DIR/SUMMARY.md" << 'EOF'
# Load Test Results Summary

## Test Execution

- **Timestamp:** $(date)
- **Base URL:** $BASE_URL
- **Results Directory:** $RESULTS_DIR

## Test Results

### 1. Concurrent Uploads
- **Configuration:** 50 concurrent users, 5 minute duration
- **File Size:** 100 KB
- **Metrics:** See concurrent-uploads.json

### 2. Presign + S3 Uploads
- **Configuration:** 30 concurrent users, 5 minute duration
- **File Size:** 500 KB
- **Metrics:** See presign-uploads.json

### 3. Worker Processing
- **Configuration:** 20 concurrent users, 5 minute duration
- **File Size:** 100 KB
- **Metrics:** See worker-processing.json

### 4. Bottleneck Detection
- **Configuration:** Ramp-up from 10 to 100 concurrent users
- **Duration:** ~30 minutes
- **Metrics:** See bottleneck-detection.json

## Acceptance Criteria

- [ ] System handles expected concurrency (50+ concurrent users)
- [ ] Job failure rate < 5% due to infrastructure
- [ ] MinIO IOPS sufficient for concurrent uploads
- [ ] Database handles concurrent queries without deadlocks
- [ ] Worker processing throughput meets requirements

## Bottlenecks Identified

(To be filled in after analysis)

## Recommendations

(To be filled in after analysis)

## Next Steps

1. Review detailed logs in this directory
2. Analyze JSON metrics files
3. Implement recommended optimizations
4. Re-run tests to verify improvements
EOF

print_success "Summary report created"

# Print final summary
print_section "Load Test Suite Completed"
echo ""
echo -e "${GREEN}All tests completed successfully!${NC}"
echo ""
echo "📊 Results saved to: $RESULTS_DIR"
echo ""
echo "📋 Files generated:"
echo "  - concurrent-uploads.json"
echo "  - concurrent-uploads.log"
echo "  - presign-uploads.json"
echo "  - presign-uploads.log"
echo "  - worker-processing.json"
echo "  - worker-processing.log"
echo "  - bottleneck-detection.json"
echo "  - bottleneck-detection.log"
echo "  - SUMMARY.md"
echo ""
echo "🔍 Next steps:"
echo "  1. Review the logs: less $RESULTS_DIR/*.log"
echo "  2. Analyze metrics: jq . $RESULTS_DIR/*.json"
echo "  3. Check for bottlenecks in the logs"
echo "  4. Implement optimizations if needed"
echo "  5. Re-run tests to verify improvements"
echo ""
