## Why

The current estimation pipeline takes 75-255 seconds for 5 requirements, with the decomposition and estimation nodes being the primary bottlenecks. Sequential RAG queries and lack of caching create unnecessary API calls and latency. This optimization will reduce estimation time to 20-60 seconds, improving user experience and reducing API costs.

## What Changes

- **Parallel Processing**: Convert sequential RAG+LLM calls in decomposition node to concurrent `Promise.all()` execution
- **RAG Result Caching**: Implement in-memory cache with 1-hour TTL for similarity search results
- **Request Timeouts**: Add 60-second timeouts to LLM provider to prevent indefinite hangs
- **Batch LLM Calls**: Group similar requirements for single LLM processing (Phase 3)
- **Progress Streaming**: Real-time progress updates during estimation (Phase 3)

## Capabilities

### New Capabilities

- `rag-caching`: In-memory cache for RAG similarity search results with TTL-based invalidation
- `parallel-decomposition`: Concurrent processing of requirements in decomposition node
- `llm-timeouts`: Configurable timeout settings for LLM API calls

### Modified Capabilities

- `decomposition-node`: Requirements will be processed in parallel instead of sequentially (behavior change)
- `estimation-node`: Will benefit from cached RAG results when decomposing similar requirements

## Impact

**Affected Files:**

- [`apps/api/src/agents/nodes/decomposition.node.ts`](../../../apps/api/src/agents/nodes/decomposition.node.ts) - Parallel processing
- [`apps/api/src/agents/nodes/estimation.node.ts`](../../../apps/api/src/agents/nodes/estimation.node.ts) - Cache integration
- [`apps/api/src/ai/providers/langchain-llm.provider.ts`](../../../apps/api/src/ai/providers/langchain-llm.provider.ts) - Timeout configuration
- [`apps/api/src/rag/rag.service.ts`](../../../apps/api/src/rag/rag.service.ts) - Caching layer

**Performance Impact:**
| Metric | Before | After Phase 2 |
|--------|--------|---------------|
| 5 requirements | 75-255s | 20-60s |
| 10 requirements | 150-510s | 30-100s |

**Dependencies:** No new external dependencies required
