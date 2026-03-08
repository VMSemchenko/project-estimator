#!/bin/bash

# Estimation Runner Script
# 
# This script:
# 1. Triggers estimation creation via POST /estimate
# 2. Polls for status via GET /estimate/:id
# 3. Reads and displays the final estimation when complete
#
# Usage:
#   ./scripts/run-estimation.sh <input-folder> [output-folder]
#
# Environment Variables:
#   API_BASE_URL   - API base URL (default: http://localhost:3000)
#   POLL_INTERVAL  - Polling interval in seconds (default: 2)
#   MAX_ATTEMPTS   - Max polling attempts (default: 60)

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
POLL_INTERVAL="${POLL_INTERVAL:-2}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print colored message
log() {
    echo -e "${2}${1}${NC}"
}

log_header() {
    echo ""
    log "==================================================" "$BLUE"
    log "  $1" "$BLUE"
    log "==================================================" "$BLUE"
}

# Check if required tools are available
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log "Error: curl is required but not installed." "$RED"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log "Warning: jq is not installed. JSON output will be raw." "$YELLOW"
        HAS_JQ=false
    else
        HAS_JQ=true
    fi
}

# Check if API is running
check_api_health() {
    log_header "Step 1: Check API Health"
    
    log "Checking API health..." "$YELLOW"
    
    if curl -s --max-time 5 "${API_BASE_URL}/" > /dev/null 2>&1; then
        log "✓ API is running at ${API_BASE_URL}" "$GREEN"
        return 0
    else
        log "✗ API is not responding at ${API_BASE_URL}" "$RED"
        log "  Start the API with: npm run start:api" "$YELLOW"
        return 1
    fi
}

# Create estimation and get job ID
create_estimation() {
    local input_folder="$1"
    local output_folder="$2"
    
    log_header "Step 2: Create Estimation"
    
    log "Input Folder: $input_folder" "$CYAN"
    if [ -n "$output_folder" ]; then
        log "Output Folder: $output_folder" "$CYAN"
    fi
    
    # Build request body
    local request_body
    if [ -n "$output_folder" ]; then
        request_body=$(cat <<EOF
{
    "inputFolder": "$input_folder",
    "outputFolder": "$output_folder",
    "verbose": true
}
EOF
)
    else
        request_body=$(cat <<EOF
{
    "inputFolder": "$input_folder",
    "verbose": true
}
EOF
)
    fi
    
    log "\nRequest Body:" "$YELLOW"
    if [ "$HAS_JQ" = true ]; then
        echo "$request_body" | jq '.'
    else
        echo "$request_body"
    fi
    
    log "\nCreating estimation..." "$YELLOW"
    
    local create_response
    create_response=$(curl -s --max-time 30 \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        "${API_BASE_URL}/estimate")
    
    log "Create Response:" "$YELLOW"
    if [ "$HAS_JQ" = true ]; then
        echo "$create_response" | jq '.'
    else
        echo "$create_response"
    fi
    
    # Extract job ID
    JOB_ID=$(echo "$create_response" | jq -r '.id // .jobId // empty' 2>/dev/null)
    
    if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
        log "✗ Failed to create estimation" "$RED"
        return 1
    fi
    
    log "\n✓ Estimation created with ID: $JOB_ID" "$GREEN"
    return 0
}

# Poll for completion
poll_for_completion() {
    log_header "Step 3: Poll for Completion"
    
    log "Poll interval: ${POLL_INTERVAL}s" "$CYAN"
    log "Max attempts: $MAX_ATTEMPTS" "$CYAN"
    log "\nPolling for completion..." "$YELLOW"
    
    local attempt=0
    local status="pending"
    local last_status=""
    
    while [ "$status" = "pending" ] || [ "$status" = "processing" ]; do
        attempt=$((attempt + 1))
        
        if [ $attempt -gt $MAX_ATTEMPTS ]; then
            log "\n✗ Timeout waiting for estimation to complete" "$RED"
            return 1
        fi
        
        sleep "$POLL_INTERVAL"
        
        local result
        result=$(curl -s --max-time 30 "${API_BASE_URL}/estimate/${JOB_ID}")
        status=$(echo "$result" | jq -r '.status // "unknown"' 2>/dev/null)
        
        # Only log if status changed
        if [ "$status" != "$last_status" ]; then
            log "  [${attempt}/${MAX_ATTEMPTS}] Status: $status" "$BLUE"
            last_status="$status"
        else
            echo -n "."
        fi
    done
    
    echo ""  # New line after dots
    
    # Store final result
    FINAL_RESULT="$result"
    FINAL_STATUS="$status"
    
    return 0
}

# Display the estimation result
display_result() {
    log_header "Step 4: Display Result"
    
    if [ "$HAS_JQ" = true ]; then
        # Extract and display summary
        local summary
        summary=$(echo "$FINAL_RESULT" | jq '.summary // empty' 2>/dev/null)
        
        if [ -n "$summary" ] && [ "$summary" != "null" ]; then
            log "\nSummary:" "$YELLOW"
            echo "$FINAL_RESULT" | jq '.summary'
        fi
        
        # Display artifacts info
        local artifacts
        artifacts=$(echo "$FINAL_RESULT" | jq '.artifacts // empty' 2>/dev/null)
        
        if [ -n "$artifacts" ] && [ "$artifacts" != "null" ]; then
            log "\nArtifacts available:" "$YELLOW"
            echo "$FINAL_RESULT" | jq '.artifacts | keys'
        fi
        
        # Display full result
        log "\nFull Result:" "$YELLOW"
        echo "$FINAL_RESULT" | jq '.'
    else
        log "\nFull Result:" "$YELLOW"
        echo "$FINAL_RESULT"
    fi
    
    # Fetch and display the report if completed
    if [ "$FINAL_STATUS" = "completed" ]; then
        log "\nFetching detailed report..." "$YELLOW"
        local report_response
        report_response=$(curl -s --max-time 30 "${API_BASE_URL}/estimate/${JOB_ID}/report" 2>/dev/null)
        
        if [ -n "$report_response" ]; then
            local report_content
            if [ "$HAS_JQ" = true ]; then
                report_content=$(echo "$report_response" | jq -r '.report // empty' 2>/dev/null)
            else
                report_content="$report_response"
            fi
            
            if [ -n "$report_content" ]; then
                log "\n========================================" "$GREEN"
                log "  ESTIMATION REPORT" "$GREEN"
                log "========================================" "$GREEN"
                echo ""
                echo "$report_content"
            fi
        fi
    fi
}

# Save result to file
save_result() {
    local output_folder="$1"
    
    if [ -z "$output_folder" ]; then
        return 0
    fi
    
    log_header "Step 5: Save Results"
    
    # Create output directory
    mkdir -p "$output_folder"
    
    # Save full result as JSON
    local json_file="${output_folder}/estimation-result.json"
    if [ "$HAS_JQ" = true ]; then
        echo "$FINAL_RESULT" | jq '.' > "$json_file"
    else
        echo "$FINAL_RESULT" > "$json_file"
    fi
    log "✓ Saved full result to: $json_file" "$GREEN"
    
    # Extract and save artifacts if available
    if [ "$HAS_JQ" = true ]; then
        # Save estimation report
        local report
        report=$(echo "$FINAL_RESULT" | jq -r '.artifacts.estimationReport // empty' 2>/dev/null)
        if [ -n "$report" ]; then
            echo "$report" > "${output_folder}/estimation-report.md"
            log "✓ Saved report to: ${output_folder}/estimation-report.md" "$GREEN"
        fi
        
        # Save detailed breakdown
        local breakdown
        breakdown=$(echo "$FINAL_RESULT" | jq -r '.artifacts.detailedBreakdown // empty' 2>/dev/null)
        if [ -n "$breakdown" ]; then
            echo "$breakdown" > "${output_folder}/detailed-breakdown.json"
            log "✓ Saved breakdown to: ${output_folder}/detailed-breakdown.json" "$GREEN"
        fi
        
        # Save risk assessment
        local risk
        risk=$(echo "$FINAL_RESULT" | jq -r '.artifacts.riskAssessment // empty' 2>/dev/null)
        if [ -n "$risk" ]; then
            echo "$risk" > "${output_folder}/risk-assessment.md"
            log "✓ Saved risk assessment to: ${output_folder}/risk-assessment.md" "$GREEN"
        fi
    fi
}

# Print usage
print_usage() {
    echo "Estimation Runner Script"
    echo ""
    echo "Usage: $0 <input-folder> [output-folder]"
    echo ""
    echo "Arguments:"
    echo "  input-folder   Path to the folder containing input documents (required)"
    echo "  output-folder  Path to save estimation results (optional)"
    echo ""
    echo "Environment Variables:"
    echo "  API_BASE_URL   API base URL (default: http://localhost:3000)"
    echo "  POLL_INTERVAL  Polling interval in seconds (default: 2)"
    echo "  MAX_ATTEMPTS   Max polling attempts (default: 60)"
    echo ""
    echo "Examples:"
    echo "  # Run estimation for sample project"
    echo "  $0 apps/api/assets/samples/sample-project"
    echo ""
    echo "  # Run with custom output folder"
    echo "  $0 apps/api/assets/samples/sample-project output/my-estimation"
    echo ""
    echo "  # Run with custom API URL"
    echo "  API_BASE_URL=http://localhost:8080 $0 ./my-docs"
}

# Main function
main() {
    # Check for help flag
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        print_usage
        exit 0
    fi
    
    # Check arguments
    if [ -z "$1" ]; then
        log "Error: input-folder is required" "$RED"
        echo ""
        print_usage
        exit 1
    fi
    
    local input_folder="$1"
    local output_folder="$2"
    
    # Check dependencies
    check_dependencies
    
    # Run estimation flow
    check_api_health || exit 1
    create_estimation "$input_folder" "$output_folder" || exit 1
    poll_for_completion || exit 1
    display_result
    save_result "$output_folder"
    
    # Final status
    echo ""
    if [ "$FINAL_STATUS" = "completed" ]; then
        log "✓ Estimation completed successfully!" "$GREEN"
        exit 0
    else
        log "✗ Estimation failed with status: $FINAL_STATUS" "$RED"
        exit 1
    fi
}

# Run main
main "$@"
