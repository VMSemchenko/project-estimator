#!/bin/bash
# ==============================================================================
# Phase 3: Reference Catalogs - Test catalog loaders and YAML parsing
# ==============================================================================
# This script tests the catalog loaders and YAML parsing for atomic works,
# BA processes, and coefficients.
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
# TEST SECTION: Catalog Files Existence
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Catalog Files Existence"
echo "========================================"

CATALOG_DIR="$PROJECT_ROOT/apps/api/assets/catalogs"

run_test "1.1: atomic_works.yaml exists" "[ -f '$CATALOG_DIR/atomic_works.yaml' ]"
run_test "1.2: ba_processes.yaml exists" "[ -f '$CATALOG_DIR/ba_processes.yaml' ]"
run_test "1.3: coefficients.yaml exists" "[ -f '$CATALOG_DIR/coefficients.yaml' ]"

# ==============================================================================
# TEST SECTION: YAML Syntax Validation
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: YAML Syntax Validation"
echo "========================================"

# Test 2.1: Validate atomic_works.yaml syntax
log_info "Validating atomic_works.yaml syntax..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/atomic_works.yaml', 'utf8');
const parsed = yaml.parse(content);
if (!parsed.atomic_works || !Array.isArray(parsed.atomic_works)) {
  throw new Error('Invalid structure: missing atomic_works array');
}
console.log('Valid YAML with', parsed.atomic_works.length, 'atomic works');
process.exit(0);
" 2>/dev/null; then
    log_success "2.1: atomic_works.yaml is valid YAML"
else
    log_failure "2.1: atomic_works.yaml has invalid YAML syntax"
fi

# Test 2.2: Validate ba_processes.yaml syntax
log_info "Validating ba_processes.yaml syntax..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/ba_processes.yaml', 'utf8');
const parsed = yaml.parse(content);
if (!parsed.ba_processes || !Array.isArray(parsed.ba_processes)) {
  throw new Error('Invalid structure: missing ba_processes array');
}
console.log('Valid YAML with', parsed.ba_processes.length, 'BA processes');
process.exit(0);
" 2>/dev/null; then
    log_success "2.2: ba_processes.yaml is valid YAML"
else
    log_failure "2.2: ba_processes.yaml has invalid YAML syntax"
fi

# Test 2.3: Validate coefficients.yaml syntax
log_info "Validating coefficients.yaml syntax..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/coefficients.yaml', 'utf8');
const parsed = yaml.parse(content);
if (!parsed.coefficients || !Array.isArray(parsed.coefficients)) {
  throw new Error('Invalid structure: missing coefficients array');
}
console.log('Valid YAML with', parsed.coefficients.length, 'coefficients');
process.exit(0);
" 2>/dev/null; then
    log_success "2.3: coefficients.yaml is valid YAML"
else
    log_failure "2.3: coefficients.yaml has invalid YAML syntax"
fi

# ==============================================================================
# TEST SECTION: Atomic Works Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Atomic Works Structure"
echo "========================================"

# Test 3.1: Verify atomic works have required fields
log_info "Verifying atomic works structure..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/atomic_works.yaml', 'utf8');
const parsed = yaml.parse(content);
const requiredFields = ['id', 'name', 'description', 'base_hours', 'category', 'ba_process'];
let errors = [];
parsed.atomic_works.forEach((work, index) => {
  requiredFields.forEach(field => {
    if (!work[field]) {
      errors.push(\`Work at index \${index} missing field: \${field}\`);
    }
  });
});
if (errors.length > 0) {
  throw new Error(errors.join('\\n'));
}
console.log('All', parsed.atomic_works.length, 'atomic works have required fields');
process.exit(0);
" 2>/dev/null; then
    log_success "3.1: All atomic works have required fields"
else
    log_failure "3.1: Some atomic works are missing required fields"
fi

# Test 3.2: Verify base_hours is numeric
log_info "Verifying base_hours are numeric..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/atomic_works.yaml', 'utf8');
const parsed = yaml.parse(content);
let errors = [];
parsed.atomic_works.forEach((work, index) => {
  if (typeof work.base_hours !== 'number' || work.base_hours < 0) {
    errors.push(\`Work at index \${index} has invalid base_hours: \${work.base_hours}\`);
  }
});
if (errors.length > 0) {
  throw new Error(errors.join('\\n'));
}
console.log('All base_hours are valid numbers');
process.exit(0);
" 2>/dev/null; then
    log_success "3.2: All base_hours are valid numbers"
else
    log_failure "3.2: Some base_hours are invalid"
fi

# ==============================================================================
# TEST SECTION: BA Processes Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: BA Processes Structure"
echo "========================================"

# Test 4.1: Verify BA processes have required fields
log_info "Verifying BA processes structure..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/ba_processes.yaml', 'utf8');
const parsed = yaml.parse(content);
const requiredFields = ['id', 'name', 'description'];
let errors = [];
parsed.ba_processes.forEach((process, index) => {
  requiredFields.forEach(field => {
    if (!process[field]) {
      errors.push(\`Process at index \${index} missing field: \${field}\`);
    }
  });
});
if (errors.length > 0) {
  throw new Error(errors.join('\\n'));
}
console.log('All', parsed.ba_processes.length, 'BA processes have required fields');
process.exit(0);
" 2>/dev/null; then
    log_success "4.1: All BA processes have required fields"
else
    log_failure "4.1: Some BA processes are missing required fields"
fi

# ==============================================================================
# TEST SECTION: Coefficients Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Coefficients Structure"
echo "========================================"

# Test 5.1: Verify coefficients have required fields
log_info "Verifying coefficients structure..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/coefficients.yaml', 'utf8');
const parsed = yaml.parse(content);
const requiredFields = ['id', 'name', 'description', 'multiplier'];
let errors = [];
parsed.coefficients.forEach((coef, index) => {
  requiredFields.forEach(field => {
    if (!coef[field]) {
      errors.push(\`Coefficient at index \${index} missing field: \${field}\`);
    }
  });
});
if (errors.length > 0) {
  throw new Error(errors.join('\\n'));
}
console.log('All', parsed.coefficients.length, 'coefficients have required fields');
process.exit(0);
" 2>/dev/null; then
    log_success "5.1: All coefficients have required fields"
else
    log_failure "5.1: Some coefficients are missing required fields"
fi

# Test 5.2: Verify multipliers are numeric and positive
log_info "Verifying multipliers are valid..."
if node -e "
const yaml = require('yaml');
const fs = require('fs');
const content = fs.readFileSync('$CATALOG_DIR/coefficients.yaml', 'utf8');
const parsed = yaml.parse(content);
let errors = [];
parsed.coefficients.forEach((coef, index) => {
  if (typeof coef.multiplier !== 'number' || coef.multiplier <= 0) {
    errors.push(\`Coefficient at index \${index} has invalid multiplier: \${coef.multiplier}\`);
  }
});
if (errors.length > 0) {
  throw new Error(errors.join('\\n'));
}
console.log('All multipliers are valid positive numbers');
process.exit(0);
" 2>/dev/null; then
    log_success "5.2: All multipliers are valid positive numbers"
else
    log_failure "5.2: Some multipliers are invalid"
fi

# ==============================================================================
# TEST SECTION: Catalog Loaders
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Catalog Loaders"
echo "========================================"

# Test 6.1: Verify loader files exist
run_test "6.1: atomic-works.loader.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/catalogs/loaders/atomic-works.loader.ts' ]"
run_test "6.2: ba-processes.loader.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/catalogs/loaders/ba-processes.loader.ts' ]"
run_test "6.3: coefficients.loader.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/catalogs/loaders/coefficients.loader.ts' ]"

# Test 6.4: Run catalog loader unit tests
log_info "Running catalog service tests..."
if cd "$PROJECT_ROOT" && npm run test -- --testPathPattern="catalogs" --passWithNoTests --silent 2>/dev/null; then
    log_success "6.4: Catalog tests pass"
else
    log_failure "6.4: Catalog tests failed"
fi

# ==============================================================================
# TEST SECTION: Catalog Service
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Catalog Service"
echo "========================================"

run_test "7.1: catalogs.service.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/catalogs/catalogs.service.ts' ]"
run_test "7.2: catalogs.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/catalogs/catalogs.module.ts' ]"

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
    echo -e "${GREEN}All Phase 3 tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
