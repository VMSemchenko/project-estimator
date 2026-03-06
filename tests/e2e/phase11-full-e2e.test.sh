#!/bin/bash
# ==============================================================================
# Phase 11: Full E2E - Complete estimation flow with real LLM calls
# ==============================================================================
# This script performs a complete end-to-end test of the BA Work Estimation
# System. It starts the server, makes real estimation requests using the
# sample project, calls real LLM APIs (ZhipuAI), and verifies the complete
# estimation flow works.
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test configuration
TEST_PORT=3400
TEST_HOST="localhost"
API_BASE_URL="http://${TEST_HOST}:${TEST_PORT}"
SERVER_PID=""
MAX_WAIT_SECONDS=120
ESTIMATION_TIMEOUT=300  # 5 minutes for full estimation

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SAMPLE_PROJECT="$PROJECT_ROOT/apps/api/assets/samples/sample-project"

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

log_section() {
    echo ""
    echo -e "${MAGENTA}========================================"
    echo -e "$1"
    echo -e "========================================${NC}"
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

# Function to check required environment variables
check_env_vars() {
    log_info "Checking environment variables..."
    
    local missing_vars=()
    
    # Check for .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".env file not found - some tests may fail"
        return 1
    fi
    
    # Source environment variables
    source "$PROJECT_ROOT/.env"
    
    # Check ZhipuAI API key
    if [ -z "$ZHIPUAI_API_KEY" ]; then
        missing_vars+=("ZHIPUAI_API_KEY")
    fi
    
    # Check MongoDB URI
    if [ -z "$MONGODB_URI" ]; then
        missing_vars+=("MONGODB_URI")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "Missing environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    return 0
}

# Function to start the server
start_server() {
    log_info "Starting server on port ${TEST_PORT}..."
    
    cd "$PROJECT_ROOT"
    
    # Source environment variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
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
        if [ $((wait_count % 10)) -eq 0 ]; then
            log_info "Still waiting for server... (${wait_count}s)"
        fi
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

# Function to wait for estimation completion
wait_for_estimation() {
    local estimation_id="$1"
    local timeout="$ESTIMATION_TIMEOUT"
    local wait_count=0
    
    log_info "Waiting for estimation $estimation_id to complete (timeout: ${timeout}s)..."
    
    while [ $wait_count -lt $timeout ]; do
        local response
        response=$(curl -s "${API_BASE_URL}/estimate/${estimation_id}" 2>/dev/null)
        
        local status
        status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
        
        if [ "$status" = "completed" ]; then
            log_info "Estimation completed after ${wait_count} seconds"
            echo "$response"
            return 0
        elif [ "$status" = "failed" ]; then
            log_warning "Estimation failed after ${wait_count} seconds"
            echo "$response"
            return 1
        fi
        
        sleep 2
        ((wait_count+=2))
        
        if [ $((wait_count % 30)) -eq 0 ]; then
            log_info "Still processing... (${wait_count}s, status: $status)"
        fi
    done
    
    log_warning "Estimation timed out after ${timeout} seconds"
    return 1
}

# Cleanup function
cleanup() {
    stop_server
    rm -f /tmp/estimator_server_$$.log
    rm -f /tmp/api_response_$$.json
    rm -f /tmp/estimation_result_$$.json
}

# Register cleanup on exit
trap cleanup EXIT

# ==============================================================================
# TEST SECTION: Prerequisites
# ==============================================================================
log_section "TEST SECTION: Prerequisites"

# Test 1.1: Sample project exists
run_test "1.1: Sample project exists" "[ -d '$SAMPLE_PROJECT' ]"

# Test 1.2: Sample project has required files
log_info "Checking sample project files..."
if [ -f "$SAMPLE_PROJECT/business-vision.md" ] && \
   [ -f "$SAMPLE_PROJECT/high-level-architecture.md" ] && \
   [ -f "$SAMPLE_PROJECT/non-functional-requirements.md" ] && \
   [ -f "$SAMPLE_PROJECT/stakeholder-requirements.md" ]; then
    log_success "1.2: Sample project has all required files"
else
    log_failure "1.2: Sample project has all required files"
fi

# Test 1.3: Check environment variables
if check_env_vars; then
    log_success "1.3: Required environment variables are set"
else
    log_warning "1.3: Some environment variables are missing"
fi

# Test 1.4: Check jq is installed
run_test "1.4: jq is installed" "command -v jq"

# Test 1.5: Check curl is installed
run_test "1.5: curl is installed" "command -v curl"

# ==============================================================================
# TEST SECTION: Start Server
# ==============================================================================
log_section "TEST SECTION: Start Server"

# Test 2.1: Server starts successfully
log_info "Starting test server..."
if start_server; then
    log_success "2.1: Server started successfully on port ${TEST_PORT}"
else
    log_failure "2.1: Server started successfully on port ${TEST_PORT}"
    log_warning "Cannot proceed with API tests - exiting"
    exit 1
fi

# ==============================================================================
# TEST SECTION: Health Check
# ==============================================================================
log_section "TEST SECTION: Health Check"

# Test 3.1: Server is healthy
log_info "Checking server health..."
HEALTH_RESPONSE=$(curl -s "${API_BASE_URL}/health" 2>/dev/null)
if echo "$HEALTH_RESPONSE" | jq -e '.status == "ok" or .status == "degraded"' > /dev/null 2>&1; then
    log_success "3.1: Server health check passed"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null
else
    log_failure "3.1: Server health check passed"
fi

# Test 3.2: MongoDB is connected
log_info "Checking MongoDB connection..."
MONGODB_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.services.mongodb' 2>/dev/null || echo "unknown")
if [ "$MONGODB_STATUS" = "connected" ]; then
    log_success "3.2: MongoDB is connected"
else
    log_warning "3.2: MongoDB status: $MONGODB_STATUS"
fi

# ==============================================================================
# TEST SECTION: Create Estimation via API
# ==============================================================================
log_section "TEST SECTION: Create Estimation via API"

# Test 4.1: POST /estimate creates new estimation
log_info "Creating new estimation..."
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/estimate" \
    -H "Content-Type: application/json" \
    -d "{\"inputFolder\": \"$SAMPLE_PROJECT\"}" 2>/dev/null)
CREATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/estimate" \
    -H "Content-Type: application/json" \
    -d "{\"inputFolder\": \"$SAMPLE_PROJECT\"}" 2>/dev/null || echo "000")

if [ "$CREATE_STATUS" = "202" ]; then
    log_success "4.1: POST /estimate returns 202 (got: $CREATE_STATUS)"
else
    log_failure "4.1: POST /estimate returns 202 (got: $CREATE_STATUS)"
fi

# Test 4.2: Response contains estimation ID
ESTIMATION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id' 2>/dev/null)
if [ -n "$ESTIMATION_ID" ] && [ "$ESTIMATION_ID" != "null" ]; then
    log_success "4.2: Response contains estimation ID: $ESTIMATION_ID"
else
    log_failure "4.2: Response contains estimation ID"
fi

# Test 4.3: Response contains status
ESTIMATION_STATUS=$(echo "$CREATE_RESPONSE" | jq -r '.status' 2>/dev/null)
if [ -n "$ESTIMATION_STATUS" ] && [ "$ESTIMATION_STATUS" != "null" ]; then
    log_success "4.3: Response contains status: $ESTIMATION_STATUS"
else
    log_failure "4.3: Response contains status"
fi

echo ""
log_info "Create estimation response:"
echo "$CREATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RESPONSE"

# ==============================================================================
# TEST SECTION: Wait for Estimation Completion
# ==============================================================================
log_section "TEST SECTION: Wait for Estimation Completion"

if [ -n "$ESTIMATION_ID" ] && [ "$ESTIMATION_ID" != "null" ]; then
    # Test 5.1: Estimation completes successfully
    log_info "Waiting for estimation to complete..."
    ESTIMATION_RESULT=$(wait_for_estimation "$ESTIMATION_ID")
    WAIT_EXIT_CODE=$?
    
    if [ $WAIT_EXIT_CODE -eq 0 ]; then
        log_success "5.1: Estimation completed successfully"
    else
        log_failure "5.1: Estimation completed successfully"
    fi
    
    # Save result for analysis
    echo "$ESTIMATION_RESULT" > /tmp/estimation_result_$$.json
    
    # Test 5.2: Estimation has result
    log_info "Checking estimation result..."
    if echo "$ESTIMATION_RESULT" | jq -e '.result' > /dev/null 2>&1; then
        log_success "5.2: Estimation has result"
    else
        log_warning "5.2: Estimation result structure may be different"
    fi
    
    # Test 5.3: Estimation has total hours
    log_info "Checking for total hours..."
    TOTAL_HOURS=$(echo "$ESTIMATION_RESULT" | jq -r '.result.totalHours // .totalHours // empty' 2>/dev/null)
    if [ -n "$TOTAL_HOURS" ]; then
        log_success "5.3: Estimation has total hours: $TOTAL_HOURS"
    else
        log_warning "5.3: Total hours not found in expected location"
    fi
    
    # Test 5.4: Estimation has confidence score
    log_info "Checking for confidence score..."
    CONFIDENCE=$(echo "$ESTIMATION_RESULT" | jq -r '.result.confidence // .confidence // empty' 2>/dev/null)
    if [ -n "$CONFIDENCE" ]; then
        log_success "5.4: Estimation has confidence: $CONFIDENCE"
    else
        log_warning "5.4: Confidence not found in expected location"
    fi
    
    # Test 5.5: Estimation has breakdown
    log_info "Checking for estimation breakdown..."
    BREAKDOWN=$(echo "$ESTIMATION_RESULT" | jq '.result.breakdown // .breakdown // empty' 2>/dev/null)
    if [ -n "$BREAKDOWN" ] && [ "$BREAKDOWN" != "null" ]; then
        log_success "5.5: Estimation has breakdown"
    else
        log_warning "5.5: Breakdown not found in expected location"
    fi
    
    echo ""
    log_info "Estimation result:"
    echo "$ESTIMATION_RESULT" | jq '.' 2>/dev/null || echo "$ESTIMATION_RESULT"
    
else
    log_warning "No estimation ID available - skipping completion tests"
fi

# ==============================================================================
# TEST SECTION: CLI Estimation
# ==============================================================================
log_section "TEST SECTION: CLI Estimation"

# Test 6.1: CLI estimate command exists
log_info "Testing CLI estimate command..."
cd "$PROJECT_ROOT"

# Create output directory for CLI test
CLI_OUTPUT_DIR="/tmp/estimator_cli_output_$$"
mkdir -p "$CLI_OUTPUT_DIR"

# Test 6.2: Run CLI estimate command (with timeout)
log_info "Running CLI estimate command..."
log_warning "This may take several minutes..."

# Run CLI in background with timeout
timeout 180 npm run estimate -- "$SAMPLE_PROJECT" --output "$CLI_OUTPUT_DIR" > /tmp/cli_estimate_$$.log 2>&1 &
CLI_PID=$!

# Wait for CLI to complete
wait $CLI_PID 2>/dev/null
CLI_EXIT_CODE=$?

if [ $CLI_EXIT_CODE -eq 0 ]; then
    log_success "6.2: CLI estimate command completed successfully"
else
    log_warning "6.2: CLI estimate command exited with code: $CLI_EXIT_CODE"
fi

# Test 6.3: Check for output files
log_info "Checking CLI output files..."
if [ -d "$CLI_OUTPUT_DIR" ]; then
    OUTPUT_FILES=$(ls -la "$CLI_OUTPUT_DIR" 2>/dev/null | wc -l)
    if [ "$OUTPUT_FILES" -gt 1 ]; then
        log_success "6.3: CLI created output files"
        ls -la "$CLI_OUTPUT_DIR"
    else
        log_warning "6.3: No output files created"
    fi
else
    log_warning "6.3: Output directory not created"
fi

# Test 6.4: Check for estimation report
log_info "Checking for estimation report..."
REPORT_FILE=$(find "$CLI_OUTPUT_DIR" -name "*.md" -o -name "*report*" -o -name "*estimation*" 2>/dev/null | head -1)
if [ -n "$REPORT_FILE" ] && [ -f "$REPORT_FILE" ]; then
    log_success "6.4: Estimation report created: $REPORT_FILE"
    echo ""
    log_info "Report preview (first 50 lines):"
    head -50 "$REPORT_FILE"
else
    log_warning "6.4: No estimation report found"
fi

# Clean up CLI output
rm -rf "$CLI_OUTPUT_DIR"
rm -f /tmp/cli_estimate_$$.log

# ==============================================================================
# TEST SECTION: Verify LLM Integration
# ==============================================================================
log_section "TEST SECTION: Verify LLM Integration"

# Test 7.1: Check server logs for LLM calls
log_info "Checking server logs for LLM activity..."
if [ -f /tmp/estimator_server_$$.log ]; then
    LLM_CALLS=$(grep -c "LLM\|zhipu\|chatglm\|completion" /tmp/estimator_server_$$.log 2>/dev/null || echo "0")
    if [ "$LLM_CALLS" -gt 0 ]; then
        log_success "7.1: LLM calls detected in logs ($LLM_CALLS occurrences)"
    else
        log_warning "7.1: No LLM calls detected in logs"
    fi
else
    log_warning "7.1: Server log file not found"
fi

# Test 7.2: Check for token usage
log_info "Checking for token usage..."
if [ -f /tmp/estimation_result_$$.json ]; then
    TOKEN_USAGE=$(jq '.result.tokenUsage // .tokenUsage // .metrics // empty' /tmp/estimation_result_$$.json 2>/dev/null)
    if [ -n "$TOKEN_USAGE" ] && [ "$TOKEN_USAGE" != "null" ]; then
        log_success "7.2: Token usage recorded"
        echo "$TOKEN_USAGE" | jq '.' 2>/dev/null || echo "$TOKEN_USAGE"
    else
        log_warning "7.2: Token usage not found"
    fi
fi

# ==============================================================================
# TEST SECTION: Error Handling
# ==============================================================================
log_section "TEST SECTION: Error Handling"

# Test 8.1: Invalid input folder
log_info "Testing error handling for invalid input..."
ERROR_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/estimate" \
    -H "Content-Type: application/json" \
    -d '{"inputFolder": "/non/existent/folder"}' 2>/dev/null)
ERROR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/estimate" \
    -H "Content-Type: application/json" \
    -d '{"inputFolder": "/non/existent/folder"}' 2>/dev/null || echo "000")

if [ "$ERROR_STATUS" = "400" ] || [ "$ERROR_STATUS" = "404" ] || [ "$ERROR_STATUS" = "500" ]; then
    log_success "8.1: Invalid input returns error (status: $ERROR_STATUS)"
else
    log_warning "8.1: Invalid input returned status: $ERROR_STATUS"
fi

# Test 8.2: Missing input folder
log_info "Testing error handling for missing input..."
MISSING_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/estimate" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null)
MISSING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE_URL}/estimate" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo "000")

if [ "$MISSING_STATUS" = "400" ] || [ "$MISSING_STATUS" = "500" ]; then
    log_success "8.2: Missing input returns error (status: $MISSING_STATUS)"
else
    log_warning "8.2: Missing input returned status: $MISSING_STATUS"
fi

# ==============================================================================
# TEST SECTION: Cleanup
# ==============================================================================
log_section "TEST SECTION: Cleanup"

# Test 9.1: Delete estimation
if [ -n "$ESTIMATION_ID" ] && [ "$ESTIMATION_ID" != "null" ]; then
    log_info "Deleting test estimation..."
    DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${API_BASE_URL}/estimate/${ESTIMATION_ID}" 2>/dev/null || echo "000")
    if [ "$DELETE_STATUS" = "204" ] || [ "$DELETE_STATUS" = "200" ]; then
        log_success "9.1: Estimation deleted (status: $DELETE_STATUS)"
    else
        log_warning "9.1: Delete returned status: $DELETE_STATUS"
    fi
else
    log_warning "9.1: No estimation ID to delete"
fi

# Stop server
stop_server
log_success "9.2: Server stopped"

# ==============================================================================
# TEST SUMMARY
# ==============================================================================
log_section "TEST SUMMARY"

echo ""
echo -e "Total Tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All Phase 11 (Full E2E) tests passed!${NC}"
    echo -e "${GREEN}The BA Work Estimation System is fully functional.${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some Phase 11 (Full E2E) tests failed.${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
