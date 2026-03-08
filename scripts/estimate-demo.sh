#!/bin/bash

# estimate-demo.sh - Run estimation via API call
# This script makes an API call to the estimator server instead of running node directly
# The server decides which project to estimate and which vector guidelines to use

set -e

# Default configuration
API_URL="${API_URL:-http://localhost:3000}"
PROJECT_FOLDER="${PROJECT_FOLDER:-apps/api/assets/samples/single-requirement}"
CATALOG_SET="${CATALOG_SET:-demo}"
VERBOSE="${VERBOSE:-true}"
POLL_INTERVAL="${POLL_INTERVAL:-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BA Work Estimator - Demo Estimation ===${NC}"
echo ""
echo "Configuration:"
echo "  API URL:       ${API_URL}"
echo "  Project:       ${PROJECT_FOLDER}"
echo "  Catalog Set:   ${CATALOG_SET}"
echo "  Verbose:       ${VERBOSE}"
echo ""

# Function to check if server is running
check_server() {
    echo -e "${YELLOW}Checking if server is running...${NC}"
    if curl -s --connect-timeout 5 "${API_URL}/estimate" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not running at ${API_URL}${NC}"
        echo ""
        echo "Please start the server first:"
        echo "  npm run start:dev"
        echo ""
        echo "Or set a different API_URL:"
        echo "  API_URL=http://your-server:port ./scripts/estimate-demo.sh"
        return 1
    fi
}

# Function to poll for estimation completion
poll_estimation() {
    local estimation_id="$1"
    local status=""
    
    echo -e "${YELLOW}Waiting for estimation to complete...${NC}"
    
    while true; do
        response=$(curl -s "${API_URL}/estimate/${estimation_id}")
        status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        case "$status" in
            "completed")
                echo -e "${GREEN}✓ Estimation completed!${NC}"
                echo ""
                return 0
                ;;
            "failed")
                echo -e "${RED}✗ Estimation failed${NC}"
                echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
                return 1
                ;;
            "pending"|"processing")
                printf "."
                sleep "$POLL_INTERVAL"
                ;;
            *)
                echo -e "${YELLOW}Unknown status: ${status}${NC}"
                sleep "$POLL_INTERVAL"
                ;;
        esac
    done
}

# Function to display results
display_results() {
    local estimation_id="$1"
    
    echo -e "${BLUE}=== Estimation Results ===${NC}"
    echo ""
    
    # Get full estimation details
    response=$(curl -s "${API_URL}/estimate/${estimation_id}")
    
    # Display summary if available
    summary=$(echo "$response" | grep -o '"summary":[^}]*}' | head -1)
    if [ -n "$summary" ]; then
        echo -e "${GREEN}Summary:${NC}"
        echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'summary' in data:
    s = data['summary']
    print(f\"  Total Tasks: {s.get('totalTasks', 'N/A')}\")
    print(f\"  Total Hours: {s.get('totalHours', 'N/A')}\")
    print(f\"  Confidence:  {s.get('confidence', 'N/A')}\")
" 2>/dev/null || echo "$summary"
        echo ""
    fi
    
    # Get report
    echo -e "${GREEN}Fetching detailed report...${NC}"
    report_response=$(curl -s "${API_URL}/estimate/${estimation_id}/report")
    
    # Display report location
    echo "$report_response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'report' in data:
    print('Report:')
    print(data['report'][:500] + '...' if len(data.get('report', '')) > 500 else data.get('report', ''))
if 'csv' in data:
    print('\\nCSV Breakdown:')
    print(data['csv'][:500] + '...' if len(data.get('csv', '')) > 500 else data.get('csv', ''))
" 2>/dev/null || echo "$report_response"
}

# Main execution
main() {
    # Check server availability
    if ! check_server; then
        exit 1
    fi
    
    echo -e "${YELLOW}Starting estimation...${NC}"
    
    # Create estimation request
    request_body=$(cat <<EOF
{
    "inputFolder": "${PROJECT_FOLDER}",
    "catalogSet": "${CATALOG_SET}",
    "verbose": ${VERBOSE}
}
EOF
)
    
    # Make API call
    response=$(curl -s -X POST "${API_URL}/estimate" \
        -H "Content-Type: application/json" \
        -d "$request_body")
    
    # Extract estimation ID
    estimation_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$estimation_id" ]; then
        echo -e "${RED}✗ Failed to create estimation${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Estimation created: ${estimation_id}${NC}"
    echo ""
    
    # Poll for completion
    if poll_estimation "$estimation_id"; then
        display_results "$estimation_id"
    else
        exit 1
    fi
}

# Run main function
main "$@"
