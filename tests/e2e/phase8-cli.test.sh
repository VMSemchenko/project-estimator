#!/bin/bash
# ==============================================================================
# Phase 8: CLI & Integration - Test CLI commands and integration
# ==============================================================================
# This script tests the CLI commands including catalog index, estimate,
# and other CLI functionality. It verifies command existence, help output,
# and basic command execution.
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
# TEST SECTION: CLI Directory Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: CLI Directory Structure"
echo "========================================"

CLI_DIR="$PROJECT_ROOT/apps/api/src/cli"

# Test 1.1: cli directory exists
run_test "1.1: cli directory exists" "[ -d '$CLI_DIR' ]"

# Test 1.2: cli/index.ts exists
run_test "1.2: cli/index.ts exists" "[ -f '$CLI_DIR/index.ts' ]"

# Test 1.3: commands directory exists
run_test "1.3: commands directory exists" "[ -d '$CLI_DIR/commands' ]"

# Test 1.4: utils directory exists
run_test "1.4: utils directory exists" "[ -d '$CLI_DIR/utils' ]"

# ==============================================================================
# TEST SECTION: CLI Command Files
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: CLI Command Files"
echo "========================================"

COMMANDS_DIR="$CLI_DIR/commands"

# Test 2.1: catalog.command.ts exists
run_test "2.1: catalog.command.ts exists" "[ -f '$COMMANDS_DIR/catalog.command.ts' ]"

# Test 2.2: estimate.command.ts exists
run_test "2.2: estimate.command.ts exists" "[ -f '$COMMANDS_DIR/estimate.command.ts' ]"

# ==============================================================================
# TEST SECTION: CLI Utility Files
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: CLI Utility Files"
echo "========================================"

UTILS_DIR="$CLI_DIR/utils"

# Test 3.1: progress.ts exists
run_test "3.1: progress.ts exists" "[ -f '$UTILS_DIR/progress.ts' ]"

# Test 3.2: output-writer.ts exists
run_test "3.2: output-writer.ts exists" "[ -f '$UTILS_DIR/output-writer.ts' ]"

# ==============================================================================
# TEST SECTION: CLI Index Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: CLI Index Structure"
echo "========================================"

# Test 4.1: Check shebang
log_info "Checking shebang..."
if head -1 "$CLI_DIR/index.ts" | grep -q "#!/usr/bin/env node"; then
    log_success "4.1: CLI has proper shebang"
else
    log_failure "4.1: CLI has proper shebang"
fi

# Test 4.2: Check Commander import
log_info "Checking Commander import..."
if grep -q "from 'commander'" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "4.2: CLI imports Commander"
else
    log_failure "4.2: CLI imports Commander"
fi

# Test 4.3: Check program name
log_info "Checking program name..."
if grep -q "estimator-cli" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "4.3: CLI has correct program name"
else
    log_failure "4.3: CLI has correct program name"
fi

# Test 4.4: Check version
log_info "Checking version..."
if grep -q "version" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "4.4: CLI has version defined"
else
    log_failure "4.4: CLI has version defined"
fi

# Test 4.5: Check estimate command configuration
log_info "Checking estimate command configuration..."
if grep -q "configureEstimateCommand" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "4.5: CLI configures estimate command"
else
    log_failure "4.5: CLI configures estimate command"
fi

# Test 4.6: Check catalog command configuration
log_info "Checking catalog command configuration..."
if grep -q "configureCatalogCommand" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "4.6: CLI configures catalog command"
else
    log_failure "4.6: CLI configures catalog command"
fi

# ==============================================================================
# TEST SECTION: Catalog Command Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Catalog Command Structure"
echo "========================================"

# Test 5.1: Check catalog command export
log_info "Checking catalog command export..."
if grep -q "export.*configureCatalogCommand" "$COMMANDS_DIR/catalog.command.ts" 2>/dev/null; then
    log_success "5.1: catalog.command.ts exports configureCatalogCommand"
else
    log_failure "5.1: catalog.command.ts exports configureCatalogCommand"
fi

# Test 5.2: Check catalog index function
log_info "Checking catalog index function..."
if grep -q "runCatalogIndex" "$COMMANDS_DIR/catalog.command.ts" 2>/dev/null; then
    log_success "5.2: catalog.command.ts has runCatalogIndex function"
else
    log_failure "5.2: catalog.command.ts has runCatalogIndex function"
fi

# Test 5.3: Check catalog status function
log_info "Checking catalog status function..."
if grep -q "runCatalogStatus" "$COMMANDS_DIR/catalog.command.ts" 2>/dev/null; then
    log_success "5.3: catalog.command.ts has runCatalogStatus function"
else
    log_failure "5.3: catalog.command.ts has runCatalogStatus function"
fi

# Test 5.4: Check CatalogsService import
log_info "Checking CatalogsService import..."
if grep -q "CatalogsService" "$COMMANDS_DIR/catalog.command.ts" 2>/dev/null; then
    log_success "5.4: catalog.command.ts imports CatalogsService"
else
    log_failure "5.4: catalog.command.ts imports CatalogsService"
fi

# ==============================================================================
# TEST SECTION: Estimate Command Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Estimate Command Structure"
echo "========================================"

# Test 6.1: Check estimate command export
log_info "Checking estimate command export..."
if grep -q "export.*configureEstimateCommand" "$COMMANDS_DIR/estimate.command.ts" 2>/dev/null; then
    log_success "6.1: estimate.command.ts exports configureEstimateCommand"
else
    log_failure "6.1: estimate.command.ts exports configureEstimateCommand"
fi

# Test 6.2: Check runEstimate function
log_info "Checking runEstimate function..."
if grep -q "runEstimate" "$COMMANDS_DIR/estimate.command.ts" 2>/dev/null; then
    log_success "6.2: estimate.command.ts has runEstimate function"
else
    log_failure "6.2: estimate.command.ts has runEstimate function"
fi

# Test 6.3: Check input folder parameter
log_info "Checking input folder parameter..."
if grep -q "inputFolder" "$COMMANDS_DIR/estimate.command.ts" 2>/dev/null; then
    log_success "6.3: estimate.command.ts handles inputFolder parameter"
else
    log_failure "6.3: estimate.command.ts handles inputFolder parameter"
fi

# Test 6.4: Check output option
log_info "Checking output option..."
if grep -q "output" "$COMMANDS_DIR/estimate.command.ts" 2>/dev/null; then
    log_success "6.4: estimate.command.ts handles output option"
else
    log_failure "6.4: estimate.command.ts handles output option"
fi

# Test 6.5: Check verbose option
log_info "Checking verbose option..."
if grep -q "verbose" "$COMMANDS_DIR/estimate.command.ts" 2>/dev/null; then
    log_success "6.5: estimate.command.ts handles verbose option"
else
    log_failure "6.5: estimate.command.ts handles verbose option"
fi

# Test 6.6: Check estimation graph import
log_info "Checking estimation graph import..."
if grep -q "estimation.graph" "$COMMANDS_DIR/estimate.command.ts" 2>/dev/null; then
    log_success "6.6: estimate.command.ts imports estimation graph"
else
    log_failure "6.6: estimate.command.ts imports estimation graph"
fi

# ==============================================================================
# TEST SECTION: Package.json Scripts
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Package.json Scripts"
echo "========================================"

PACKAGE_JSON="$PROJECT_ROOT/package.json"

# Test 7.1: CLI script exists
log_info "Checking CLI script..."
if grep -q '"cli"' "$PACKAGE_JSON" 2>/dev/null; then
    log_success "7.1: package.json has cli script"
else
    log_failure "7.1: package.json has cli script"
fi

# Test 7.2: Estimate script exists
log_info "Checking estimate script..."
if grep -q '"estimate"' "$PACKAGE_JSON" 2>/dev/null; then
    log_success "7.2: package.json has estimate script"
else
    log_failure "7.2: package.json has estimate script"
fi

# Test 7.3: catalog:index script exists
log_info "Checking catalog:index script..."
if grep -q '"catalog:index"' "$PACKAGE_JSON" 2>/dev/null; then
    log_success "7.3: package.json has catalog:index script"
else
    log_failure "7.3: package.json has catalog:index script"
fi

# Test 7.4: catalog:status script exists
log_info "Checking catalog:status script..."
if grep -q '"catalog:status"' "$PACKAGE_JSON" 2>/dev/null; then
    log_success "7.4: package.json has catalog:status script"
else
    log_failure "7.4: package.json has catalog:status script"
fi

# ==============================================================================
# TEST SECTION: CLI Help Command
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: CLI Help Command"
echo "========================================"

cd "$PROJECT_ROOT"

# Test 8.1: CLI help works
log_info "Testing CLI help..."
if npm run cli -- --help 2>/dev/null | grep -q "estimator-cli"; then
    log_success "8.1: CLI help command works"
else
    log_failure "8.1: CLI help command works"
fi

# Test 8.2: CLI version works
log_info "Testing CLI version..."
if npm run cli -- --version 2>/dev/null | grep -q "0.1.0"; then
    log_success "8.2: CLI version command works"
else
    log_failure "8.2: CLI version command works"
fi

# ==============================================================================
# TEST SECTION: Catalog Command Help
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Catalog Command Help"
echo "========================================"

# Test 9.1: Catalog help works
log_info "Testing catalog command help..."
if npm run cli -- catalog --help 2>/dev/null | grep -q "catalog"; then
    log_success "9.1: catalog command help works"
else
    log_failure "9.1: catalog command help works"
fi

# Test 9.2: Catalog index help works
log_info "Testing catalog index command help..."
if npm run cli -- catalog index --help 2>/dev/null | grep -q "index"; then
    log_success "9.2: catalog index command help works"
else
    log_failure "9.2: catalog index command help works"
fi

# Test 9.3: Catalog status help works
log_info "Testing catalog status command help..."
if npm run cli -- catalog status --help 2>/dev/null | grep -q "status"; then
    log_success "9.3: catalog status command help works"
else
    log_failure "9.3: catalog status command help works"
fi

# ==============================================================================
# TEST SECTION: Estimate Command Help
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Estimate Command Help"
echo "========================================"

# Test 10.1: Estimate help works
log_info "Testing estimate command help..."
if npm run cli -- estimate --help 2>/dev/null | grep -q "estimate"; then
    log_success "10.1: estimate command help works"
else
    log_failure "10.1: estimate command help works"
fi

# Test 10.2: Estimate help shows input folder
log_info "Testing estimate command shows input folder..."
if npm run cli -- estimate --help 2>/dev/null | grep -q "input"; then
    log_success "10.2: estimate command help shows input folder"
else
    log_failure "10.2: estimate command help shows input folder"
fi

# Test 10.3: Estimate help shows options
log_info "Testing estimate command shows options..."
if npm run cli -- estimate --help 2>/dev/null | grep -q "output\|verbose"; then
    log_success "10.3: estimate command help shows options"
else
    log_failure "10.3: estimate command help shows options"
fi

# ==============================================================================
# TEST SECTION: CLI Utility Functions
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: CLI Utility Functions"
echo "========================================"

# Test 11.1: Check progress utility exports
log_info "Checking progress utility exports..."
if grep -q "export" "$UTILS_DIR/progress.ts" 2>/dev/null; then
    log_success "11.1: progress.ts has exports"
else
    log_failure "11.1: progress.ts has exports"
fi

# Test 11.2: Check createProgress function
log_info "Checking createProgress function..."
if grep -q "createProgress" "$UTILS_DIR/progress.ts" 2>/dev/null; then
    log_success "11.2: progress.ts has createProgress function"
else
    log_failure "11.2: progress.ts has createProgress function"
fi

# Test 11.3: Check output-writer exports
log_info "Checking output-writer exports..."
if grep -q "export" "$UTILS_DIR/output-writer.ts" 2>/dev/null; then
    log_success "11.3: output-writer.ts has exports"
else
    log_failure "11.3: output-writer.ts has exports"
fi

# Test 11.4: Check createOutputWriter function
log_info "Checking createOutputWriter function..."
if grep -q "createOutputWriter" "$UTILS_DIR/output-writer.ts" 2>/dev/null; then
    log_success "11.4: output-writer.ts has createOutputWriter function"
else
    log_failure "11.4: output-writer.ts has createOutputWriter function"
fi

# ==============================================================================
# TEST SECTION: Legacy Commands
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Legacy Commands"
echo "========================================"

# Test 12.1: Ingest command exists (deprecated)
log_info "Checking ingest command..."
if grep -q "ingest" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "12.1: CLI has ingest command (deprecated)"
else
    log_failure "12.1: CLI has ingest command (deprecated)"
fi

# Test 12.2: Query command exists
log_info "Checking query command..."
if grep -q "query" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "12.2: CLI has query command"
else
    log_failure "12.2: CLI has query command"
fi

# ==============================================================================
# TEST SECTION: Environment Loading
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Environment Loading"
echo "========================================"

# Test 13.1: Check dotenv import
log_info "Checking dotenv import..."
if grep -q "dotenv" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "13.1: CLI imports dotenv"
else
    log_failure "13.1: CLI imports dotenv"
fi

# Test 13.2: Check dotenv.config() call
log_info "Checking dotenv.config() call..."
if grep -q "dotenv.config" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "13.2: CLI calls dotenv.config()"
else
    log_failure "13.2: CLI calls dotenv.config()"
fi

# Test 13.3: Check reflect-metadata import
log_info "Checking reflect-metadata import..."
if grep -q "reflect-metadata" "$CLI_DIR/index.ts" 2>/dev/null; then
    log_success "13.3: CLI imports reflect-metadata"
else
    log_failure "13.3: CLI imports reflect-metadata"
fi

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
    echo -e "${GREEN}All Phase 8 (CLI & Integration) tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some Phase 8 (CLI & Integration) tests failed.${NC}"
    exit 1
fi
