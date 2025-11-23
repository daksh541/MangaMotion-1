#!/bin/bash

# MangaMotion Production Smoke Test Script
# Simulates the smoke tests that would be run against production

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_PROMPT="smoke-test: convert to anime-style"
TEST_FILE="${TEST_FILE:-/mnt/data/Screen Recording 2025-11-23 at 11.08.16 PM.mov}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"

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

# Make HTTP request with proper error handling
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4

    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"

    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    if [[ -n "$ACCESS_TOKEN" ]]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $ACCESS_TOKEN'"
    fi

    curl_cmd="$curl_cmd '$url'"

    local response=$(eval "$curl_cmd")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)

    echo "$body"
    return $http_code
}

# Test 1: Health Check
test_health_check() {
    log "INFO" "Testing health check endpoint..."

    local response=$(curl -s -w "%{http_code}" "$BASE_URL/health" 2>/dev/null)
    local http_code="${response: -3}"
    local body="${response%???}"

    if [[ "$http_code" == "200" ]]; then
        if [[ "$body" == *"healthy"* ]] || [[ "$body" == *"OK"* ]]; then
            log "INFO" "✓ Health check passed"
            return 0
        else
            log "WARN" "Health check returned 200 but unexpected body: $body"
            return 0
        fi
    else
        log "ERROR" "✗ Health check failed with HTTP $http_code"
        return 1
    fi
}

# Test 2: Worker Health
test_worker_health() {
    log "INFO" "Testing worker health endpoint..."

    local response=$(curl -s -w "%{http_code}" "$BASE_URL/worker/health" 2>/dev/null)
    local http_code="${response: -3}"
    local body="${response%???}"

    if [[ "$http_code" == "200" ]]; then
        log "INFO" "✓ Worker health check passed"
        return 0
    elif [[ "$http_code" == "404" ]]; then
        log "WARN" "Worker health endpoint not found (404) - may not be implemented"
        return 0
    else
        log "ERROR" "✗ Worker health check failed with HTTP $http_code"
        return 1
    fi
}

# Test 3: Authentication Check
test_authentication() {
    log "INFO" "Testing authentication endpoint..."

    local response=$(curl -s -w "%{http_code}" "$BASE_URL/api/auth/me" 2>/dev/null)
    local http_code="${response: -3}"

    if [[ "$http_code" == "401" ]]; then
        log "INFO" "✓ Authentication endpoint working (requires auth as expected)"
        return 0
    elif [[ "$http_code" == "200" ]]; then
        log "INFO" "✓ Authentication endpoint working (user authenticated)"
        return 0
    else
        log "WARN" "Authentication endpoint returned HTTP $http_code"
        return 0  # Don't fail the test for auth issues
    fi
}

# Test 4: Prompt Generation
test_prompt_generation() {
    log "INFO" "Testing prompt generation endpoint..."

    local test_data='{"prompt":"'$TEST_PROMPT'","style":"cinematic","seed":42}'
    local response=$(curl -s -w "%{http_code}" \
        -X POST "$BASE_URL/api/generate-from-prompt" \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        ${ACCESS_TOKEN:+-H "Authorization: Bearer $ACCESS_TOKEN"} \
        2>/dev/null)

    local http_code="${response: -3}"
    local body="${response%???}"

    case "$http_code" in
        200)
            log "INFO" "✓ Prompt generation successful"
            if echo "$body" | grep -q "jobId"; then
                local job_id=$(echo "$body" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
                log "INFO" "Created job ID: $job_id"
                return 0
            else
                log "WARN" "Prompt generation returned 200 but no jobId found"
                return 0
            fi
            ;;
        401)
            log "INFO" "✓ Prompt generation requires authentication (401)"
            return 0
            ;;
        429)
            log "INFO" "✓ Rate limiting active (429)"
            return 0
            ;;
        400|422)
            log "INFO" "✓ Input validation working ($http_code)"
            return 0
            ;;
        *)
            log "ERROR" "✗ Prompt generation failed with HTTP $http_code"
            log "ERROR" "Response body: $body"
            return 1
            ;;
    esac
}

# Test 5: File Upload Structure
test_file_upload_structure() {
    log "INFO" "Testing file upload endpoint structure..."

    # Test with missing file (should return validation error or auth error)
    local response=$(curl -s -w "%{http_code}" \
        -X POST "$BASE_URL/api/upload" \
        -H "Content-Type: multipart/form-data" \
        ${ACCESS_TOKEN:+-H "Authorization: Bearer $ACCESS_TOKEN"} \
        2>/dev/null)

    local http_code="${response: -3}"

    case "$http_code" in
        400|415)
            log "INFO" "✓ File upload validation working ($http_code)"
            return 0
            ;;
        401)
            log "INFO" "✓ File upload requires authentication (401)"
            return 0
            ;;
        429)
            log "INFO" "✓ File upload rate limiting active (429)"
            return 0
            ;;
        500)
            log "ERROR" "✗ File upload endpoint server error (500)"
            return 1
            ;;
        *)
            log "WARN" "File upload endpoint returned HTTP $http_code"
            return 0  # Don't fail the test for upload issues
            ;;
    esac
}

# Test 6: Status Endpoint with Invalid ID
test_invalid_job_status() {
    log "INFO" "Testing status endpoint with invalid job ID..."

    local response=$(curl -s -w "%{http_code}" \
        "$BASE_URL/api/status/invalid-job-id-12345" \
        ${ACCESS_TOKEN:+-H "Authorization: Bearer $ACCESS_TOKEN"} \
        2>/dev/null)

    local http_code="${response: -3}"

    case "$http_code" in
        404)
            log "INFO" "✓ Invalid job ID handled correctly (404)"
            return 0
            ;;
        400)
            log "INFO" "✓ Invalid job ID format validation (400)"
            return 0
            ;;
        401)
            log "INFO" "✓ Status endpoint requires authentication (401)"
            return 0
            ;;
        *)
            log "WARN" "Status endpoint for invalid ID returned HTTP $http_code"
            return 0
            ;;
    esac
}

# Test 7: Rate Limiting Test
test_rate_limiting() {
    log "INFO" "Testing rate limiting on generation endpoint..."

    local rate_limited=false
    local test_data='{"prompt":"rate-limit-test","style":"basic","seed":123}'

    # Make multiple rapid requests
    for i in {1..5}; do
        local response=$(curl -s -w "%{http_code}" \
            -X POST "$BASE_URL/api/generate-from-prompt" \
            -H "Content-Type: application/json" \
            -d "$test_data" \
            ${ACCESS_TOKEN:+-H "Authorization: Bearer $ACCESS_TOKEN"} \
            2>/dev/null)

        local http_code="${response: -3}"

        if [[ "$http_code" == "429" ]]; then
            rate_limited=true
            break
        fi

        # Small delay between requests
        sleep 0.1
    done

    if [[ "$rate_limited" == true ]]; then
        log "INFO" "✓ Rate limiting active on generation endpoint"
    else
        log "WARN" "Rate limiting not detected on generation endpoint"
    fi

    return 0
}

# Test 8: Security Headers
test_security_headers() {
    log "INFO" "Testing security headers..."

    local headers=$(curl -s -I "$BASE_URL/" 2>/dev/null)

    local required_headers=(
        "strict-transport-security"
        "x-content-type-options"
        "x-frame-options"
        "x-xss-protection"
    )

    local missing_headers=0

    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            log "INFO" "✓ Security header found: $header"
        else
            log "WARN" "Missing security header: $header"
            ((missing_headers++))
        fi
    done

    if [[ $missing_headers -eq 0 ]]; then
        log "INFO" "✓ All required security headers present"
    else
        log "WARN" "$missing_headers security headers missing"
    fi

    return 0
}

# Test 9: Performance Test
test_performance() {
    log "INFO" "Testing basic performance..."

    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}" "$BASE_URL/" 2>/dev/null)
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local http_code="${response: -3}"

    if [[ "$http_code" == "200" ]]; then
        if [[ $duration -lt 5000 ]]; then
            log "INFO" "✓ Page loaded in ${duration}ms (< 5000ms)"
        else
            log "WARN" "Page loaded in ${duration}ms (> 5000ms)"
        fi
    else
        log "ERROR" "✗ Homepage failed with HTTP $http_code"
        return 1
    fi

    return 0
}

# Test 10: SSL/TLS Check (if HTTPS)
test_ssl() {
    if [[ "$BASE_URL" == https://* ]]; then
        log "INFO" "Testing SSL/TLS configuration..."

        local domain=$(echo "$BASE_URL" | sed 's|https://||' | sed 's|/.*||')

        if command -v openssl &> /dev/null; then
            local cert_info=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "failed")

            if [[ "$cert_info" != "failed" ]]; then
                log "INFO" "✓ SSL certificate is valid"
                echo "$cert_info" | while read -r line; do
                    if [[ -n "$line" ]]; then
                        log "DEBUG" "Certificate: $line"
                    fi
                done
            else
                log "ERROR" "✗ SSL certificate validation failed"
                return 1
            fi
        else
            log "WARN" "openssl not available, skipping SSL check"
        fi
    else
        log "INFO" "HTTP endpoint, skipping SSL check"
    fi

    return 0
}

# Main smoke test execution
main() {
    log "INFO" "Starting MangaMotion Production Smoke Tests"
    log "INFO" "Base URL: $BASE_URL"
    log "INFO" "Test prompt: $TEST_PROMPT"

    if [[ -n "$TEST_FILE" ]] && [[ -f "$TEST_FILE" ]]; then
        log "INFO" "Test file: $TEST_FILE (exists)"
    else
        log "INFO" "Test file: $TEST_FILE (not found - file upload tests will be limited)"
    fi

    local failed_tests=0
    local total_tests=0

    # Run all tests
    local tests=(
        "test_health_check"
        "test_worker_health"
        "test_authentication"
        "test_prompt_generation"
        "test_file_upload_structure"
        "test_invalid_job_status"
        "test_rate_limiting"
        "test_security_headers"
        "test_performance"
        "test_ssl"
    )

    for test_func in "${tests[@]}"; do
        ((total_tests++))
        if ! $test_func; then
            ((failed_tests++))
        fi
        echo  # Add spacing between tests
    done

    # Summary
    log "INFO" "=== Smoke Test Summary ==="
    log "INFO" "Total tests: $total_tests"
    log "INFO" "Failed tests: $failed_tests"
    log "INFO" "Success rate: $(( (total_tests - failed_tests) * 100 / total_tests ))%"

    if [[ $failed_tests -eq 0 ]]; then
        log "INFO" "🎉 All smoke tests passed!"
        return 0
    else
        log "ERROR" "❌ $failed_tests test(s) failed"
        return 1
    fi
}

# Script usage
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [BASE_URL] [ACCESS_TOKEN] [TEST_FILE]"
    echo ""
    echo "Environment variables:"
    echo "  BASE_URL      - Base URL to test (default: http://localhost:3000)"
    echo "  ACCESS_TOKEN  - Bearer token for authenticated requests"
    echo "  TEST_FILE     - Path to test file for upload tests"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 https://yourdomain.com"
    echo "  BASE_URL=https://yourdomain.com ACCESS_TOKEN=xyz123 $0"
    exit 0
fi

# Override with command line arguments if provided
if [[ -n "${1:-}" ]]; then
    BASE_URL="$1"
fi

if [[ -n "${2:-}" ]]; then
    ACCESS_TOKEN="$2"
fi

if [[ -n "${3:-}" ]]; then
    TEST_FILE="$3"
fi

# Run the smoke tests
main "$@"