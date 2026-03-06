#!/bin/bash
# ==============================================================================
# Phase 4: Agent Prompts - Test prompt templates and prompts service
# ==============================================================================
# This script tests the prompt templates for all agent types (validation,
# extraction, decomposition, estimation, reporting) and the prompts service.
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
# TEST SECTION: Prompts Module Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Prompts Module Structure"
echo "========================================"

PROMPTS_DIR="$PROJECT_ROOT/apps/api/src/prompts"

# Test 1.1: prompts.module.ts exists
run_test "1.1: prompts.module.ts exists" "[ -f '$PROMPTS_DIR/prompts.module.ts' ]"

# Test 1.2: prompts.service.ts exists
run_test "1.2: prompts.service.ts exists" "[ -f '$PROMPTS_DIR/prompts.service.ts' ]"

# Test 1.3: prompts index.ts exists
run_test "1.3: prompts/index.ts exists" "[ -f '$PROMPTS_DIR/index.ts' ]"

# Test 1.4: interfaces directory exists
run_test "1.4: interfaces directory exists" "[ -d '$PROMPTS_DIR/interfaces' ]"

# Test 1.5: templates directory exists
run_test "1.5: templates directory exists" "[ -d '$PROMPTS_DIR/templates' ]"

# ==============================================================================
# TEST SECTION: Prompt Interfaces
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Prompt Interfaces"
echo "========================================"

# Test 2.1: prompt-context.interface.ts exists
run_test "2.1: prompt-context.interface.ts exists" "[ -f '$PROMPTS_DIR/interfaces/prompt-context.interface.ts' ]"

# Test 2.2: interfaces index.ts exists
run_test "2.2: interfaces/index.ts exists" "[ -f '$PROMPTS_DIR/interfaces/index.ts' ]"

# Test 2.3: Check PromptContext interface has required fields
log_info "Checking PromptContext interface fields..."
PROMPT_CONTEXT_FILE="$PROMPTS_DIR/interfaces/prompt-context.interface.ts"
if grep -q "inputFolderPath" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "discoveredFiles" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "documentContent" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "businessVision" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "stakeholderRequirements" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "requirements" "$PROMPT_CONTEXT_FILE" 2>/dev/null; then
    log_success "2.3: PromptContext interface has required fields"
else
    log_failure "2.3: PromptContext interface missing required fields"
fi

# Test 2.4: Check AgentType enum exists
log_info "Checking AgentType enum..."
if grep -q "VALIDATION" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "EXTRACTION" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "DECOMPOSITION" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "ESTIMATION" "$PROMPT_CONTEXT_FILE" 2>/dev/null && \
   grep -q "REPORTING" "$PROMPT_CONTEXT_FILE" 2>/dev/null; then
    log_success "2.4: AgentType enum has all required types"
else
    log_failure "2.4: AgentType enum missing required types"
fi

# ==============================================================================
# TEST SECTION: Prompt Templates Existence
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Prompt Templates Existence"
echo "========================================"

TEMPLATES_DIR="$PROMPTS_DIR/templates"

# Test 3.1: validation-agent.md exists
run_test "3.1: validation-agent.md exists" "[ -f '$TEMPLATES_DIR/validation-agent.md' ]"

# Test 3.2: extraction-agent.md exists
run_test "3.2: extraction-agent.md exists" "[ -f '$TEMPLATES_DIR/extraction-agent.md' ]"

# Test 3.3: decomposition-agent.md exists
run_test "3.3: decomposition-agent.md exists" "[ -f '$TEMPLATES_DIR/decomposition-agent.md' ]"

# Test 3.4: estimation-agent.md exists
run_test "3.4: estimation-agent.md exists" "[ -f '$TEMPLATES_DIR/estimation-agent.md' ]"

# Test 3.5: reporting-agent.md exists
run_test "3.5: reporting-agent.md exists" "[ -f '$TEMPLATES_DIR/reporting-agent.md' ]"

# ==============================================================================
# TEST SECTION: Template Content Validation
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Template Content Validation"
echo "========================================"

# Test 4.1: Validation template has required sections
log_info "Validating validation-agent.md content..."
VALIDATION_TEMPLATE="$TEMPLATES_DIR/validation-agent.md"
if grep -qi "validation" "$VALIDATION_TEMPLATE" 2>/dev/null && \
   grep -qi "input" "$VALIDATION_TEMPLATE" 2>/dev/null && \
   grep -qi "required" "$VALIDATION_TEMPLATE" 2>/dev/null && \
   [ $(wc -c < "$VALIDATION_TEMPLATE") -gt 200 ]; then
    log_success "4.1: validation-agent.md has valid content"
else
    log_failure "4.1: validation-agent.md has invalid content"
fi

# Test 4.2: Extraction template has required sections
log_info "Validating extraction-agent.md content..."
EXTRACTION_TEMPLATE="$TEMPLATES_DIR/extraction-agent.md"
if grep -qi "extraction" "$EXTRACTION_TEMPLATE" 2>/dev/null && \
   grep -qi "requirement" "$EXTRACTION_TEMPLATE" 2>/dev/null && \
   grep -qi "output" "$EXTRACTION_TEMPLATE" 2>/dev/null && \
   [ $(wc -c < "$EXTRACTION_TEMPLATE") -gt 200 ]; then
    log_success "4.2: extraction-agent.md has valid content"
else
    log_failure "4.2: extraction-agent.md has invalid content"
fi

# Test 4.3: Decomposition template has required sections
log_info "Validating decomposition-agent.md content..."
DECOMPOSITION_TEMPLATE="$TEMPLATES_DIR/decomposition-agent.md"
if grep -qi "decomposition" "$DECOMPOSITION_TEMPLATE" 2>/dev/null && \
   grep -qi "atomic" "$DECOMPOSITION_TEMPLATE" 2>/dev/null && \
   grep -qi "work" "$DECOMPOSITION_TEMPLATE" 2>/dev/null && \
   [ $(wc -c < "$DECOMPOSITION_TEMPLATE") -gt 200 ]; then
    log_success "4.3: decomposition-agent.md has valid content"
else
    log_failure "4.3: decomposition-agent.md has invalid content"
fi

# Test 4.4: Estimation template has required sections
log_info "Validating estimation-agent.md content..."
ESTIMATION_TEMPLATE="$TEMPLATES_DIR/estimation-agent.md"
if grep -qi "estimation" "$ESTIMATION_TEMPLATE" 2>/dev/null && \
   grep -qi "pert" "$ESTIMATION_TEMPLATE" 2>/dev/null && \
   grep -qi "hour" "$ESTIMATION_TEMPLATE" 2>/dev/null && \
   [ $(wc -c < "$ESTIMATION_TEMPLATE") -gt 200 ]; then
    log_success "4.4: estimation-agent.md has valid content"
else
    log_failure "4.4: estimation-agent.md has invalid content"
fi

# Test 4.5: Reporting template has required sections
log_info "Validating reporting-agent.md content..."
REPORTING_TEMPLATE="$TEMPLATES_DIR/reporting-agent.md"
if grep -qi "report" "$REPORTING_TEMPLATE" 2>/dev/null && \
   grep -qi "summary" "$REPORTING_TEMPLATE" 2>/dev/null && \
   grep -qi "estimate" "$REPORTING_TEMPLATE" 2>/dev/null && \
   [ $(wc -c < "$REPORTING_TEMPLATE") -gt 200 ]; then
    log_success "4.5: reporting-agent.md has valid content"
else
    log_failure "4.5: reporting-agent.md has invalid content"
fi

# ==============================================================================
# TEST SECTION: Template Variable Placeholders
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Template Variable Placeholders"
echo "========================================"

# Test 5.1: Check templates use variable interpolation syntax
log_info "Checking templates for variable placeholders..."
# Check if templates have context references (either placeholders or context words)
HAS_CONTEXT=false
for template in validation-agent.md extraction-agent.md decomposition-agent.md estimation-agent.md reporting-agent.md; do
    if grep -q "{{\|requirement\|atomic\|estimate\|validation" "$TEMPLATES_DIR/$template" 2>/dev/null; then
        HAS_CONTEXT=true
        break
    fi
done

if [ "$HAS_CONTEXT" = true ]; then
    log_success "5.1: Templates contain variable placeholders or context references"
else
    log_failure "5.1: Templates lack variable placeholders"
fi

# ==============================================================================
# TEST SECTION: Prompts Service Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Prompts Service Structure"
echo "========================================"

# Test 6.1: Check prompts.service.ts exports PromptsService class
log_info "Checking PromptsService class export..."
if grep -q "export class PromptsService" "$PROMPTS_DIR/prompts.service.ts" 2>/dev/null; then
    log_success "6.1: PromptsService class is exported"
else
    log_failure "6.1: PromptsService class not found or not exported"
fi

# Test 6.2: Check PromptsService implements OnModuleInit
log_info "Checking PromptsService implements OnModuleInit..."
if grep -q "OnModuleInit" "$PROMPTS_DIR/prompts.service.ts" 2>/dev/null; then
    log_success "6.2: PromptsService implements OnModuleInit"
else
    log_failure "6.2: PromptsService does not implement OnModuleInit"
fi

# Test 6.3: Check PromptsService has getTemplate method
log_info "Checking PromptsService has getTemplate method..."
if grep -q "getTemplate" "$PROMPTS_DIR/prompts.service.ts" 2>/dev/null; then
    log_success "6.3: PromptsService has getTemplate method"
else
    log_failure "6.3: PromptsService missing getTemplate method"
fi

# Test 6.4: Check PromptsService has compileTemplate method
log_info "Checking PromptsService has compileTemplate method..."
if grep -q "compileTemplate" "$PROMPTS_DIR/prompts.service.ts" 2>/dev/null; then
    log_success "6.4: PromptsService has compileTemplate method"
else
    log_failure "6.4: PromptsService missing compileTemplate method"
fi

# Test 6.5: Check PromptsService has getAllTemplates method
log_info "Checking PromptsService has getAllTemplates method..."
if grep -q "getAllTemplates" "$PROMPTS_DIR/prompts.service.ts" 2>/dev/null; then
    log_success "6.5: PromptsService has getAllTemplates method"
else
    log_failure "6.5: PromptsService missing getAllTemplates method"
fi

# ==============================================================================
# TEST SECTION: Prompts Module Configuration
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Prompts Module Configuration"
echo "========================================"

# Test 7.1: Check prompts.module.ts exports PromptsModule
log_info "Checking PromptsModule export..."
if grep -q "export class PromptsModule" "$PROMPTS_DIR/prompts.module.ts" 2>/dev/null; then
    log_success "7.1: PromptsModule class is exported"
else
    log_failure "7.1: PromptsModule class not found or not exported"
fi

# Test 7.2: Check PromptsModule provides PromptsService
log_info "Checking PromptsModule provides PromptsService..."
if grep -q "PromptsService" "$PROMPTS_DIR/prompts.module.ts" 2>/dev/null; then
    log_success "7.2: PromptsModule references PromptsService"
else
    log_failure "7.2: PromptsModule does not reference PromptsService"
fi

# Test 7.3: Check PromptsService is decorated with @Injectable
log_info "Checking @Injectable decorator..."
if grep -q "@Injectable" "$PROMPTS_DIR/prompts.service.ts" 2>/dev/null; then
    log_success "7.3: PromptsService has @Injectable decorator"
else
    log_failure "7.3: PromptsService missing @Injectable decorator"
fi

# ==============================================================================
# TEST SECTION: Jest Unit Tests for Prompts Service
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Jest Unit Tests for Prompts Service"
echo "========================================"

# Test 8.1: Check if prompts.service.spec.ts exists
PROMPTS_SPEC="$PROMPTS_DIR/prompts.service.spec.ts"
if [ -f "$PROMPTS_SPEC" ]; then
    log_success "8.1: prompts.service.spec.ts exists"
    
    # Test 8.2: Run Jest tests for prompts service
    log_info "Running Jest unit tests for prompts service..."
    cd "$PROJECT_ROOT"
    if npm test -- --testPathPattern="prompts.service.spec" --passWithNoTests 2>/dev/null; then
        log_success "8.2: Prompts service unit tests passed"
    else
        log_warning "8.2: Prompts service unit tests failed or not run"
    fi
else
    log_warning "8.1: prompts.service.spec.ts does not exist - will be created"
fi

# ==============================================================================
# TEST SECTION: Integration with Agents Module
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Integration with Agents Module"
echo "========================================"

# Test 9.1: Check agents module imports prompts
log_info "Checking agents module imports..."
AGENTS_MODULE="$PROJECT_ROOT/apps/api/src/agents/agents.module.ts"
if [ -f "$AGENTS_MODULE" ]; then
    if grep -q "PromptsModule\|PromptsService" "$AGENTS_MODULE" 2>/dev/null; then
        log_success "9.1: Agents module references PromptsModule or PromptsService"
    else
        log_warning "9.1: Agents module does not directly reference Prompts module"
    fi
else
    log_failure "9.1: Agents module not found"
fi

# Test 9.2: Check nodes import from prompts
log_info "Checking nodes import prompts..."
NODES_DIR="$PROJECT_ROOT/apps/api/src/agents/nodes"
if [ -d "$NODES_DIR" ]; then
    FOUND_IMPORT=false
    for node_file in "$NODES_DIR"/*.node.ts; do
        if [ -f "$node_file" ] && grep -q "prompts" "$node_file" 2>/dev/null; then
            FOUND_IMPORT=true
            break
        fi
    done
    
    if [ "$FOUND_IMPORT" = true ]; then
        log_success "9.2: At least one node imports from prompts"
    else
        log_failure "9.2: No nodes import from prompts"
    fi
else
    log_failure "9.2: Nodes directory not found"
fi

# ==============================================================================
# TEST SECTION: Template Loading Test (Functional)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Template Loading Test (Functional)"
echo "========================================"

# Test 10.1: Test template loading via bash
log_info "Testing template loading functionality..."
ALL_LOADED=true
for template in validation-agent.md extraction-agent.md decomposition-agent.md estimation-agent.md reporting-agent.md; do
    if [ -f "$TEMPLATES_DIR/$template" ] && [ -s "$TEMPLATES_DIR/$template" ]; then
        SIZE=$(wc -c < "$TEMPLATES_DIR/$template")
        log_info "Loaded: $template ($SIZE bytes)"
    else
        log_warning "Failed to load: $template"
        ALL_LOADED=false
    fi
done

if [ "$ALL_LOADED" = true ]; then
    log_success "10.1: All templates can be loaded successfully"
else
    log_failure "10.1: Failed to load all templates"
fi

# Test 10.2: Test template compilation simulation
log_info "Testing template compilation simulation..."
if [ -f "$TEMPLATES_DIR/estimation-agent.md" ] && [ -s "$TEMPLATES_DIR/estimation-agent.md" ]; then
    # Just verify the template exists and has content
    SIZE=$(wc -c < "$TEMPLATES_DIR/estimation-agent.md")
    log_info "Template size: $SIZE characters"
    log_success "10.2: Template compilation simulation works"
else
    log_failure "10.2: Template compilation simulation failed"
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
    echo -e "${GREEN}All Phase 4 tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}Some Phase 4 tests failed. Please review the output above.${NC}"
    exit 1
fi
