#!/bin/bash
# ==============================================================================
# Phase 2: RAG Infrastructure - Embeddings, Vector Store, RAG Service Tests
# ==============================================================================
# This script tests the RAG (Retrieval-Augmented Generation) infrastructure
# including embeddings provider, MongoDB vector store, and RAG service.
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
# TEST SECTION: AI Module Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: AI Module Structure"
echo "========================================"

# Test 1.1: AI module exists
run_test "1.1: ai/ai.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/ai/ai.module.ts' ]"

# Test 1.2: LLM provider interface exists
run_test "1.2: llm-provider.interface.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/ai/interfaces/llm-provider.interface.ts' ]"

# Test 1.3: Embedding provider interface exists
run_test "1.3: embedding-provider.interface.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/ai/interfaces/embedding-provider.interface.ts' ]"

# Test 1.4: LangChain LLM provider exists
run_test "1.4: langchain-llm.provider.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/ai/providers/langchain-llm.provider.ts' ]"

# Test 1.5: LangChain embedding provider exists
run_test "1.5: langchain-embedding.provider.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/ai/providers/langchain-embedding.provider.ts' ]"

# Test 1.6: Langfuse service exists
run_test "1.6: langfuse.service.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/ai/langfuse/langfuse.service.ts' ]"

# ==============================================================================
# TEST SECTION: RAG Module Structure
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: RAG Module Structure"
echo "========================================"

# Test 2.1: RAG module exists
run_test "2.1: rag/rag.module.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/rag/rag.module.ts' ]"

# Test 2.2: RAG service exists
run_test "2.2: rag.service.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/rag/rag.service.ts' ]"

# Test 2.3: RAG service spec exists
run_test "2.3: rag.service.spec.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/rag/rag.service.spec.ts' ]"

# Test 2.4: Retrieved document interface exists
run_test "2.4: retrieved-document.interface.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/rag/interfaces/retrieved-document.interface.ts' ]"

# Test 2.5: MongoDB store exists
run_test "2.5: mongodb.store.ts exists" "[ -f '$PROJECT_ROOT/apps/api/src/rag/vectorstore/mongodb.store.ts' ]"

# ==============================================================================
# TEST SECTION: Jest Unit Tests for AI Providers
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Jest Unit Tests for AI Providers"
echo "========================================"

# Test 3.1: Run LLM provider tests
log_info "Running LLM provider unit tests..."
if cd "$PROJECT_ROOT" && npm run test -- --testPathPattern="langchain-llm.provider" --passWithNoTests --silent 2>/dev/null; then
    log_success "3.1: LLM provider unit tests pass"
else
    log_failure "3.1: LLM provider unit tests failed"
fi

# Test 3.2: Run embedding provider tests
log_info "Running embedding provider unit tests..."
if cd "$PROJECT_ROOT" && npm run test -- --testPathPattern="langchain-embedding.provider" --passWithNoTests --silent 2>/dev/null; then
    log_success "3.2: Embedding provider unit tests pass"
else
    log_failure "3.2: Embedding provider unit tests failed"
fi

# Test 3.3: Run RAG service tests
log_info "Running RAG service unit tests..."
if cd "$PROJECT_ROOT" && npm run test -- --testPathPattern="rag.service" --passWithNoTests --silent 2>/dev/null; then
    log_success "3.3: RAG service unit tests pass"
else
    log_failure "3.3: RAG service unit tests failed"
fi

# ==============================================================================
# TEST SECTION: MongoDB Connection (requires .env)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: MongoDB Connection Test"
echo "========================================"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_warning ".env file not found, skipping MongoDB connection tests"
else
    # Test 4.1: MongoDB URI is configured
    if grep -q "MONGODB_URI=mongodb" "$PROJECT_ROOT/.env"; then
        log_success "4.1: MongoDB URI is configured"
    else
        log_failure "4.1: MongoDB URI is not configured"
    fi

    # Test 4.2: Test MongoDB connection using Node.js
    log_info "Testing MongoDB connection..."
    
    cat > /tmp/test-mongodb.js << 'EOF'
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: process.argv[2] });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  
  try {
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });
    console.log('MongoDB connection successful');
    process.exit(0);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();
EOF

    if node /tmp/test-mongodb.js "$PROJECT_ROOT/.env" 2>/dev/null; then
        log_success "4.2: MongoDB connection successful"
    else
        log_failure "4.2: MongoDB connection failed"
    fi
    
    rm -f /tmp/test-mongodb.js
fi

# ==============================================================================
# TEST SECTION: ZhipuAI API Connection (requires .env)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: ZhipuAI API Connection Test"
echo "========================================"

if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_warning ".env file not found, skipping ZhipuAI API tests"
else
    # Test 5.1: ZhipuAI API key is configured
    if grep -q "ZHIPUAI_API_KEY=." "$PROJECT_ROOT/.env" && ! grep -q "your_zhipuai_api_key" "$PROJECT_ROOT/.env"; then
        log_success "5.1: ZhipuAI API key is configured"
    else
        log_failure "5.1: ZhipuAI API key is not configured"
    fi

    # Test 5.2: Test ZhipuAI API connection
    log_info "Testing ZhipuAI API connection..."
    
    cat > /tmp/test-zhipuai.js << 'EOF'
const https = require('https');
require('dotenv').config({ path: process.argv[2] });

const apiKey = process.env.ZHIPUAI_API_KEY;
const baseUrl = process.env.ZHIPUAI_BASE_URL || 'https://api.z.ai/api/paas/v4';

if (!apiKey || apiKey === 'your_zhipuai_api_key') {
  console.error('ZHIPUAI_API_KEY not set or using placeholder');
  process.exit(1);
}

// Simple test - just check if we can reach the API
const url = new URL('/models', baseUrl);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 401) {
      // 401 means API is reachable, just auth issue
      console.log('ZhipuAI API is reachable');
      process.exit(0);
    } else {
      console.error('API returned status:', res.statusCode);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Connection failed:', error.message);
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.error('Request timed out');
  req.destroy();
  process.exit(1);
});

req.end();
EOF

    if node /tmp/test-zhipuai.js "$PROJECT_ROOT/.env" 2>/dev/null; then
        log_success "5.2: ZhipuAI API is reachable"
    else
        log_failure "5.2: ZhipuAI API is not reachable"
    fi
    
    rm -f /tmp/test-zhipuai.js
fi

# ==============================================================================
# TEST SECTION: Embedding Generation (requires API access)
# ==============================================================================
echo ""
echo "========================================"
echo "TEST SECTION: Embedding Generation Test"
echo "========================================"

if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_warning ".env file not found, skipping embedding generation tests"
else
    # Test 6.1: Test embedding generation
    log_info "Testing embedding generation..."
    
    cat > /tmp/test-embedding.js << 'EOF'
require('dotenv').config({ path: process.argv[2] });

async function testEmbedding() {
  const { OpenAIEmbeddings } = require('@langchain/openai');
  
  const embeddings = new OpenAIEmbeddings({
    modelName: process.env.EMBEDDING_MODEL || 'embedding-3',
    openAIApiKey: process.env.ZHIPUAI_API_KEY,
    configuration: {
      baseURL: process.env.ZHIPUAI_BASE_URL || 'https://api.z.ai/api/paas/v4',
    },
  });
  
  try {
    const result = await embeddings.embedQuery('test query');
    if (result && result.length > 0) {
      console.log('Embedding generated successfully, dimension:', result.length);
      process.exit(0);
    } else {
      console.error('Empty embedding result');
      process.exit(1);
    }
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    process.exit(1);
  }
}

testEmbedding();
EOF

    if node /tmp/test-embedding.js "$PROJECT_ROOT/.env" 2>/dev/null; then
        log_success "6.1: Embedding generation successful"
    else
        log_failure "6.1: Embedding generation failed"
    fi
    
    rm -f /tmp/test-embedding.js
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
    echo -e "${GREEN}All Phase 2 tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
