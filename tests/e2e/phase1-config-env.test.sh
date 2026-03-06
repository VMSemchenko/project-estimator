#!/bin/bash
# ==============================================================================
# Phase 1: Project Setup - Configuration and Environment Tests
# ==============================================================================
# This script tests that the project configuration and environment are properly
# set up for the BA Work Estimation System.
# ==============================================================================

set -e  # Exit on error

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
# TEST SECTION: Project Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Project Structure"
echo "========================================"

# Test 1.1: Check package.json exists
run_test "1.1: package.json exists" "[ -f '$PROJECT_ROOT/package.json' ]"

# Test 1.2: Check tsconfig.json exists
run_test "1.2: tsconfig.json exists" "[ -f '$PROJECT_ROOT/tsconfig.json' ]"

# Test 1.3: Check nest-cli.json exists
run_test "1.3: nest-cli.json exists" "[ -f '$PROJECT_ROOT/nest-cli.json' ]"

# Test 1.4: Check .env.example exists
run_test "1.4: .env.example exists" "[ -f '$PROJECT_ROOT/.env.example' ]"

# Test 1.5: Check .gitignore exists
run_test "1.5: .gitignore exists" "[ -f '$PROJECT_ROOT/.gitignore' ]"

# Test 1.6: Check source directory structure
run_test "1.6: apps/api/src directory exists" "[ -d '$PROJECT_ROOT/apps/api/src' ]"

# Test 1.7: Check main.ts entry point
run_test "1.7: main.ts entry point exists" "[ -f '$PROJECT_ROOT/apps/api/src/main.ts' ]"

# Test 1.8: Check app.module.ts exists
run_test "1.8: app.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/app.module.ts' ]"

# ==============================================================================
# TEST SECTION: Environment Configuration
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Environment Configuration"
echo "========================================"

# Test 2.1: Check .env file exists (for actual values)
if [ -f "$PROJECT_ROOT/.env" ]; then
    log_success "2.1: .env file exists"
else
    log_warning "2.1: .env file not found (using .env.example as reference)"
    ((TESTS_TOTAL++)) || true
fi

# Test 2.2: Verify .env has required variables (if .env exists)
if [ -f "$PROJECT_ROOT/.env" ]; then
    run_test "2.2: ZHIPUAI_API_KEY is set" "grep -q 'ZHIPUAI_API_KEY=.' '$PROJECT_ROOT/.env' && ! grep -q 'your_zhipuai_api_key' '$PROJECT_ROOT/.env'"
    
    run_test "2.3: MONGODB_URI is set" "grep -q 'MONGODB_URI=mongodb' '$PROJECT_ROOT/.env'"
    
    run_test "2.4: LLM_MODEL is configured" "grep -q 'LLM_MODEL=' '$PROJECT_ROOT/.env'"
    
    run_test "2.5: EMBEDDING_MODEL is configured" "grep -q 'EMBEDDING_MODEL=' '$PROJECT_ROOT/.env'"
fi

# Test 2.6: Verify .env.example has all required variables
run_test "2.6: .env.example has ZHIPUAI_API_KEY" "grep -q 'ZHIPUAI_API_KEY' '$PROJECT_ROOT/.env.example'"

run_test "2.7: .env.example has MONGODB_URI" "grep -q 'MONGODB_URI' '$PROJECT_ROOT/.env.example'"

run_test "2.8: .env.example has LANGFUSE_PUBLIC_KEY" "grep -q 'LANGFUSE_PUBLIC_KEY' '$PROJECT_ROOT/.env.example'"

run_test "2.9: .env.example has LANGFUSE_SECRET_KEY" "grep -q 'LANGFUSE_SECRET_KEY' '$PROJECT_ROOT/.env.example'"

# ==============================================================================
# TEST SECTION: Dependencies
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Dependencies"
echo "========================================"

# Test 3.1: Check node_modules exists
run_test "3.1: node_modules exists" "[ -d '$PROJECT_ROOT/node_modules' ]"

# Test 3.2: Check key dependencies are installed
run_test "3.2: @nestjs/core is installed" "[ -d '$PROJECT_ROOT/node_modules/@nestjs/core' ]"

run_test "3.3: @langchain/core is installed" "[ -d '$PROJECT_ROOT/node_modules/@langchain/core' ]"

run_test "3.4: @langchain/langgraph is installed" "[ -d '$PROJECT_ROOT/node_modules/@langchain/langgraph' ]"

run_test "3.5: @langchain/openai is installed" "[ -d '$PROJECT_ROOT/node_modules/@langchain/openai' ]"

run_test "3.6: mongodb is installed" "[ -d '$PROJECT_ROOT/node_modules/mongodb' ]"

run_test "3.7: langfuse is installed" "[ -d '$PROJECT_ROOT/node_modules/langfuse' ]"

run_test "3.8: yaml is installed" "[ -d '$PROJECT_ROOT/node_modules/yaml' ]"

# ==============================================================================
# TEST SECTION: TypeScript Configuration
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: TypeScript Configuration"
echo "========================================"

# Test 4.1: TypeScript config is valid JSON
run_test "4.1: tsconfig.json is valid JSON" "node -e \"JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/tsconfig.json', 'utf8'))\""

# Test 4.2: TypeScript can compile (dry run) - skip in CI for speed
if [ -z "$CI" ]; then
    run_test "4.2: TypeScript compilation works" "cd '$PROJECT_ROOT' && npx tsc --noEmit 2>/dev/null"
else
    log_info "Skipping TypeScript compilation check in CI"
fi

# ==============================================================================
# TEST SECTION: NestJS Configuration
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: NestJS Configuration"
echo "========================================"

# Test 5.1: nest-cli.json is valid JSON
run_test "5.1: nest-cli.json is valid JSON" "node -e \"JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/nest-cli.json', 'utf8'))\""

# Test 5.2: Check NestJS source roots
run_test "5.2: NestJS source root is configured" "node -e \"const c = JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/nest-cli.json', 'utf8')); process.exit(c.sourceRoot ? 0 : 1)\""

# ==============================================================================
# TEST SECTION: Module Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Module Structure"
echo "========================================"

# Test 6.1: Config module
run_test "6.1: config/configuration.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/config/configuration.ts' ]"

# Test 6.2: AI module
run_test "6.2: ai/ai.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/ai/ai.module.ts' ]"

# Test 6.3: RAG module
run_test "6.3: rag/rag.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/rag/rag.module.ts' ]"

# Test 6.4: Catalogs module
run_test "6.4: catalogs/catalogs.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/catalogs/catalogs.module.ts' ]"

# Test 6.5: Agents module
run_test "6.5: agents/agents.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/agents/agents.module.ts' ]"

# Test 6.6: Estimation module
run_test "6.6: estimation/estimation.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/estimation/estimation.module.ts' ]"

# Test 6.7: Tools module
run_test "6.7: tools/tools.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/tools/tools.module.ts' ]"

# Test 6.8: Prompts module
run_test "6.8: prompts/prompts.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/prompts/prompts.module.ts' ]"

# Test 6.9: Observability module
run_test "6.9: observability/observability.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/observability/observability.module.ts' ]"

# Test 6.10: Database module
run_test "6.10: database/database.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/database/database.module.ts' ]"

# ==============================================================================
# TEST SECTION: Catalog Assets
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Catalog Assets"
echo "========================================"

# Test 7.1: Atomic works catalog
run_test "7.1: atomic_works.yaml exists" "[ -f '$PROJECT_ROOT/apps/api/assets/catalogs/atomic_works.yaml' ]"

# Test 7.2: BA processes catalog
run_test "7.2: ba_processes.yaml exists" "[ -f '$PROJECT_ROOT/apps/api/assets/catalogs/ba_processes.yaml' ]"

# Test 7.3: Coefficients catalog
run_test "7.3: coefficients.yaml exists" "[ -f '$PROJECT_ROOT/apps/api/assets/catalogs/coefficients.yaml' ]"

# Test 7.4: Sample project exists
run_test "7.4: sample-project directory exists" "[ -d '$PROJECT_ROOT/apps/api/assets/samples/sample-project' ]"

# Test 7.5: Sample business-vision.md
run_test "7.5: sample business-vision.md exists" "[ -f '$PROJECT_ROOT/apps/api/assets/samples/sample-project/business-vision.md' ]"

# Test 7.6: Sample stakeholder-requirements.md
run_test "7.6: sample stakeholder-requirements.md exists" "[ -f '$PROJECT_ROOT/apps/api/assets/samples/sample-project/stakeholder-requirements.md' ]"

# ==============================================================================
# TEST SECTION: Prompt Templates
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Prompt Templates"
echo "========================================"

# Test 8.1-8.5: All prompt templates exist
run_test "8.1: validation-agent.md exists" "[ -f '$PROJECT_ROOT/apps/api/src/prompts/templates/validation-agent.md' ]"

run_test "8.2: extraction-agent.md exists" "[ -f '$PROJECT_ROOT/apps/api/src/prompts/templates/extraction-agent.md' ]"

run_test "8.3: decomposition-agent.md exists" "[ -f '$PROJECT_ROOT/apps/api/src/prompts/templates/decomposition-agent.md' ]"

run_test "8.4: estimation-agent.md exists" "[ -f '$PROJECT_ROOT/apps/api/src/prompts/templates/estimation-agent.md' ]"

run_test "8.5: reporting-agent.md exists" "[ -f '$PROJECT_ROOT/apps/api/src/prompts/templates/reporting-agent.md' ]"

# ==============================================================================
# TEST SECTION: Build Verification (skip in CI for speed)
# ==============================================================================
if [ -z "$CI" ]; then
    echo ""
    echo "========================================"
    echo "TEST SECTION: Build Verification"
    echo "========================================"

    # Test 9.1: Project builds successfully
    log_info "Building project (this may take a moment)..."
    if cd "$PROJECT_ROOT" && npm run build > /dev/null 2>&1; then
        log_success "9.1: Project builds successfully"
    else
        log_failure "9.1: Project build failed"
    fi

    # Test 9.2: Dist directory exists after build
    run_test "9.2: dist directory exists after build" "[ -d '$PROJECT_ROOT/dist' ]"
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo -e "Total tests: ${TESTS_TOTAL}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All Phase 1 tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
