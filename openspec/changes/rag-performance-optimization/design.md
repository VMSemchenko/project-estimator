## Context

The BA Work Estimator uses a multi-agent LangGraph pipeline with RAG (Retrieval-Augmented Generation) for catalog lookups. The current implementation processes requirements sequentially in the decomposition node, creating significant latency:

**Current Flow (Sequential):**

```
For each requirement:
  1. RAG query (~2-5s)
  2. LLM call (~10-30s)
Total: N × (RAG + LLM) = 5 × 35s = 175s for decomposition alone
```

**Target Flow (Parallel):**

```
Promise.all([
  RAG + LLM for req 1,
  RAG + LLM for req 2,
  ...
])
Total: max(all times) = ~35s for decomposition
```

**Constraints:**

- Must maintain same output quality and accuracy
- Cannot break existing API contracts
- Should be backward compatible with existing configurations
- ZhipuAI API rate limits may require concurrency control

## Goals / Non-Goals

**Goals:**

- Reduce estimation time from 75-255s to 20-60s for 5 requirements
- Implement in-memory RAG caching with 60-80% hit rate for similar requirements
- Add request timeouts to prevent indefinite hangs
- Maintain estimation accuracy and quality

**Non-Goals:**

- Distributed caching (Redis) - deferred to future iteration
- Prompt optimization - out of scope
- LLM model changes - out of scope
- API rate limit handling beyond basic concurrency control

## Decisions

### Decision 1: In-Memory Cache vs Redis

**Choice:** In-memory Map-based cache

**Rationale:**

- Simpler implementation, no new dependencies
- Sufficient for single-instance deployments
- Lower latency than Redis for local access
- Can migrate to Redis later if needed

**Alternatives Considered:**

- Redis: Overkill for current deployment model, adds operational complexity
- No caching: Would miss 20-40% performance improvement opportunity

### Decision 2: Cache Key Strategy

**Choice:** Normalized text hash (lowercase, trimmed, whitespace normalized)

**Rationale:**

- Simple to implement
- Catches semantically similar queries
- No external dependencies

**Implementation:**

```typescript
private generateCacheKey(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}
```

### Decision 3: Parallelism Strategy

**Choice:** `Promise.all()` with optional concurrency limit

**Rationale:**

- Native JavaScript, no libraries needed
- `Promise.allSettled()` available for partial failure handling
- Can add p-limit later if rate limiting becomes issue

**Alternatives Considered:**

- Sequential with progress: Defeats performance goal
- Worker threads: Overkill for I/O-bound operations
- External queue: Adds complexity, not needed for current scale

### Decision 4: Timeout Configuration

**Choice:** 60-second timeout at both OpenAI client and LangChain levels

**Rationale:**

- Matches typical LLM response time + buffer
- Prevents indefinite hangs
- Configurable via environment variable for tuning

## Risks / Trade-offs

| Risk                                            | Mitigation                                            |
| ----------------------------------------------- | ----------------------------------------------------- |
| API rate limits from parallel requests          | Add configurable concurrency limit (default: 5)       |
| Cache memory growth                             | TTL-based expiration (1 hour), LRU eviction if needed |
| Cache stale results                             | Short TTL (1h), manual invalidation via CLI           |
| Partial failures in parallel processing         | Use `Promise.allSettled()` for graceful degradation   |
| Timeout too aggressive for complex requirements | Make timeout configurable via env var                 |

## Migration Plan

**Phase 1: Low-Risk Changes (Can deploy immediately)**

1. Add timeout configuration to LLM provider
2. Add progress logging

**Phase 2: Core Optimizations (Requires testing)**

1. Implement RAG caching in `rag.service.ts`
2. Convert decomposition to parallel processing
3. Integration tests for parallel flow

**Rollback Strategy:**

- Feature flags for parallel processing and caching
- Environment variable `ENABLE_PARALLEL_DECOMPOSITION=false` to revert to sequential
- Environment variable `ENABLE_RAG_CACHE=false` to disable caching

## Open Questions

1. **Concurrency limit value:** Start with 5 concurrent requests. May need tuning based on ZhipuAI rate limits.
2. **Cache size limits:** Current implementation unbounded. May need LRU eviction if memory becomes concern.
3. **Cache persistence:** Currently in-memory, lost on restart. Acceptable for now, Redis for future.
