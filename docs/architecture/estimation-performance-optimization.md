# Estimation Performance Optimization

## Current State Analysis

### LLM Provider Configuration

| Setting       | Value                           |
| ------------- | ------------------------------- |
| Provider      | ZhipuAI (OpenAI-compatible API) |
| Base URL      | `https://api.z.ai/api/paas/v4`  |
| Default Model | `glm-4.7-flash`                 |
| Temperature   | `0.1`                           |

### Estimation Graph Flow

```
START → Validation → Extraction → Decomposition → Estimation → Reporting → END
```

### Performance Bottlenecks

| Node              | LLM Calls   | RAG Calls  | Estimated Time  |
| ----------------- | ----------- | ---------- | --------------- |
| Validation        | 1           | 0          | ~5-15s          |
| Extraction        | 1           | 0          | ~10-30s         |
| **Decomposition** | N reqs × 1  | N reqs × 1 | **~30-120s** ⚠️ |
| **Estimation**    | N works × 1 | 0          | **~30-90s** ⚠️  |
| Reporting         | 0           | 0          | <1s             |

**Total estimated time for 5 requirements: 75-255 seconds**

---

## Identified Bottlenecks

### 1. Sequential Processing in Decomposition Node

**Location**: [`apps/api/src/agents/nodes/decomposition.node.ts:58-74`](../../apps/api/src/agents/nodes/decomposition.node.ts)

```typescript
// Current implementation - SEQUENTIAL
for (const requirement of state.requirements) {
  // RAG query - ~2-5s per requirement
  const relevantWorks = await this.queryRelevantAtomicWorks(
    requirement.description,
  );

  // LLM call - ~10-30s per requirement
  const mappings = await this.mapRequirementToAtomicWorks(
    requirement,
    relevantWorks,
    state,
  );

  atomicWorksMappings.push(...mappings);
}
```

**Impact**: With 5 requirements, this creates 10 sequential API calls (5 RAG + 5 LLM), taking 60-175 seconds.

### 2. No Caching Mechanism

RAG queries for similar requirements are not cached, leading to redundant API calls for similar content.

### 3. No Request Timeout Configuration

LLM and RAG calls lack explicit timeout settings, which can cause indefinite hangs.

### 4. Single Large Prompts

Each requirement is processed with a full prompt, without batching or prompt optimization.

---

## Optimization Recommendations

### Priority 1: Parallelize Decomposition (High Impact)

**Estimated improvement**: 60-80% reduction in decomposition time

```typescript
// Optimized implementation - PARALLEL
const decompositionPromises = state.requirements.map(async (requirement) => {
  const relevantWorks = await this.queryRelevantAtomicWorks(
    requirement.description,
  );

  return this.mapRequirementToAtomicWorks(requirement, relevantWorks, state);
});

const allMappings = await Promise.all(decompositionPromises);
const atomicWorksMappings = allMappings.flat();
```

**Implementation notes**:

- Use `Promise.all()` for concurrent processing
- Consider `Promise.allSettled()` for partial failure handling
- Add concurrency limit if API rate limits are a concern

### Priority 2: Implement RAG Result Caching (Medium Impact)

**Estimated improvement**: 20-40% reduction for similar requirements

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
  this.ragCache.set(cacheKey, { query: requirementDescription, results, timestamp: Date.now() });

  return results;
}
```

### Priority 3: Add Request Timeouts (Stability)

```typescript
// In langchain-llm.provider.ts
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

### Priority 4: Batch LLM Calls (Medium Impact)

For requirements with similar characteristics, batch them into a single LLM call:

```typescript
// Group requirements by type/complexity
const groupedRequirements = this.groupByComplexity(state.requirements);

// Process each group with a single LLM call
const batchResults = await Promise.all(
  groupedRequirements.map((group) =>
    this.batchMapRequirementsToAtomicWorks(group, state),
  ),
);
```

### Priority 5: Streaming Progress Updates

Add progress callbacks to provide real-time feedback:

```typescript
interface ProgressCallback {
  (progress: {
    step: string;
    current: number;
    total: number;
    message: string;
  }): void;
}

// In decomposition node
for (let i = 0; i < requirements.length; i++) {
  progressCallback?.({
    step: "decomposition",
    current: i + 1,
    total: requirements.length,
    message: `Processing requirement ${requirements[i].id}`,
  });
  // ... process requirement
}
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)

- [ ] Add request timeouts to LLM provider
- [ ] Implement parallel decomposition with `Promise.all()`
- [ ] Add progress logging for each step

### Phase 2: Caching (2-3 days)

- [ ] Implement in-memory RAG cache
- [ ] Add cache invalidation strategy
- [ ] Consider Redis for distributed caching

### Phase 3: Advanced Optimizations (1 week)

- [ ] Implement batch LLM processing
- [ ] Add streaming progress updates
- [ ] Optimize prompt sizes
- [ ] Add circuit breaker for API calls

---

## Monitoring Recommendations

Add metrics to track:

1. **Per-node execution time**

   ```typescript
   logger.log(`Node ${nodeName} completed in ${duration}ms`);
   ```

2. **LLM API latency**
   - Track min/max/avg response times
   - Monitor rate limit errors

3. **RAG query performance**
   - Track similarity search duration
   - Monitor cache hit/miss ratio

4. **End-to-end estimation time**
   - Track total pipeline duration
   - Break down by number of requirements

---

## Expected Results

| Metric            | Before   | After Phase 1 | After Phase 2 |
| ----------------- | -------- | ------------- | ------------- |
| 5 requirements    | 75-255s  | 30-90s        | 20-60s        |
| 10 requirements   | 150-510s | 50-150s       | 30-100s       |
| Cache hit benefit | N/A      | N/A           | 50-80% faster |

---

## Related Files

- [`apps/api/src/agents/nodes/decomposition.node.ts`](../../apps/api/src/agents/nodes/decomposition.node.ts)
- [`apps/api/src/agents/nodes/estimation.node.ts`](../../apps/api/src/agents/nodes/estimation.node.ts)
- [`apps/api/src/ai/providers/langchain-llm.provider.ts`](../../apps/api/src/ai/providers/langchain-llm.provider.ts)
- [`apps/api/src/rag/rag.service.ts`](../../apps/api/src/rag/rag.service.ts)
