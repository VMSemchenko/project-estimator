# Plan: RAG Performance Optimization

## Overview

Optimize the RAG pipeline and agent nodes to reduce estimation time from 75-255 seconds to 20-60 seconds for 5 requirements. Based on the analysis in [`docs/architecture/estimation-performance-optimization.md`](../docs/architecture/estimation-performance-optimization.md).

## Current State

### Performance Bottlenecks

| Node              | LLM Calls   | RAG Calls  | Estimated Time  |
| ----------------- | ----------- | ---------- | --------------- |
| Validation        | 1           | 0          | ~5-15s          |
| Extraction        | 1           | 0          | ~10-30s         |
| **Decomposition** | N reqs × 1  | N reqs × 1 | **~30-120s** ⚠️ |
| **Estimation**    | N works × 1 | 0          | **~30-90s** ⚠️  |
| Reporting         | 0           | 0          | <1s             |

**Total for 5 requirements: 75-255 seconds**

### Key Issues

1. **Sequential RAG queries** in [`decomposition.node.ts`](../apps/api/src/agents/nodes/decomposition.node.ts)
2. **No caching** - redundant API calls for similar content
3. **No timeout configuration** - can cause indefinite hangs
4. **Single large prompts** - no batching optimization

---

## Implementation Tasks

### Phase 1: Quick Wins (1-2 days)

#### Task 1.1: Add Request Timeouts to LLM Provider

**File:** [`apps/api/src/ai/providers/langchain-llm.provider.ts`](../apps/api/src/ai/providers/langchain-llm.provider.ts)

```typescript
this.chatModel = new ChatOpenAI({
  modelName: config.modelName,
  openAIApiKey: config.apiKey,
  configuration: {
    baseURL: config.baseUrl,
    timeout: 60000, // 60 second timeout
  },
  temperature: config.temperature ?? 0.1,
  maxTokens: config.maxTokens,
  timeout: 60000, // LangChain timeout
});
```

#### Task 1.2: Parallelize Decomposition Node

**File:** [`apps/api/src/agents/nodes/decomposition.node.ts`](../apps/api/src/agents/nodes/decomposition.node.ts)

```typescript
// BEFORE: Sequential processing
for (const requirement of state.requirements) {
  const relevantWorks = await this.queryRelevantAtomicWorks(
    requirement.description,
  );
  const mappings = await this.mapRequirementToAtomicWorks(
    requirement,
    relevantWorks,
    state,
  );
  atomicWorksMappings.push(...mappings);
}

// AFTER: Parallel processing
const decompositionPromises = state.requirements.map(async (requirement) => {
  const relevantWorks = await this.queryRelevantAtomicWorks(
    requirement.description,
  );
  return this.mapRequirementToAtomicWorks(requirement, relevantWorks, state);
});

const allMappings = await Promise.all(decompositionPromises);
const atomicWorksMappings = allMappings.flat();
```

**Estimated improvement:** 60-80% reduction in decomposition time

#### Task 1.3: Add Progress Logging

Add progress callbacks to provide real-time feedback during estimation.

---

### Phase 2: Caching (2-3 days)

#### Task 2.1: Implement In-Memory RAG Cache

**File:** [`apps/api/src/rag/rag.service.ts`](../apps/api/src/rag/rag.service.ts)

```typescript
interface CacheEntry {
  query: string;
  results: RetrievedDocument[];
  timestamp: number;
}

private ragCache = new Map<string, CacheEntry>();
private readonly CACHE_TTL = 3600000; // 1 hour

private async queryRelevantAtomicWorksCached(
  requirementDescription: string,
): Promise<RetrievedDocument[]> {
  const cacheKey = this.generateCacheKey(requirementDescription);
  const cached = this.ragCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    this.logger.debug('RAG cache hit');
    return cached.results;
  }

  const results = await this.queryRelevantAtomicWorks(requirementDescription);
  this.ragCache.set(cacheKey, {
    query: requirementDescription,
    results,
    timestamp: Date.now()
  });

  return results;
}

private generateCacheKey(text: string): string {
  // Simple hash function for cache key
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}
```

**Estimated improvement:** 20-40% reduction for similar requirements

#### Task 2.2: Add Cache Invalidation Strategy

- TTL-based expiration (1 hour default)
- Manual cache clear via CLI command
- Cache stats endpoint for monitoring

#### Task 2.3: Consider Redis for Distributed Caching (Optional)

For production deployments with multiple instances.

---

### Phase 3: Advanced Optimizations (1 week)

#### Task 3.1: Batch LLM Calls

Group requirements by type/complexity and process with single LLM calls:

```typescript
const groupedRequirements = this.groupByComplexity(state.requirements);
const batchResults = await Promise.all(
  groupedRequirements.map((group) =>
    this.batchMapRequirementsToAtomicWorks(group, state),
  ),
);
```

#### Task 3.2: Add Streaming Progress Updates

```typescript
interface ProgressCallback {
  (progress: {
    step: string;
    current: number;
    total: number;
    message: string;
  }): void;
}
```

#### Task 3.3: Add Circuit Breaker for API Calls

Implement circuit breaker pattern to handle API failures gracefully.

#### Task 3.4: Optimize Prompt Sizes

Review and optimize prompt templates to reduce token usage.

---

## Monitoring

Add metrics to track:

1. **Per-node execution time**

   ```typescript
   logger.log(`Node ${nodeName} completed in ${duration}ms`);
   ```

2. **LLM API latency** - min/max/avg response times, rate limit errors

3. **RAG query performance** - similarity search duration, cache hit/miss ratio

4. **End-to-end estimation time** - total pipeline duration by requirement count

---

## Expected Results

| Metric            | Before   | After Phase 1 | After Phase 2 |
| ----------------- | -------- | ------------- | ------------- |
| 5 requirements    | 75-255s  | 30-90s        | 20-60s        |
| 10 requirements   | 150-510s | 50-150s       | 30-100s       |
| Cache hit benefit | N/A      | N/A           | 50-80% faster |

---

## Related Files

- [`apps/api/src/agents/nodes/decomposition.node.ts`](../apps/api/src/agents/nodes/decomposition.node.ts)
- [`apps/api/src/agents/nodes/estimation.node.ts`](../apps/api/src/agents/nodes/estimation.node.ts)
- [`apps/api/src/ai/providers/langchain-llm.provider.ts`](../apps/api/src/ai/providers/langchain-llm.provider.ts)
- [`apps/api/src/rag/rag.service.ts`](../apps/api/src/rag/rag.service.ts)
- [`docs/architecture/estimation-performance-optimization.md`](../docs/architecture/estimation-performance-optimization.md)
