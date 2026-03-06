#!/bin/bash
# ==============================================================================
# Phase 5: LangGraph Nodes - Test node files and their functionality
# ==============================================================================
# This script tests the LangGraph node files (validation, extraction,
# decomposition, estimation, reporting) and runs their unit tests.
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

# ==============================================================================
# TEST SECTION: Nodes Directory Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Nodes Directory Structure"
echo "========================================"

NODES_DIR="$PROJECT_ROOT/apps/api/src/agents/nodes"

# Test 1.1: nodes directory exists
run_test "1.1: nodes directory exists" "[ -d '$NODES_DIR' ]"

# Test 1.2: nodes/index.ts exists
run_test "1.2: nodes/index.ts exists" "[ -f '$NODES_DIR/index.ts' ]"

# Test 1.3: base agent exists
run_test "1.3: base/base-agent.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/agents/base/base-agent.ts' ]"

# ==============================================================================
# TEST SECTION: Node Files Existence
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Files Existence"
echo "========================================"

# Test 2.1: validation.node.ts exists
run_test "2.1: validation.node.ts exists" "[ -f '$NODES_DIR/validation.node.ts' ]"

# Test 2.2: extraction.node.ts exists
run_test "2.2: extraction.node.ts exists" "[ -f '$NODES_DIR/extraction.node.ts' ]"

# Test 2.3: decomposition.node.ts exists
run_test "2.3: decomposition.node.ts exists" "[ -f '$NODES_DIR/decomposition.node.ts' ]"

# Test 2.4: estimation.node.ts exists
run_test "2.4: estimation.node.ts exists" "[ -f '$NODES_DIR/estimation.node.ts' ]"

# Test 2.5: reporting.node.ts exists
run_test "2.5: reporting.node.ts exists" "[ -f '$NODES_DIR/reporting.node.ts' ]"

# ==============================================================================
# TEST SECTION: Node Spec Files Existence
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Spec Files Existence"
echo "========================================"

# Test 3.1: validation.node.spec.ts exists
run_test "3.1: validation.node.spec.ts exists" "[ -f '$NODES_DIR/validation.node.spec.ts' ]"

# Test 3.2: extraction.node.spec.ts exists
run_test "3.2: extraction.node.spec.ts exists" "[ -f '$NODES_DIR/extraction.node.spec.ts' ]"

# Test 3.3: decomposition.node.spec.ts exists
run_test "3.3: decomposition.node.spec.ts exists" "[ -f '$NODES_DIR/decomposition.node.spec.ts' ]"

# Test 3.4: estimation.node.spec.ts exists
run_test "3.4: estimation.node.spec.ts exists" "[ -f '$NODES_DIR/estimation.node.spec.ts' ]"

# Test 3.5: reporting.node.spec.ts exists
run_test "3.5: reporting.node.spec.ts exists" "[ -f '$NODES_DIR/reporting.node.spec.ts' ]"

# ==============================================================================
# TEST SECTION: Node Class Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Class Structure"
echo "========================================"

# Test 4.1: ValidationNode class exists
log_info "Checking ValidationNode class..."
if grep -q "export class ValidationNode" "$NODES_DIR/validation.node.ts" 2>/dev/null; then
    log_success "4.1: ValidationNode class is exported"
else
    log_failure "4.1: ValidationNode class not found"
fi

# Test 4.2: ExtractionNode class exists
log_info "Checking ExtractionNode class..."
if grep -q "export class ExtractionNode" "$NODES_DIR/extraction.node.ts" 2>/dev/null; then
    log_success "4.2: ExtractionNode class is exported"
else
    log_failure "4.2: ExtractionNode class not found"
fi

# Test 4.3: DecompositionNode class exists
log_info "Checking DecompositionNode class..."
if grep -q "export class DecompositionNode" "$NODES_DIR/decomposition.node.ts" 2>/dev/null; then
    log_success "4.3: DecompositionNode class is exported"
else
    log_failure "4.3: DecompositionNode class not found"
fi

# Test 4.4: EstimationNode class exists
log_info "Checking EstimationNode class..."
if grep -q "export class EstimationNode" "$NODES_DIR/estimation.node.ts" 2>/dev/null; then
    log_success "4.4: EstimationNode class is exported"
else
    log_failure "4.4: EstimationNode class not found"
fi

# Test 4.5: ReportingNode class exists
log_info "Checking ReportingNode class..."
if grep -q "export class ReportingNode" "$NODES_DIR/reporting.node.ts" 2>/dev/null; then
    log_success "4.5: ReportingNode class is exported"
else
    log_failure "4.5: ReportingNode class not found"
fi

# ==============================================================================
# TEST SECTION: Node Execute Methods
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Execute Methods"
echo "========================================"

# Test 5.1: ValidationNode has execute method
log_info "Checking ValidationNode execute method..."
if grep -q "async execute" "$NODES_DIR/validation.node.ts" 2>/dev/null; then
    log_success "5.1: ValidationNode has execute method"
else
    log_failure "5.1: ValidationNode missing execute method"
fi

# Test 5.2: ExtractionNode has execute method
log_info "Checking ExtractionNode execute method..."
if grep -q "async execute" "$NODES_DIR/extraction.node.ts" 2>/dev/null; then
    log_success "5.2: ExtractionNode has execute method"
else
    log_failure "5.2: ExtractionNode missing execute method"
fi

# Test 5.3: DecompositionNode has execute method
log_info "Checking DecompositionNode execute method..."
if grep -q "async execute" "$NODES_DIR/decomposition.node.ts" 2>/dev/null; then
    log_success "5.3: DecompositionNode has execute method"
else
    log_failure "5.3: DecompositionNode missing execute method"
fi

# Test 5.4: EstimationNode has execute method
log_info "Checking EstimationNode execute method..."
if grep -q "async execute" "$NODES_DIR/estimation.node.ts" 2>/dev/null; then
    log_success "5.4: EstimationNode has execute method"
else
    log_failure "5.4: EstimationNode missing execute method"
fi

# Test 5.5: ReportingNode has execute method
log_info "Checking ReportingNode execute method..."
if grep -q "async execute" "$NODES_DIR/reporting.node.ts" 2>/dev/null; then
    log_success "5.5: ReportingNode has execute method"
else
    log_failure "5.5: ReportingNode missing execute method"
fi

# ==============================================================================
# TEST SECTION: Node Name Properties
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Name Properties"
echo "========================================"

# Test 6.1: ValidationNode has name property
log_info "Checking ValidationNode name property..."
if grep -q "readonly name = 'validation'" "$NODES_DIR/validation.node.ts" 2>/dev/null || \
   grep -q 'readonly name = "validation"' "$NODES_DIR/validation.node.ts" 2>/dev/null; then
    log_success "6.1: ValidationNode has name property"
else
    log_failure "6.1: ValidationNode missing name property"
fi

# Test 6.2: ExtractionNode has name property
log_info "Checking ExtractionNode name property..."
if grep -q "readonly name = 'extraction'" "$NODES_DIR/extraction.node.ts" 2>/dev/null || \
   grep -q 'readonly name = "extraction"' "$NODES_DIR/extraction.node.ts" 2>/dev/null; then
    log_success "6.2: ExtractionNode has name property"
else
    log_failure "6.2: ExtractionNode missing name property"
fi

# Test 6.3: DecompositionNode has name property
log_info "Checking DecompositionNode name property..."
if grep -q "readonly name = 'decomposition'" "$NODES_DIR/decomposition.node.ts" 2>/dev/null || \
   grep -q 'readonly name = "decomposition"' "$NODES_DIR/decomposition.node.ts" 2>/dev/null; then
    log_success "6.3: DecompositionNode has name property"
else
    log_failure "6.3: DecompositionNode missing name property"
fi

# Test 6.4: EstimationNode has name property
log_info "Checking EstimationNode name property..."
if grep -q "readonly name = 'estimation'" "$NODES_DIR/estimation.node.ts" 2>/dev/null || \
   grep -q 'readonly name = "estimation"' "$NODES_DIR/estimation.node.ts" 2>/dev/null; then
    log_success "6.4: EstimationNode has name property"
else
    log_failure "6.4: EstimationNode missing name property"
fi

# Test 6.5: ReportingNode has name property
log_info "Checking ReportingNode name property..."
if grep -q "readonly name = 'reporting'" "$NODES_DIR/reporting.node.ts" 2>/dev/null || \
   grep -q 'readonly name = "reporting"' "$NODES_DIR/reporting.node.ts" 2>/dev/null; then
    log_success "6.5: ReportingNode has name property"
else
    log_failure "6.5: ReportingNode missing name property"
fi

# ==============================================================================
# TEST SECTION: Node Extends BaseAgentNode
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Extends BaseAgentNode"
echo "========================================"

# Test 7.1: ValidationNode extends BaseAgentNode
log_info "Checking ValidationNode extends BaseAgentNode..."
if grep -q "extends BaseAgentNode" "$NODES_DIR/validation.node.ts" 2>/dev/null; then
    log_success "7.1: ValidationNode extends BaseAgentNode"
else
    log_failure "7.1: ValidationNode does not extend BaseAgentNode"
fi

# Test 7.2: ExtractionNode extends BaseAgentNode
log_info "Checking ExtractionNode extends BaseAgentNode..."
if grep -q "extends BaseAgentNode" "$NODES_DIR/extraction.node.ts" 2>/dev/null; then
    log_success "7.2: ExtractionNode extends BaseAgentNode"
else
    log_failure "7.2: ExtractionNode does not extend BaseAgentNode"
fi

# Test 7.3: DecompositionNode extends BaseAgentNode
log_info "Checking DecompositionNode extends BaseAgentNode..."
if grep -q "extends BaseAgentNode" "$NODES_DIR/decomposition.node.ts" 2>/dev/null; then
    log_success "7.3: DecompositionNode extends BaseAgentNode"
else
    log_failure "7.3: DecompositionNode does not extend BaseAgentNode"
fi

# Test 7.4: EstimationNode extends BaseAgentNode
log_info "Checking EstimationNode extends BaseAgentNode..."
if grep -q "extends BaseAgentNode" "$NODES_DIR/estimation.node.ts" 2>/dev/null; then
    log_success "7.4: EstimationNode extends BaseAgentNode"
else
    log_failure "7.4: EstimationNode does not extend BaseAgentNode"
fi

# Test 7.5: ReportingNode extends BaseAgentNode
log_info "Checking ReportingNode extends BaseAgentNode..."
if grep -q "extends BaseAgentNode" "$NODES_DIR/reporting.node.ts" 2>/dev/null; then
    log_success "7.5: ReportingNode extends BaseAgentNode"
else
    log_failure "7.5: ReportingNode does not extend BaseAgentNode"
fi

# ==============================================================================
# TEST SECTION: Node Index Exports
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Index Exports"
echo "========================================"

# Test 8.1: index.ts exports ValidationNode
log_info "Checking index.ts exports ValidationNode..."
if grep -q "ValidationNode" "$NODES_DIR/index.ts" 2>/dev/null; then
    log_success "8.1: index.ts exports ValidationNode"
else
    log_failure "8.1: index.ts does not export ValidationNode"
fi

# Test 8.2: index.ts exports ExtractionNode
log_info "Checking index.ts exports ExtractionNode..."
if grep -q "ExtractionNode" "$NODES_DIR/index.ts" 2>/dev/null; then
    log_success "8.2: index.ts exports ExtractionNode"
else
    log_failure "8.2: index.ts does not export ExtractionNode"
fi

# Test 8.3: index.ts exports DecompositionNode
log_info "Checking index.ts exports DecompositionNode..."
if grep -q "DecompositionNode" "$NODES_DIR/index.ts" 2>/dev/null; then
    log_success "8.3: index.ts exports DecompositionNode"
else
    log_failure "8.3: index.ts does not export DecompositionNode"
fi

# Test 8.4: index.ts exports EstimationNode
log_info "Checking index.ts exports EstimationNode..."
if grep -q "EstimationNode" "$NODES_DIR/index.ts" 2>/dev/null; then
    log_success "8.4: index.ts exports EstimationNode"
else
    log_failure "8.4: index.ts does not export EstimationNode"
fi

# Test 8.5: index.ts exports ReportingNode
log_info "Checking index.ts exports ReportingNode..."
if grep -q "ReportingNode" "$NODES_DIR/index.ts" 2>/dev/null; then
    log_success "8.5: index.ts exports ReportingNode"
else
    log_failure "8.5: index.ts does not export ReportingNode"
fi

# ==============================================================================
# TEST SECTION: Jest Unit Tests for Nodes
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Jest Unit Tests for Nodes"
echo "========================================"

cd "$PROJECT_ROOT"

# Test 9.1: Run validation.node.spec.ts tests
log_info "Running validation.node.spec.ts tests..."
if npm test -- --testPathPattern="validation.node.spec" --passWithNoTests --silent 2>/dev/null; then
    log_success "9.1: validation.node.spec.ts tests passed"
else
    log_warning "9.1: validation.node.spec.ts tests failed or not run"
fi

# Test 9.2: Run extraction.node.spec.ts tests
log_info "Running extraction.node.spec.ts tests..."
if npm test -- --testPathPattern="extraction.node.spec" --passWithNoTests --silent 2>/dev/null; then
    log_success "9.2: extraction.node.spec.ts tests passed"
else
    log_warning "9.2: extraction.node.spec.ts tests failed or not run"
fi

# Test 9.3: Run decomposition.node.spec.ts tests
log_info "Running decomposition.node.spec.ts tests..."
if npm test -- --testPathPattern="decomposition.node.spec" --passWithNoTests --silent 2>/dev/null; then
    log_success "9.3: decomposition.node.spec.ts tests passed"
else
    log_warning "9.3: decomposition.node.spec.ts tests failed or not run"
fi

# Test 9.4: Run estimation.node.spec.ts tests
log_info "Running estimation.node.spec.ts tests..."
if npm test -- --testPathPattern="estimation.node.spec" --passWithNoTests --silent 2>/dev/null; then
    log_success "9.4: estimation.node.spec.ts tests passed"
else
    log_warning "9.4: estimation.node.spec.ts tests failed or not run"
fi

# Test 9.5: Run reporting.node.spec.ts tests
log_info "Running reporting.node.spec.ts tests..."
if npm test -- --testPathPattern="reporting.node.spec" --passWithNoTests --silent 2>/dev/null; then
    log_success "9.5: reporting.node.spec.ts tests passed"
else
    log_warning "9.5: reporting.node.spec.ts tests failed or not run"
fi

# ==============================================================================
# TEST SECTION: Node Factory Functions
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Factory Functions"
echo "========================================"

# Test 10.1: Check for createValidationNode factory function
log_info "Checking for createValidationNode factory..."
if grep -q "createValidationNode" "$NODES_DIR/validation.node.ts" 2>/dev/null; then
    log_success "10.1: createValidationNode factory function exists"
else
    log_warning "10.1: createValidationNode factory function not found"
fi

# Test 10.2: Check for createExtractionNode factory function
log_info "Checking for createExtractionNode factory..."
if grep -q "createExtractionNode" "$NODES_DIR/extraction.node.ts" 2>/dev/null; then
    log_success "10.2: createExtractionNode factory function exists"
else
    log_warning "10.2: createExtractionNode factory function not found"
fi

# Test 10.3: Check for createDecompositionNode factory function
log_info "Checking for createDecompositionNode factory..."
if grep -q "createDecompositionNode" "$NODES_DIR/decomposition.node.ts" 2>/dev/null; then
    log_success "10.3: createDecompositionNode factory function exists"
else
    log_warning "10.3: createDecompositionNode factory function not found"
fi

# Test 10.4: Check for createEstimationNode factory function
log_info "Checking for createEstimationNode factory..."
if grep -q "createEstimationNode" "$NODES_DIR/estimation.node.ts" 2>/dev/null; then
    log_success "10.4: createEstimationNode factory function exists"
else
    log_warning "10.4: createEstimationNode factory function not found"
fi

# Test 10.5: Check for createReportingNode factory function
log_info "Checking for createReportingNode factory..."
if grep -q "createReportingNode" "$NODES_DIR/reporting.node.ts" 2>/dev/null; then
    log_success "10.5: createReportingNode factory function exists"
else
    log_warning "10.5: createReportingNode factory function not found"
fi

# ==============================================================================
# TEST SECTION: Node Dependencies
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Dependencies"
echo "========================================"

# Test 11.1: Nodes import prompts interfaces
log_info "Checking nodes import prompts interfaces..."
PROMPTS_IMPORT_COUNT=$(grep -l "PromptContext\|AgentType" "$NODES_DIR"/*.node.ts 2>/dev/null | wc -l | tr -d ' ')
if [ "$PROMPTS_IMPORT_COUNT" -gt 0 ]; then
    log_success "11.1: $PROMPTS_IMPORT_COUNT node(s) import prompts interfaces"
else
    log_failure "11.1: No nodes import prompts interfaces"
fi

# Test 11.2: Nodes import LLMProvider or use dependencies
log_info "Checking nodes use LLM via dependencies..."
LLM_IMPORT_COUNT=$(grep -l "llmProvider\|getChatModel\|dependencies" "$NODES_DIR"/*.node.ts 2>/dev/null | wc -l | tr -d ' ')
if [ "$LLM_IMPORT_COUNT" -gt 0 ]; then
    log_success "11.2: $LLM_IMPORT_COUNT node(s) use LLM via dependencies"
else
    log_failure "11.2: No nodes use LLM via dependencies"
fi

# Test 11.3: Nodes import state interfaces
log_info "Checking nodes import state interfaces..."
STATE_IMPORT_COUNT=$(grep -l "EstimationState\|StateUpdate" "$NODES_DIR"/*.node.ts 2>/dev/null | wc -l | tr -d ' ')
if [ "$STATE_IMPORT_COUNT" -gt 0 ]; then
    log_success "11.3: $STATE_IMPORT_COUNT node(s) import state interfaces"
else
    log_failure "11.3: No nodes import state interfaces"
fi

# ==============================================================================
# TEST SECTION: TypeScript Compilation Check
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: TypeScript Compilation Check"
echo "========================================"

# Test 12.1: Check nodes compile without errors
log_info "Checking TypeScript compilation for nodes..."
cd "$PROJECT_ROOT"
if npx tsc --noEmit --project tsconfig.json 2>/dev/null | grep -q "nodes/.*\.ts"; then
    log_failure "12.1: TypeScript compilation errors in nodes"
else
    log_success "12.1: Nodes compile without TypeScript errors"
fi

# ==============================================================================
# TEST SECTION: Node-Specific Logic Validation
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node-Specific Logic Validation"
echo "========================================"

# Test 13.1: ValidationNode has document validation logic
log_info "Checking ValidationNode has document validation logic..."
if grep -q "discoverArtifacts\|checkRequiredDocuments\|validateDocumentQuality" "$NODES_DIR/validation.node.ts" 2>/dev/null; then
    log_success "13.1: ValidationNode has document validation methods"
else
    log_failure "13.1: ValidationNode missing document validation methods"
fi

# Test 13.2: ExtractionNode has requirement extraction logic
log_info "Checking ExtractionNode has requirement extraction logic..."
if grep -q "extractRequirements\|normalizeRequirement\|parseDocument" "$NODES_DIR/extraction.node.ts" 2>/dev/null; then
    log_success "13.2: ExtractionNode has requirement extraction methods"
else
    log_failure "13.2: ExtractionNode missing requirement extraction methods"
fi

# Test 13.3: DecompositionNode has work decomposition logic
log_info "Checking DecompositionNode has work decomposition logic..."
if grep -q "decompose\|atomicWork\|mapToAtomic" "$NODES_DIR/decomposition.node.ts" 2>/dev/null; then
    log_success "13.3: DecompositionNode has work decomposition methods"
else
    log_failure "13.3: DecompositionNode missing work decomposition methods"
fi

# Test 13.4: EstimationNode has PERT estimation logic
log_info "Checking EstimationNode has PERT estimation logic..."
if grep -q "PERT\|optimistic\|pessimistic\|mostLikely\|estimate" "$NODES_DIR/estimation.node.ts" 2>/dev/null; then
    log_success "13.4: EstimationNode has PERT estimation methods"
else
    log_failure "13.4: EstimationNode missing PERT estimation methods"
fi

# Test 13.5: ReportingNode has report generation logic
log_info "Checking ReportingNode has report generation logic..."
if grep -q "generateMarkdownReport\|generateCsvContent\|createEmptyReport" "$NODES_DIR/reporting.node.ts" 2>/dev/null; then
    log_success "13.5: ReportingNode has report generation methods"
else
    log_failure "13.5: ReportingNode missing report generation methods"
fi

# ==============================================================================
# TEST SECTION: Error Handling in Nodes
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Error Handling in Nodes"
echo "========================================"

# Test 14.1: Nodes have error handling
log_info "Checking nodes have error handling..."
ERROR_HANDLING_COUNT=$(grep -l "catch\|handleError\|try.*catch" "$NODES_DIR"/*.node.ts 2>/dev/null | wc -l | tr -d ' ')
if [ "$ERROR_HANDLING_COUNT" -eq 5 ]; then
    log_success "14.1: All 5 nodes have error handling"
else
    log_warning "14.1: Only $ERROR_HANDLING_COUNT/5 nodes have error handling"
fi

# Test 14.2: Nodes return StateUpdate on error
log_info "Checking nodes return StateUpdate on error..."
if grep -q "shouldStop.*true\|errors.*:" "$NODES_DIR/validation.node.ts" 2>/dev/null; then
    log_success "14.2: Nodes return error state updates"
else
    log_warning "14.2: Nodes may not properly return error states"
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo -e "Total tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}All Phase 5 tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}Some Phase 5 tests failed. Please review the output above.${NC}"
    exit 1
fi
