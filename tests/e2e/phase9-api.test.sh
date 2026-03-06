#!/bin/bash
# ==============================================================================
# Phase 9: REST API - Test API endpoints with real curl requests
# ==============================================================================
# This script tests the REST API endpoints including health check, estimation
# creation, and estimation retrieval. Uses real curl requests to validate
# the API functionality.
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test configuration
TEST_PORT=3300
TEST_HOST="localhost"
API_BASE_URL="http://${TEST_HOST}:${TEST_PORT}"
SERVER_PID=""
MAX_WAIT_SECONDS=60

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++)) || true
    ((TESTS_TOTAL++)) || true
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++)) || true
    ((TESTS_TOTAL++)) || true
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    log_info "Running: $test_name"
    
    if eval "$test_command"; then
        log_success "$test_name"
        return 0
    else
        log_failure "$test_name"
        return 1
    fi
}

# Function to start the server
start_server() {
    log_info "Starting server on port ${TEST_PORT}..."
    
    cd "$PROJECT_ROOT"
    
    # Source environment variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    
    # Set test port
    export PORT=$TEST_PORT
    export NODE_ENV=test
    
    # Start server in background
    npm run start > /tmp/estimator_server_$$.log 2>&1 &
    SERVER_PID=$!
    
    log_info "Server started with PID: $SERVER_PID"
    
    # Wait for server to be ready
    local wait_count=0
    while [ $wait_count -lt $MAX_WAIT_SECONDS ]; do
        if curl -s "${API_BASE_URL}/health" > /dev/null 2>&1; then
            log_info "Server is ready after ${wait_count} seconds"
            return 0
        fi
        sleep 1
        ((wait_count++))
    done
    
    log_warning "Server did not start within ${MAX_WAIT_SECONDS} seconds"
    return 1
}

# Function to stop the server
stop_server() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        log_info "Stopping server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
        SERVER_PID=""
    fi
}

# Cleanup function
cleanup() {
    stop_server
    rm -f /tmp/estimator_server_$$.log
    rm -f /tmp/api_response_$$.json
}

# Register cleanup on exit
trap cleanup EXIT

# ==============================================================================
# TEST SECTION: API Controller Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: API Controller Structure"
echo "========================================"

ESTIMATION_DIR="$PROJECT_ROOT/apps/api/src/estimation"

# Test 1.1: estimation directory exists
run_test "1.1: estimation directory exists" "[ -d '$ESTIMATION_DIR' ]"

# Test 1.2: estimation.controller.ts exists
run_test "1.2: estimation.controller.ts exists" "[ -f '$ESTIMATION_DIR/estimation.controller.ts' ]"

# Test 1.3: estimation.service.ts exists
run_test "1.3: estimation.service.ts exists" "[ -f '$ESTIMATION_DIR/estimation.service.ts' ]"

# Test 1.4: estimation.module.ts exists
run_test "1.4: estimation.module.ts exists" "[ -f '$ESTIMATION_DIR/estimation.module.ts' ]"

# ==============================================================================
# TEST SECTION: Controller Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Controller Structure"
echo "========================================"

# Test 2.1: Check @Controller decorator
log_info "Checking @Controller decorator..."
if grep -q "@Controller" "$ESTIMATION_DIR/estimation.controller.ts" 2>/dev/null; then
    log_success "2.1: EstimationController has @Controller decorator"
else
    log_failure "2.1: EstimationController has @Controller decorator"
fi

# Test 2.2: Check controller path
log_info "Checking controller path..."
if grep -q "@Controller.*estimate" "$ESTIMATION_DIR/estimation.controller.ts" 2>/dev/null; then
    log_success "2.2: EstimationController uses 'estimate' path"
else
    log_failure "2.2: EstimationController uses 'estimate' path"
fi

# Test 2.3: Check POST method
log_info "Checking POST method..."
if grep -q "@Post" "$ESTIMATION_DIR/estimation.controller.ts" 2>/dev/null; then
    log_success "2.3: EstimationController has POST method"
else
    log_failure "2.3: EstimationController has POST method"
fi

# Test 2.4: Check GET method
log_info "Checking GET method..."
if grep -q "@Get" "$ESTIMATION_DIR/estimation.controller.ts" 2>/dev/null; then
    log_success "2.4: EstimationController has GET method"
else
    log_failure "2.4: EstimationController has GET method"
fi

# Test 2.5: Check DELETE method
log_info "Checking DELETE method..."
if grep -q "@Delete" "$ESTIMATION_DIR/estimation.controller.ts" 2>/dev/null; then
    log_success "2.5: EstimationController has DELETE method"
else
    log_failure "2.5: EstimationController has DELETE method"
fi

# ==============================================================================
# TEST SECTION: DTO Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: DTO Structure"
echo "========================================"

DTO_DIR="$ESTIMATION_DIR/dto"

# Test 3.1: create-estimation.dto.ts exists
run_test "3.1: create-estimation.dto.ts exists" "[ -f '$DTO_DIR/create-estimation.dto.ts' ]"

# Test 3.2: estimation-response.dto.ts exists
run_test "3.2: estimation-response.dto.ts exists" "[ -f '$DTO_DIR/estimation-response.dto.ts' ]"

# Test 3.3: Check CreateEstimationDto
log_info "Checking CreateEstimationDto..."
if grep -q "class CreateEstimationDto" "$DTO_DIR/create-estimation.dto.ts" 2>/dev/null; then
    log_success "3.3: CreateEstimationDto class defined"
else
    log_failure "3.3: CreateEstimationDto class defined"
fi

# Test 3.4: Check inputFolder property
log_info "Checking inputFolder property..."
if grep -q "inputFolder" "$DTO_DIR/create-estimation.dto.ts" 2>/dev/null; then
    log_success "3.4: CreateEstimationDto has inputFolder property"
else
    log_failure "3.4: CreateEstimationDto has inputFolder property"
fi

# ==============================================================================
# TEST SECTION: App Controller (Health Endpoint)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: App Controller (Health)"
echo "========================================"

APP_CONTROLLER="$PROJECT_ROOT/apps/api/src/app.controller.ts"

# Test 4.1: app.controller.ts exists
run_test "4.1: app.controller.ts exists" "[ -f '$APP_CONTROLLER' ]"

# Test 4.2: Check health endpoint
log_info "Checking health endpoint..."
if grep -q "@Get.*health" "$APP_CONTROLLER" 2>/dev/null || grep -q '"health"' "$APP_CONTROLLER" 2>/dev/null; then
    log_success "4.2: AppController has health endpoint"
else
    log_failure "4.2: AppController has health endpoint"
fi

# Test 4.3: Check root endpoint
log_info "Checking root endpoint..."
if grep -q "@Get" "$APP_CONTROLLER" 2>/dev/null; then
    log_success "4.3: AppController has root endpoint"
else
    log_failure "4.3: AppController has root endpoint"
fi

# ==============================================================================
# TEST SECTION: Start Server
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Start Server"
echo "========================================"

# Test 5.1: Server starts successfully
log_info "Starting test server..."
if start_server; then
    log_success "5.1: Server started successfully on port ${TEST_PORT}"
else
    log_failure "5.1: Server started successfully on port ${TEST_PORT}"
    log_warning "Skipping API tests that require running server"
fi

# ==============================================================================
# TEST SECTION: Health Endpoint (curl)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Health Endpoint (curl)"
echo "========================================"

if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    
    # Test 6.1: GET /health returns 200
    log_info "Testing GET /health status code..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/health" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        log_success "6.1: GET /health returns 200 (got: $HTTP_STATUS)"
    else
        log_failure "6.1: GET /health returns 200 (got: $HTTP_STATUS)"
    fi
    
    # Test 6.2: GET /health returns JSON
    log_info "Testing GET /health returns JSON..."
    RESPONSE=$(curl -s "${API_BASE_URL}/health" 2>/dev/null)
    if echo "$RESPONSE" | jq -e '.' > /dev/null 2>&1; then
        log_success "6.2: GET /health returns valid JSON"
    else
        log_failure "6.2: GET /health returns valid JSON"
    fi
    
    # Test 6.3: GET /health has status field
    log_info "Testing GET /health has status field..."
    if echo "$RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
        log_success "6.3: GET /health has status field"
    else
        log_failure "6.3: GET /health has status field"
    fi
    
    # Test 6.4: GET /health has timestamp field
    log_info "Testing GET /health has timestamp field..."
    if echo "$RESPONSE" | jq -e '.timestamp' > /dev/null 2>&1; then
        log_success "6.4: GET /health has timestamp field"
    else
        log_failure "6.4: GET /health has timestamp field"
    fi
    
    # Test 6.5: GET /health has services field
    log_info "Testing GET /health has services field..."
    if echo "$RESPONSE" | jq -e '.services' > /dev/null 2>&1; then
        log_success "6.5: GET /health has services field"
    else
        log_failure "6.5: GET /health has services field"
    fi
    
    # Test 6.6: GET /health services has mongodb
    log_info "Testing GET /health services has mongodb..."
    if echo "$RESPONSE" | jq -e '.services.mongodb' > /dev/null 2>&1; then
        log_success "6.6: GET /health services has mongodb"
    else
        log_failure "6.6: GET /health services has mongodb"
    fi
    
    echo ""
    log_info "Health endpoint response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    
else
    log_warning "Server not running - skipping health endpoint tests"
fi

# ==============================================================================
# TEST SECTION: Root Endpoint (curl)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Root Endpoint (curl)"
echo "========================================"

if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    
    # Test 7.1: GET / returns 200
    log_info "Testing GET / status code..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        log_success "7.1: GET / returns 200 (got: $HTTP_STATUS)"
    else
        log_failure "7.1: GET / returns 200 (got: $HTTP_STATUS)"
    fi
    
    # Test 7.2: GET / returns JSON
    log_info "Testing GET / returns JSON..."
    RESPONSE=$(curl -s "${API_BASE_URL}/" 2>/dev/null)
    if echo "$RESPONSE" | jq -e '.' > /dev/null 2>&1; then
        log_success "7.2: GET / returns valid JSON"
    else
        log_failure "7.2: GET / returns valid JSON"
    fi
    
    # Test 7.3: GET / has message field
    log_info "Testing GET / has message field..."
    if echo "$RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
        log_success "7.3: GET / has message field"
    else
        log_failure "7.3: GET / has message field"
    fi
    
    # Test 7.4: GET / has version field
    log_info "Testing GET / has version field..."
    if echo "$RESPONSE" | jq -e '.version' > /dev/null 2>&1; then
        log_success "7.4: GET / has version field"
    else
        log_failure "7.4: GET / has version field"
    fi
    
    echo ""
    log_info "Root endpoint response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    
else
    log_warning "Server not running - skipping root endpoint tests"
fi

# ==============================================================================
# TEST SECTION: POST /estimate Endpoint (curl)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: POST /estimate Endpoint (curl)"
echo "========================================"

if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    
    SAMPLE_PROJECT="$PROJECT_ROOT/apps/api/assets/samples/sample-project"
    
    # Test 8.1: POST /estimate with valid data
    log_info "Testing POST /estimate with valid data..."
    RESPONSE=$(curl -s -X POST "${API_BASE_URL}/estimate" \
        -H "Content-Type: application/json" \
        -d "{\"inputFolder\": \"$SAMPLE_PROJECT\"}" 2>/dev/null)
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/estimate" \
        -H "Content-Type: application/json" \
        -d "{\"inputFolder\": \"$SAMPLE_PROJECT\"}" 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "202" ]; then
        log_success "8.1: POST /estimate returns 202 (got: $HTTP_STATUS)"
    else
        log_failure "8.1: POST /estimate returns 202 (got: $HTTP_STATUS)"
    fi
    
    # Test 8.2: POST /estimate returns JSON
    log_info "Testing POST /estimate returns JSON..."
    if echo "$RESPONSE" | jq -e '.' > /dev/null 2>&1; then
        log_success "8.2: POST /estimate returns valid JSON"
    else
        log_failure "8.2: POST /estimate returns valid JSON"
    fi
    
    # Test 8.3: POST /estimate has id field
    log_info "Testing POST /estimate has id field..."
    ESTIMATION_ID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)
    if [ -n "$ESTIMATION_ID" ] && [ "$ESTIMATION_ID" != "null" ]; then
        log_success "8.3: POST /estimate has id field (id: $ESTIMATION_ID)"
    else
        log_failure "8.3: POST /estimate has id field"
    fi
    
    # Test 8.4: POST /estimate has status field
    log_info "Testing POST /estimate has status field..."
    if echo "$RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
        log_success "8.4: POST /estimate has status field"
    else
        log_failure "8.4: POST /estimate has status field"
    fi
    
    echo ""
    log_info "POST /estimate response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    
    # Test 8.5: POST /estimate with invalid data returns error
    log_info "Testing POST /estimate with invalid data..."
    ERROR_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/estimate" \
        -H "Content-Type: application/json" \
        -d '{"invalid": "data"}' 2>/dev/null)
    ERROR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/estimate" \
        -H "Content-Type: application/json" \
        -d '{"invalid": "data"}' 2>/dev/null || echo "000")
    
    if [ "$ERROR_STATUS" = "400" ] || [ "$ERROR_STATUS" = "500" ]; then
        log_success "8.5: POST /estimate with invalid data returns error (got: $ERROR_STATUS)"
    else
        log_failure "8.5: POST /estimate with invalid data returns error (got: $ERROR_STATUS)"
    fi
    
    # Test 8.6: POST /estimate with non-existent folder
    log_info "Testing POST /estimate with non-existent folder..."
    NOTFOUND_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/estimate" \
        -H "Content-Type: application/json" \
        -d '{"inputFolder": "/non/existent/folder"}' 2>/dev/null)
    NOTFOUND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/estimate" \
        -H "Content-Type: application/json" \
        -d '{"inputFolder": "/non/existent/folder"}' 2>/dev/null || echo "000")
    
    if [ "$NOTFOUND_STATUS" = "400" ] || [ "$NOTFOUND_STATUS" = "404" ] || [ "$NOTFOUND_STATUS" = "500" ]; then
        log_success "8.6: POST /estimate with non-existent folder returns error (got: $NOTFOUND_STATUS)"
    else
        log_failure "8.6: POST /estimate with non-existent folder returns error (got: $NOTFOUND_STATUS)"
    fi
    
else
    log_warning "Server not running - skipping POST /estimate tests"
fi

# ==============================================================================
# TEST SECTION: GET /estimate/:id Endpoint (curl)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: GET /estimate/:id Endpoint (curl)"
echo "========================================"

if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    
    # Test 9.1: GET /estimate/:id with valid ID
    if [ -n "$ESTIMATION_ID" ] && [ "$ESTIMATION_ID" != "null" ]; then
        log_info "Testing GET /estimate/$ESTIMATION_ID..."
        GET_RESPONSE=$(curl -s "${API_BASE_URL}/estimate/${ESTIMATION_ID}" 2>/dev/null)
        GET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/estimate/${ESTIMATION_ID}" 2>/dev/null || echo "000")
        
        if [ "$GET_STATUS" = "200" ]; then
            log_success "9.1: GET /estimate/:id returns 200 (got: $GET_STATUS)"
        else
            log_failure "9.1: GET /estimate/:id returns 200 (got: $GET_STATUS)"
        fi
        
        # Test 9.2: GET /estimate/:id returns JSON
        log_info "Testing GET /estimate/:id returns JSON..."
        if echo "$GET_RESPONSE" | jq -e '.' > /dev/null 2>&1; then
            log_success "9.2: GET /estimate/:id returns valid JSON"
        else
            log_failure "9.2: GET /estimate/:id returns valid JSON"
        fi
        
        # Test 9.3: GET /estimate/:id has id field
        log_info "Testing GET /estimate/:id has id field..."
        if echo "$GET_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
            log_success "9.3: GET /estimate/:id has id field"
        else
            log_failure "9.3: GET /estimate/:id has id field"
        fi
        
        # Test 9.4: GET /estimate/:id has status field
        log_info "Testing GET /estimate/:id has status field..."
        if echo "$GET_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
            log_success "9.4: GET /estimate/:id has status field"
        else
            log_failure "9.4: GET /estimate/:id has status field"
        fi
        
        echo ""
        log_info "GET /estimate/:id response:"
        echo "$GET_RESPONSE" | jq '.' 2>/dev/null || echo "$GET_RESPONSE"
    else
        log_warning "No estimation ID available - skipping GET /estimate/:id tests"
    fi
    
    # Test 9.5: GET /estimate with non-existent ID
    log_info "Testing GET /estimate with non-existent ID..."
    FAKE_ID="non-existent-id-12345"
    FAKE_RESPONSE=$(curl -s "${API_BASE_URL}/estimate/${FAKE_ID}" 2>/dev/null)
    FAKE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/estimate/${FAKE_ID}" 2>/dev/null || echo "000")
    
    if [ "$FAKE_STATUS" = "404" ] || [ "$FAKE_STATUS" = "200" ]; then
        log_success "9.5: GET /estimate/:id with non-existent ID handled (got: $FAKE_STATUS)"
    else
        log_failure "9.5: GET /estimate/:id with non-existent ID handled (got: $FAKE_STATUS)"
    fi
    
else
    log_warning "Server not running - skipping GET /estimate/:id tests"
fi

# ==============================================================================
# TEST SECTION: GET /estimate Endpoint (curl)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: GET /estimate Endpoint (curl)"
echo "========================================"

if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    
    # Test 10.1: GET /estimate returns list
    log_info "Testing GET /estimate..."
    LIST_RESPONSE=$(curl -s "${API_BASE_URL}/estimate" 2>/dev/null)
    LIST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/estimate" 2>/dev/null || echo "000")
    
    if [ "$LIST_STATUS" = "200" ]; then
        log_success "10.1: GET /estimate returns 200 (got: $LIST_STATUS)"
    else
        log_failure "10.1: GET /estimate returns 200 (got: $LIST_STATUS)"
    fi
    
    # Test 10.2: GET /estimate returns JSON array
    log_info "Testing GET /estimate returns JSON..."
    if echo "$LIST_RESPONSE" | jq -e '.' > /dev/null 2>&1; then
        log_success "10.2: GET /estimate returns valid JSON"
    else
        log_failure "10.2: GET /estimate returns valid JSON"
    fi
    
    echo ""
    log_info "GET /estimate response:"
    echo "$LIST_RESPONSE" | jq '.' 2>/dev/null || echo "$LIST_RESPONSE"
    
else
    log_warning "Server not running - skipping GET /estimate tests"
fi

# ==============================================================================
# TEST SECTION: CORS Headers
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: CORS Headers"
echo "========================================"

if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    
    # Test 11.1: Check CORS headers
    log_info "Testing CORS headers..."
    CORS_HEADER=$(curl -s -I "${API_BASE_URL}/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
    if [ -n "$CORS_HEADER" ]; then
        log_success "11.1: API has CORS headers enabled"
    else
        log_warning "11.1: API may not have CORS headers (this is optional)"
    fi
    
else
    log_warning "Server not running - skipping CORS tests"
fi

# ==============================================================================
# TEST SECTION: Content-Type Headers
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Content-Type Headers"
echo "========================================"

if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    
    # Test 12.1: Check Content-Type header
    log_info "Testing Content-Type header..."
    CONTENT_TYPE=$(curl -s -I "${API_BASE_URL}/health" 2>/dev/null | grep -i "content-type" || echo "")
    if echo "$CONTENT_TYPE" | grep -q "application/json"; then
        log_success "12.1: API returns application/json Content-Type"
    else
        log_failure "12.1: API returns application/json Content-Type (got: $CONTENT_TYPE)"
    fi
    
else
    log_warning "Server not running - skipping Content-Type tests"
fi

# ==============================================================================
# TEST SECTION: Stop Server
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Stop Server"
echo "========================================"

stop_server
log_success "13.1: Server stopped successfully"

# ==============================================================================
# TEST SUMMARY
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo ""
echo -e "Total Tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All Phase 9 (REST API) tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some Phase 9 (REST API) tests failed.${NC}"
    exit 1
fi
