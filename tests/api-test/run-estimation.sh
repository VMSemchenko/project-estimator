#!/bin/bash

# Estimator API Test Script
# This script runs estimations for different project types via the API

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3002}"
API_TIMEOUT="${API_TIMEOUT:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_msg() {
    echo -e "${2}${1}${NC}"
}

# Print header
print_header() {
    echo ""
    print_msg "========================================" "$BLUE"
    print_msg "$1" "$BLUE"
    print_msg "========================================" "$BLUE"
}

# Check if API is running
check_api_health() {
    print_header "Checking API Health"
    
    if curl -s --max-time "$API_TIMEOUT" "${API_BASE_URL}/" > /dev/null 2>&1; then
        print_msg "✓ API is running at ${API_BASE_URL}" "$GREEN"
        return 0
    else
        print_msg "✗ API is not responding at ${API_BASE_URL}" "$RED"
        print_msg "  Start the API with: npm run start:api" "$YELLOW"
        return 1
    fi
}

# Create estimation and get result
run_estimation() {
    local project_name="$1"
    local input_folder="$2"
    local output_folder="$3"
    
    print_header "Running Estimation: $project_name"
    
    # Create estimation request
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
    
    print_msg "Request Body:" "$YELLOW"
    echo "$request_body" | jq '.' 2>/dev/null || echo "$request_body"
    
    # Create estimation
    print_msg "\nCreating estimation..." "$YELLOW"
    local create_response
    create_response=$(curl -s --max-time "$API_TIMEOUT" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        "${API_BASE_URL}/estimate")
    
    print_msg "Create Response:" "$YELLOW"
    echo "$create_response" | jq '.' 2>/dev/null || echo "$create_response"
    
    # Extract job ID
    local job_id
    job_id=$(echo "$create_response" | jq -r '.id // .jobId // empty' 2>/dev/null)
    
    if [ -z "$job_id" ] || [ "$job_id" = "null" ]; then
        print_msg "✗ Failed to create estimation" "$RED"
        return 1
    fi
    
    print_msg "\n✓ Estimation created with ID: $job_id" "$GREEN"
    
    # Poll for result
    print_msg "\nPolling for result..." "$YELLOW"
    local max_attempts=60
    local attempt=0
    local status="pending"
    
    while [ "$status" = "pending" ] || [ "$status" = "processing" ]; do
        attempt=$((attempt + 1))
        
        if [ $attempt -gt $max_attempts ]; then
            print_msg "✗ Timeout waiting for estimation to complete" "$RED"
            return 1
        fi
        
        sleep 2
        
        local result
        result=$(curl -s --max-time "$API_TIMEOUT" "${API_BASE_URL}/estimate/${job_id}")
        status=$(echo "$result" | jq -r '.status // "unknown"' 2>/dev/null)
        
        print_msg "  Attempt $attempt/$max_attempts - Status: $status" "$BLUE"
    done
    
    # Get final result
    print_msg "\nFinal Result:" "$GREEN"
    local final_result
    final_result=$(curl -s --max-time "$API_TIMEOUT" "${API_BASE_URL}/estimate/${job_id}")
    echo "$final_result" | jq '.' 2>/dev/null || echo "$final_result"
    
    # Check if successful
    if [ "$status" = "completed" ]; then
        print_msg "\n✓ Estimation completed successfully!" "$GREEN"
        return 0
    else
        print_msg "\n✗ Estimation failed with status: $status" "$RED"
        return 1
    fi
}

# Get all estimations
get_all_estimations() {
    print_header "Getting All Estimations"
    
    local response
    response=$(curl -s --max-time "$API_TIMEOUT" "${API_BASE_URL}/estimate")
    
    print_msg "All Estimations:" "$YELLOW"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

# Delete estimation
delete_estimation() {
    local job_id="$1"
    
    print_msg "Deleting estimation: $job_id" "$YELLOW"
    
    curl -s --max-time "$API_TIMEOUT" -X DELETE "${API_BASE_URL}/estimate/${job_id}"
    
    print_msg "✓ Estimation deleted" "$GREEN"
}

# Main script
main() {
    local command="${1:-help}"
    
    case "$command" in
        health)
            check_api_health
            ;;
        sample-project)
            run_estimation "E-Commerce Platform (React/NestJS)" \
                "apps/api/assets/samples/sample-project" \
                "output/sample-project"
            ;;
        python-project)
            run_estimation "Task Management SaaS (Python/FastAPI)" \
                "apps/api/assets/samples/python-fastapi-project" \
                "output/python-fastapi-project"
            ;;
        java-project)
            run_estimation "Healthcare Portal (Java/Spring Boot)" \
                "apps/api/assets/samples/java-springboot-project" \
                "output/java-springboot-project"
            ;;
        go-project)
            run_estimation "Real-time Analytics (Go Microservices)" \
                "apps/api/assets/samples/go-microservices-project" \
                "output/go-microservices-project"
            ;;
        all)
            check_api_health || exit 1
            run_estimation "E-Commerce Platform (React/NestJS)" \
                "apps/api/assets/samples/sample-project" \
                "output/sample-project"
            run_estimation "Task Management SaaS (Python/FastAPI)" \
                "apps/api/assets/samples/python-fastapi-project" \
                "output/python-fastapi-project"
            run_estimation "Healthcare Portal (Java/Spring Boot)" \
                "apps/api/assets/samples/java-springboot-project" \
                "output/java-springboot-project"
            run_estimation "Real-time Analytics (Go Microservices)" \
                "apps/api/assets/samples/go-microservices-project" \
                "output/go-microservices-project"
            ;;
        list)
            get_all_estimations
            ;;
        delete)
            if [ -z "$2" ]; then
                print_msg "Usage: $0 delete <job-id>" "$RED"
                exit 1
            fi
            delete_estimation "$2"
            ;;
        custom)
            if [ -z "$2" ]; then
                print_msg "Usage: $0 custom <input-folder> [output-folder]" "$RED"
                exit 1
            fi
            run_estimation "Custom Project" "$2" "${3:-}"
            ;;
        help|*)
            echo "Estimator API Test Script"
            echo ""
            echo "Usage: $0 <command> [arguments]"
            echo ""
            echo "Commands:"
            echo "  health          Check if API is running"
            echo "  sample-project  Run estimation for E-Commerce Platform (React/NestJS)"
            echo "  python-project  Run estimation for Task Management SaaS (Python/FastAPI)"
            echo "  java-project    Run estimation for Healthcare Portal (Java/Spring Boot)"
            echo "  go-project      Run estimation for Real-time Analytics (Go Microservices)"
            echo "  all             Run estimations for all sample projects"
            echo "  list            Get all estimations"
            echo "  delete <id>     Delete an estimation by ID"
            echo "  custom <input>  Run estimation for custom input folder"
            echo "  help            Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  API_BASE_URL    API base URL (default: http://localhost:3000)"
            echo "  API_TIMEOUT     Request timeout in seconds (default: 30)"
            ;;
    esac
}

main "$@"
