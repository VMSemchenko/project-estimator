#!/bin/bash
# ==============================================================================
# BA Work Estimation System - Master Test Runner
# ==============================================================================
# This script runs all e2e test phases in sequence.
# Usage: ./tests/run-all-tests.sh [phase_number]
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Test results tracking
TOTAL_PHASES=0
PASSED_PHASES=0
FAILED_PHASES=0

# Function to run a phase
run_phase() {
    local phase_num=$1
    local phase_script="$SCRIPT_DIR/e2e/phase${phase_num}*.test.sh"
    
    # Find matching script
    local found_script=$(ls $phase_script 2>/dev/null | head -1)
    
    if [ -z "$found_script" ]; then
        echo -e "${YELLOW}Phase $phase_num: No test script found${NC}"
        return 0
    fi
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Running Phase $phase_num${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    ((TOTAL_PHASES++))
    
    if bash "$found_script"; then
        echo -e "${GREEN}Phase $phase_num: PASSED${NC}"
        ((PASSED_PHASES++))
        return 0
    else
        echo -e "${RED}Phase $phase_num: FAILED${NC}"
        ((FAILED_PHASES++))
        return 1
    fi
}

# Main execution
echo -e "${BLUE}BA Work Estimation System - E2E Test Runner${NC}"
echo "Project root: $PROJECT_ROOT"
echo ""

# Check if specific phase requested
if [ -n "$1" ]; then
    run_phase "$1"
    exit $?
fi

# Run all phases
PHASES=(1 2 3 4 5 6 7 8 9 10 11)

for phase in "${PHASES[@]}"; do
    run_phase $phase || true  # Continue even if phase fails
done

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OVERALL SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Phases: ${TOTAL_PHASES}"
echo -e "Passed: ${GREEN}${PASSED_PHASES}${NC}"
echo -e "Failed: ${RED}${FAILED_PHASES}${NC}"
echo ""

if [ $FAILED_PHASES -eq 0 ]; then
    echo -e "${GREEN}All phases passed!${NC}"
    exit 0
else
    echo -e "${RED}Some phases failed.${NC}"
    exit 1
fi
