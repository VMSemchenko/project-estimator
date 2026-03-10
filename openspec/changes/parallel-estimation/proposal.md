## Why

The estimation node currently processes atomic works sequentially, which is a bottleneck for projects with many atomic works. Each atomic work requires a separate LLM call to calculate PERT estimates, and these calls are executed one after another. For projects with 50+ atomic works, this can add significant latency to the estimation pipeline. Adding parallel processing capabilities similar to the decomposition node will reduce estimation time and improve overall pipeline performance.

## What Changes

- **Parallel Processing**: Convert sequential PERT estimate calculations in estimation node to concurrent `Promise.all()` execution with configurable concurrency limits
- **Progress Callbacks**: Add progress callback support for real-time progress updates during estimation
- **Configuration Options**: Add configuration flags for enabling parallel estimation and setting maximum concurrency
- **Error Handling**: Implement partial failure handling to continue processing even if individual atomic work estimations fail

## Capabilities

### New Capabilities

- `parallel-estimation`: Concurrent processing of atomic works in estimation node with configurable concurrency limits
- `estimation-progress`: Real-time progress callbacks during estimation processing

### Modified Capabilities

- `estimation-node`: Atomic works will be processed in parallel instead of sequentially (behavior change, configurable)
- `estimation-graph`: Will support progress streaming for estimation phase

## Impact

**Affected Files:**

- [`apps/api/src/agents/nodes/estimation.node.ts`](../../../apps/api/src/agents/nodes/estimation.node.ts) - Parallel processing implementation
- [`apps/api/src/agents/graph/estimation.graph.ts`](../../../apps/api/src/agents/graph/estimation.graph.ts) - Progress callback integration
- [`apps/api/src/config/configuration.ts`](../../../apps/api/src/config/configuration.ts) - Configuration options for parallel estimation
- [`apps/api/src/agents/nodes/estimation.node.spec.ts`](../../../apps/api/src/agents/nodes/estimation.node.spec.ts) - Test updates for parallel processing

**Performance Impact:**
| Metric | Before | After |
|--------|--------|-------|
| 10 atomic works | ~60-120s | ~15-30s |
| 50 atomic works | ~300-600s | ~60-120s |
| 100 atomic works | ~600-1200s | ~120-240s |

_Note: Actual performance gains depend on LLM API response times and configured concurrency limits._

**Dependencies:** No new external dependencies required
