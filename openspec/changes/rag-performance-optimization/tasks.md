## 1. LLM Timeouts (Quick Win)

- [x] 1.1 Add LLM_TIMEOUT_MS environment variable to configuration
- [x] 1.2 Update langchain-llm.provider.ts to include timeout in ChatOpenAI configuration
- [x] 1.3 Add timeout to both HTTP client configuration and LangChain level
- [x] 1.4 Add unit tests for timeout error handling

## 2. RAG Caching

- [x] 2.1 Create CacheEntry interface in rag.service.ts
- [x] 2.2 Add private ragCache Map and CACHE_TTL constant
- [x] 2.3 Implement generateCacheKey() method with text normalization
- [x] 2.4 Implement queryWithCache() wrapper method
- [x] 2.5 Add cache statistics tracking (hits, misses, size)
- [x] 2.6 Add clearCache() method for manual invalidation
- [x] 2.7 Add unit tests for cache hit/miss scenarios
- [x] 2.8 Add unit tests for cache expiration

## 3. Parallel Decomposition

- [x] 3.1 Refactor decomposition.node.ts to use Promise.all() for requirements
- [x] 3.2 Implement partial failure handling with Promise.allSettled()
- [x] 3.3 Aggregate results from parallel processing
- [x] 3.4 Add ENABLE_PARALLEL_DECOMPOSITION feature flag
- [x] 3.5 Add progress callback support for parallel processing
- [x] 3.6 Add unit tests for parallel processing
- [x] 3.7 Add unit tests for partial failure scenarios

## 4. Concurrency Control (Optional)

- [x] 4.1 Add MAX_CONCURRENCY environment variable
- [x] 4.2 Implement concurrency limiting with p-limit or custom semaphore
- [x] 4.3 Add unit tests for concurrency limit

## 5. Monitoring & Observability

- [x] 5.1 Add per-node execution time logging
- [x] 5.2 Add RAG cache hit/miss metrics
- [x] 5.3 Add LLM API latency tracking
- [x] 5.4 Update observability service with new metrics

## 6. Integration Testing

- [ ] 6.1 Run full estimation with 5 requirements and measure time
- [ ] 6.2 Verify cache hit behavior on repeated similar requirements
- [ ] 6.3 Test timeout handling with slow responses
- [ ] 6.4 Verify parallel processing produces same results as sequential

## 7. Documentation

- [x] 7.1 Update README.md with new environment variables
- [x] 7.2 Update .env.example with LLM_TIMEOUT_MS, ENABLE_PARALLEL_DECOMPOSITION
- [ ] 7.3 Archive the plan from plans/rag-performance-optimization.md
