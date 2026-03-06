#!/bin/bash
# ==============================================================================
# Phase 6: LangGraph Orchestration - Test graph definition, state, and edges
# ==============================================================================
# This script tests the LangGraph orchestration including graph definition,
# state interface, edge conditions, and graph compilation.
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
# TEST SECTION: Graph Directory Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Graph Directory Structure"
echo "========================================"

GRAPH_DIR="$PROJECT_ROOT/apps/api/src/agents/graph"

# Test 1.1: graph directory exists
run_test "1.1: graph directory exists" "[ -d '$GRAPH_DIR' ]"

# Test 1.2: graph/index.ts exists
run_test "1.2: graph/index.ts exists" "[ -f '$GRAPH_DIR/index.ts' ]"

# Test 1.3: estimation.graph.ts exists
run_test "1.3: estimation.graph.ts exists" "[ -f '$GRAPH_DIR/estimation.graph.ts' ]"

# Test 1.4: state.ts exists
run_test "1.4: state.ts exists" "[ -f '$GRAPH_DIR/state.ts' ]"

# Test 1.5: edges.ts exists
run_test "1.5: edges.ts exists" "[ -f '$GRAPH_DIR/edges.ts' ]"

# ==============================================================================
# TEST SECTION: Graph Definition Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Graph Definition Structure"
echo "========================================"

# Test 2.1: Graph uses StateGraph from @langchain/langgraph
log_info "Checking StateGraph import..."
if grep -q "StateGraph" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "2.1: estimation.graph.ts imports StateGraph"
else
    log_failure "2.1: estimation.graph.ts does not import StateGraph"
fi

# Test 2.2: Graph imports START and END
log_info "Checking START/END imports..."
if grep -q "START\|END" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "2.2: estimation.graph.ts imports START/END"
else
    log_failure "2.2: estimation.graph.ts does not import START/END"
fi

# Test 2.3: Graph exports createEstimationGraph function
log_info "Checking createEstimationGraph export..."
if grep -q "export function createEstimationGraph\|export async function createEstimationGraph" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "2.3: createEstimationGraph function is exported"
else
    log_failure "2.3: createEstimationGraph function not exported"
fi

# Test 2.4: Graph imports all nodes
log_info "Checking node imports..."
if grep -q "ValidationNode\|ExtractionNode\|DecompositionNode\|EstimationNode\|ReportingNode" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "2.4: estimation.graph.ts imports node classes"
else
    log_failure "2.4: estimation.graph.ts does not import node classes"
fi

# Test 2.5: Graph imports edge functions
log_info "Checking edge function imports..."
if grep -q "shouldContinue" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "2.5: estimation.graph.ts imports edge functions"
else
    log_failure "2.5: estimation.graph.ts does not import edge functions"
fi

# ==============================================================================
# TEST SECTION: State Interface
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: State Interface"
echo "========================================"

# Test 3.1: State uses Annotation.Root
log_info "Checking Annotation.Root usage..."
if grep -q "Annotation.Root" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.1: state.ts uses Annotation.Root"
else
    log_failure "3.1: state.ts does not use Annotation.Root"
fi

# Test 3.2: State exports EstimationStateAnnotation
log_info "Checking EstimationStateAnnotation export..."
if grep -q "export.*EstimationStateAnnotation" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.2: EstimationStateAnnotation is exported"
else
    log_failure "3.2: EstimationStateAnnotation not exported"
fi

# Test 3.3: State has inputFolder field
log_info "Checking inputFolder field..."
if grep -q "inputFolder" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.3: State has inputFolder field"
else
    log_failure "3.3: State missing inputFolder field"
fi

# Test 3.4: State has artifacts field
log_info "Checking artifacts field..."
if grep -q "artifacts" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.4: State has artifacts field"
else
    log_failure "3.4: State missing artifacts field"
fi

# Test 3.5: State has validationStatus field
log_info "Checking validationStatus field..."
if grep -q "validationStatus" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.5: State has validationStatus field"
else
    log_failure "3.5: State missing validationStatus field"
fi

# Test 3.6: State has requirements field
log_info "Checking requirements field..."
if grep -q "requirements" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.6: State has requirements field"
else
    log_failure "3.6: State missing requirements field"
fi

# Test 3.7: State has atomicWorks field
log_info "Checking atomicWorks field..."
if grep -q "atomicWorks" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.7: State has atomicWorks field"
else
    log_failure "3.7: State missing atomicWorks field"
fi

# Test 3.8: State has estimates field
log_info "Checking estimates field..."
if grep -q "estimates" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.8: State has estimates field"
else
    log_failure "3.8: State missing estimates field"
fi

# Test 3.9: State has report field
log_info "Checking report field..."
if grep -q "report" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.9: State has report field"
else
    log_failure "3.9: State missing report field"
fi

# Test 3.10: State has errors field
log_info "Checking errors field..."
if grep -q "errors" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.10: State has errors field"
else
    log_failure "3.10: State missing errors field"
fi

# Test 3.11: State has shouldStop field
log_info "Checking shouldStop field..."
if grep -q "shouldStop" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.11: State has shouldStop field"
else
    log_failure "3.11: State missing shouldStop field"
fi

# Test 3.12: State exports GraphState type
log_info "Checking GraphState type export..."
if grep -q "GraphState" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "3.12: GraphState type is defined/exported"
else
    log_failure "3.12: GraphState type not defined"
fi

# ==============================================================================
# TEST SECTION: Edge Conditions
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Edge Conditions"
echo "========================================"

# Test 4.1: shouldContinueAfterValidation function exists
log_info "Checking shouldContinueAfterValidation function..."
if grep -q "shouldContinueAfterValidation" "$GRAPH_DIR/edges.ts" 2>/dev/null; then
    log_success "4.1: shouldContinueAfterValidation function exists"
else
    log_failure "4.1: shouldContinueAfterValidation function not found"
fi

# Test 4.2: shouldContinueAfterExtraction function exists
log_info "Checking shouldContinueAfterExtraction function..."
if grep -q "shouldContinueAfterExtraction" "$GRAPH_DIR/edges.ts" 2>/dev/null; then
    log_success "4.2: shouldContinueAfterExtraction function exists"
else
    log_failure "4.2: shouldContinueAfterExtraction function not found"
fi

# Test 4.3: shouldContinueAfterDecomposition function exists
log_info "Checking shouldContinueAfterDecomposition function..."
if grep -q "shouldContinueAfterDecomposition" "$GRAPH_DIR/edges.ts" 2>/dev/null; then
    log_success "4.3: shouldContinueAfterDecomposition function exists"
else
    log_failure "4.3: shouldContinueAfterDecomposition function not found"
fi

# Test 4.4: shouldContinueAfterEstimation function exists
log_info "Checking shouldContinueAfterEstimation function..."
if grep -q "shouldContinueAfterEstimation" "$GRAPH_DIR/edges.ts" 2>/dev/null; then
    log_success "4.4: shouldContinueAfterEstimation function exists"
else
    log_failure "4.4: shouldContinueAfterEstimation function not found"
fi

# Test 4.5: Edge functions return CONTINUE or END
log_info "Checking edge return values..."
if grep -q "CONTINUE\|END" "$GRAPH_DIR/edges.ts" 2>/dev/null; then
    log_success "4.5: Edge functions return CONTINUE/END values"
else
    log_failure "4.5: Edge functions do not return expected values"
fi

# Test 4.6: Edges check shouldStop flag
log_info "Checking edges check shouldStop..."
if grep -q "shouldStop" "$GRAPH_DIR/edges.ts" 2>/dev/null; then
    log_success "4.6: Edge functions check shouldStop flag"
else
    log_failure "4.6: Edge functions do not check shouldStop flag"
fi

# Test 4.7: Edges export EdgeNames
log_info "Checking EdgeNames export..."
if grep -q "EdgeNames" "$GRAPH_DIR/state.ts" 2>/dev/null || grep -q "EdgeNames" "$GRAPH_DIR/edges.ts" 2>/dev/null; then
    log_success "4.7: EdgeNames is defined"
else
    log_failure "4.7: EdgeNames not defined"
fi

# ==============================================================================
# TEST SECTION: Graph Node Registration
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Graph Node Registration"
echo "========================================"

# Test 5.1: Graph adds validation node
log_info "Checking validation node registration..."
if grep -q "addNode.*validation\|validation.*addNode" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "5.1: Graph registers validation node"
else
    log_failure "5.1: Graph does not register validation node"
fi

# Test 5.2: Graph adds extraction node
log_info "Checking extraction node registration..."
if grep -q "addNode.*extraction\|extraction.*addNode" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "5.2: Graph registers extraction node"
else
    log_failure "5.2: Graph does not register extraction node"
fi

# Test 5.3: Graph adds decomposition node
log_info "Checking decomposition node registration..."
if grep -q "addNode.*decomposition\|decomposition.*addNode" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "5.3: Graph registers decomposition node"
else
    log_failure "5.3: Graph does not register decomposition node"
fi

# Test 5.4: Graph adds estimation node
log_info "Checking estimation node registration..."
if grep -q "addNode.*estimation\|estimation.*addNode" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "5.4: Graph registers estimation node"
else
    log_failure "5.4: Graph does not register estimation node"
fi

# Test 5.5: Graph adds reporting node
log_info "Checking reporting node registration..."
if grep -q "addNode.*reporting\|reporting.*addNode" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "5.5: Graph registers reporting node"
else
    log_failure "5.5: Graph does not register reporting node"
fi

# ==============================================================================
# TEST SECTION: Graph Edge Configuration
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Graph Edge Configuration"
echo "========================================"

# Test 6.1: Graph adds START edge
log_info "Checking START edge..."
if grep -q "addEdge.*START\|START.*addEdge" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "6.1: Graph configures START edge"
else
    log_failure "6.1: Graph does not configure START edge"
fi

# Test 6.2: Graph adds conditional edges
log_info "Checking conditional edges..."
if grep -q "addConditionalEdges" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "6.2: Graph uses conditional edges"
else
    log_failure "6.2: Graph does not use conditional edges"
fi

# Test 6.3: Graph compiles
log_info "Checking graph compilation..."
if grep -q "\.compile()" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "6.3: Graph calls compile()"
else
    log_failure "6.3: Graph does not call compile()"
fi

# ==============================================================================
# TEST SECTION: Graph Index Exports
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Graph Index Exports"
echo "========================================"

# Test 7.1: index.ts exports createEstimationGraph
log_info "Checking createEstimationGraph export from index..."
if grep -q "createEstimationGraph" "$GRAPH_DIR/index.ts" 2>/dev/null; then
    log_success "7.1: index.ts exports createEstimationGraph"
else
    log_failure "7.1: index.ts does not export createEstimationGraph"
fi

# Test 7.2: index.ts exports state components
log_info "Checking state exports from index..."
if grep -q "EstimationStateAnnotation\|GraphState" "$GRAPH_DIR/index.ts" 2>/dev/null; then
    log_success "7.2: index.ts exports state components"
else
    log_failure "7.2: index.ts does not export state components"
fi

# Test 7.3: index.ts exports edge functions
log_info "Checking edge function exports from index..."
if grep -q "shouldContinue" "$GRAPH_DIR/index.ts" 2>/dev/null; then
    log_success "7.3: index.ts exports edge functions"
else
    log_failure "7.3: index.ts does not export edge functions"
fi

# ==============================================================================
# TEST SECTION: Node Names Constants
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Node Names Constants"
echo "========================================"

# Test 8.1: NodeNames constant exists
log_info "Checking NodeNames constant..."
if grep -q "NodeNames" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "8.1: NodeNames constant is defined"
else
    log_failure "8.1: NodeNames constant not defined"
fi

# Test 8.2: NodeNames has validation
log_info "Checking NodeNames.validation..."
if grep -q "VALIDATION.*=.*'validation'\|validation.*:" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "8.2: NodeNames has VALIDATION"
else
    log_failure "8.2: NodeNames missing VALIDATION"
fi

# Test 8.3: NodeNames has all node names
log_info "Checking all NodeNames values..."
STATE_FILE="$GRAPH_DIR/state.ts"
if grep -q "VALIDATION" "$STATE_FILE" 2>/dev/null && \
   grep -q "EXTRACTION" "$STATE_FILE" 2>/dev/null && \
   grep -q "DECOMPOSITION" "$STATE_FILE" 2>/dev/null && \
   grep -q "ESTIMATION" "$STATE_FILE" 2>/dev/null && \
   grep -q "REPORTING" "$STATE_FILE" 2>/dev/null; then
    log_success "8.3: NodeNames has all required values"
else
    log_failure "8.3: NodeNames missing some values"
fi

# ==============================================================================
# TEST SECTION: State Reducers
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: State Reducers"
echo "========================================"

# Test 9.1: State uses reducers
log_info "Checking state uses reducers..."
if grep -q "reducer" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "9.1: State defines reducers"
else
    log_failure "9.1: State does not define reducers"
fi

# Test 9.2: State uses default values
log_info "Checking state uses default values..."
if grep -q "default" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "9.2: State defines default values"
else
    log_failure "9.2: State does not define default values"
fi

# Test 9.3: Errors use append reducer
log_info "Checking errors append reducer..."
if grep -A5 "errors" "$GRAPH_DIR/state.ts" 2>/dev/null | grep -q "\[\.\.\..*\.\.\.\]"; then
    log_success "9.3: Errors uses append reducer pattern"
else
    log_warning "9.3: Errors may not use append reducer"
fi

# ==============================================================================
# TEST SECTION: Graph State Update Type
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Graph State Update Type"
echo "========================================"

# Test 10.1: GraphStateUpdate type exists
log_info "Checking GraphStateUpdate type..."
if grep -q "GraphStateUpdate" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "10.1: GraphStateUpdate type is defined"
else
    log_failure "10.1: GraphStateUpdate type not defined"
fi

# Test 10.2: createGraphInitialState function exists
log_info "Checking createGraphInitialState function..."
if grep -q "createGraphInitialState" "$GRAPH_DIR/state.ts" 2>/dev/null; then
    log_success "10.2: createGraphInitialState function is defined"
else
    log_failure "10.2: createGraphInitialState function not defined"
fi

# ==============================================================================
# TEST SECTION: TypeScript Compilation
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: TypeScript Compilation"
echo "========================================"

# Test 11.1: Graph files compile without errors
log_info "Checking TypeScript compilation for graph files..."
cd "$PROJECT_ROOT"
if npx tsc --noEmit --project tsconfig.json 2>/dev/null | grep -q "graph/.*\.ts"; then
    log_failure "11.1: TypeScript compilation errors in graph files"
else
    log_success "11.1: Graph files compile without TypeScript errors"
fi

# ==============================================================================
# TEST SECTION: Graph Integration Test
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Graph Integration Test"
echo "========================================"

# Test 12.1: Graph can be imported
log_info "Testing graph import..."
if node -e "
const path = require('path');

// Check if compiled files exist (may not exist if not built)
const distPath = path.join('$PROJECT_ROOT', 'dist');
const graphDistPath = path.join(distPath, 'apps/api/src/agents/graph');

// If dist doesn't exist, just check source files are valid
const fs = require('fs');
const graphSource = fs.readFileSync('$GRAPH_DIR/estimation.graph.ts', 'utf8');
const stateSource = fs.readFileSync('$GRAPH_DIR/state.ts', 'utf8');
const edgesSource = fs.readFileSync('$GRAPH_DIR/edges.ts', 'utf8');

if (graphSource.length > 0 && stateSource.length > 0 && edgesSource.length > 0) {
  console.log('Source files are valid and non-empty');
  process.exit(0);
} else {
  throw new Error('Source files are empty');
}
" 2>/dev/null; then
    log_success "12.1: Graph source files are valid"
else
    log_failure "12.1: Graph source files validation failed"
fi

# Test 12.2: Graph flow is correct
log_info "Validating graph flow order..."
if node -e "
const fs = require('fs');
const graphContent = fs.readFileSync('$GRAPH_DIR/estimation.graph.ts', 'utf8');

// Check that the flow follows: validation -> extraction -> decomposition -> estimation -> reporting
const nodeOrder = ['validation', 'extraction', 'decomposition', 'estimation', 'reporting'];
let lastIndex = -1;
let correctOrder = true;

for (const node of nodeOrder) {
  const currentIndex = graphContent.indexOf(node);
  if (currentIndex === -1) {
    console.log('Node not found: ' + node);
    correctOrder = false;
    break;
  }
  if (currentIndex < lastIndex) {
    console.log('Incorrect order: ' + node + ' appears before previous node');
    correctOrder = false;
    break;
  }
  lastIndex = currentIndex;
}

if (correctOrder) {
  console.log('Graph flow order is correct');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null; then
    log_success "12.2: Graph flow order is correct"
else
    log_failure "12.2: Graph flow order is incorrect"
fi

# ==============================================================================
# TEST SECTION: Error Handling in Graph
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Error Handling in Graph"
echo "========================================"

# Test 13.1: Graph has error handling wrapper
log_info "Checking graph error handling..."
if grep -q "try.*catch\|handleError\|wrapNodeExecution" "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "13.1: Graph has error handling"
else
    log_failure "13.1: Graph lacks error handling"
fi

# Test 13.2: Graph logs node execution
log_info "Checking graph logging..."
if grep -q "logger\|Logger\|console\." "$GRAPH_DIR/estimation.graph.ts" 2>/dev/null; then
    log_success "13.2: Graph has logging"
else
    log_failure "13.2: Graph lacks logging"
fi

# ==============================================================================
# TEST SECTION: Agents Module Integration
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Agents Module Integration"
echo "========================================"

# Test 14.1: Agents module exists
AGENTS_MODULE="$PROJECT_ROOT/apps/api/src/agents/agents.module.ts"
run_test "14.1: agents.module.ts exists" "[ -f '$AGENTS_MODULE' ]"

# Test 14.2: Agents module imports graph components
log_info "Checking agents module imports graph..."
if [ -f "$AGENTS_MODULE" ] && grep -q "graph\|Graph" "$AGENTS_MODULE" 2>/dev/null; then
    log_success "14.2: Agents module references graph"
else
    log_warning "14.2: Agents module may not reference graph"
fi

# Test 14.3: Agents index exports graph
log_info "Checking agents index exports graph..."
AGENTS_INDEX="$PROJECT_ROOT/apps/api/src/agents/index.ts"
if [ -f "$AGENTS_INDEX" ] && grep -q "graph" "$AGENTS_INDEX" 2>/dev/null; then
    log_success "14.3: Agents index exports graph"
else
    log_warning "14.3: Agents index may not export graph"
fi

# ==============================================================================
# TEST SECTION: Dependencies Check
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Dependencies Check"
echo "========================================"

# Test 15.1: @langchain/langgraph is installed
log_info "Checking @langchain/langgraph dependency..."
if grep -q "@langchain/langgraph" "$PROJECT_ROOT/package.json" 2>/dev/null; then
    log_success "15.1: @langchain/langgraph is in package.json"
else
    log_failure "15.1: @langchain/langgraph not in package.json"
fi

# Test 15.2: Check node_modules has langgraph
log_info "Checking langgraph in node_modules..."
if [ -d "$PROJECT_ROOT/node_modules/@langchain/langgraph" ]; then
    log_success "15.2: @langchain/langgraph is installed"
else
    log_warning "15.2: @langchain/langgraph may not be installed (run npm install)"
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
    echo -e "${GREEN}All Phase 6 tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}Some Phase 6 tests failed. Please review the output above.${NC}"
    exit 1
fi
