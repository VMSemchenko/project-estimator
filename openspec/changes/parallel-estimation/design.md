## Context

The BA Work Estimator uses a multi-agent LangGraph pipeline with the estimation node calculating PERT estimates for each atomic work. The current implementation processes atomic works sequentially, creating significant latency for projects with many atomic works:

**Current Flow (Sequential):**

```
For each atomic work:
  1. Get base hours from catalog (~0.1s)
  2. Calculate PERT estimate using LLM (~10-30s)
Total: N × (base_hours + LLM) = 50 × 30s = 1500s for estimation alone
```

**Target Flow (Parallel):**

```
Promise.all([
  PERT estimate for work 1,
  PERT estimate for work 2,
  ...
])
Total: max(all times) = ~30s for estimation (with concurrency limit)
```

**Constraints:**

- Must maintain same output quality and accuracy
- Cannot break existing API contracts
- Should be backward compatible with existing configurations
- LLM API rate limits may require concurrency control
- Progress tracking should be maintained for user feedback

## Goals / Non-Goals

**Goals:**

- Reduce estimation time by 70-80% for projects with 50+ atomic works
- Implement configurable parallel processing with concurrency limits
- Add progress callback support for real-time progress updates
- Maintain estimation accuracy and quality
- Provide graceful degradation for partial failures

**Non-Goals:**

- Distributed processing (worker threads, external queues) - deferred to future iteration
- Batch LLM calls for multiple atomic works - out of scope
- LLM model changes - out of scope
- API rate limit handling beyond basic concurrency control

## Decisions

### Decision 1: Parallelism Strategy

**Choice:** `Promise.all()` with configurable concurrency limit and batch processing

**Rationale:**

- Native JavaScript, no libraries needed
- `Promise.allSettled()` available for partial failure handling
- Follows the same pattern as decomposition node for consistency
- Configurable concurrency allows tuning for API rate limits

**Alternatives Considered:**

- Sequential with progress: Defeats performance goal
- Worker threads: Overkill for I/O-bound operations
- External queue: Adds complexity, not needed for current scale

### Decision 2: Concurrency Limit

**Choice:** Default to 5 concurrent requests, configurable via environment variable

**Rationale:**

- Matches decomposition node configuration for consistency
- Balances performance with API rate limits
- Can be tuned based on LLM provider limits

**Implementation:**

```typescript
private readonly enableParallel: boolean;
private readonly maxConcurrency: number;

constructor(dependencies: AgentDependencies) {
  super(dependencies);
  const fullConfig = this.configService?.get<Config>("config");
  this.enableParallel =
    fullConfig?.performance?.enableParallelEstimation ?? true;
  this.maxConcurrency = fullConfig?.performance?.maxConcurrency ?? 5;
}
```

### Decision 3: Progress Callbacks

**Choice:** Add optional progress callback parameter to estimation node execute method

**Rationale:**

- Provides real-time feedback to users during long-running estimations
- Follows the same pattern as decomposition node
- Optional parameter maintains backward compatibility

**Implementation:**

```typescript
export type ProgressCallback = (
  current: number,
  total: number,
  workId: string,
) => void;

async execute(
  state: EstimationState,
  config?: NodeConfig,
  progressCallback?: ProgressCallback,
): Promise<StateUpdate>
```

### Decision 4: Error Handling

**Choice:** Use `Promise.allSettled()` for graceful degradation

**Rationale:**

- Allows partial results even if some atomic work estimations fail
- Provides better user experience than complete failure
- Failed estimations can be logged and retried if needed

**Implementation:**

```typescript
const results = await Promise.allSettled(
  atomicWorks.map((work) => processAtomicWork(work)),
);

const estimates = results
  .filter((result) => result.status === "fulfilled")
  .map((result) => (result as PromiseFulfilledResult<Estimate>).value);

const failures = results
  .filter((result) => result.status === "rejected")
  .map((result) => (result as PromiseRejectedResult).reason);
```

## Risks / Trade-offs

| Risk                                          | Mitigation                                         |
| --------------------------------------------- | -------------------------------------------------- |
| API rate limits from parallel requests        | Add configurable concurrency limit (default: 5)    |
| Memory pressure from concurrent LLM responses | Limit concurrency, monitor memory usage            |
| Partial failures reducing estimation quality  | Log failures, provide summary, allow retry         |
| Progress callback overhead                    | Optional parameter, minimal overhead when not used |
| Timeout too aggressive for complex works      | Make timeout configurable via env var              |

## Migration Plan

**Phase 1: Configuration and Infrastructure**

1. Add configuration options for parallel estimation
2. Add progress callback type and interface
3. Update configuration schema

**Phase 2: Core Implementation**

1. Implement parallel processing in estimation node
2. Add progress callback support
3. Implement error handling with `Promise.allSettled()`
4. Update tests for parallel processing

**Phase 3: Integration**

1. Update estimation graph to pass progress callbacks
2. Add progress streaming to CLI
3. Integration tests for parallel flow

**Rollback Strategy:**

- Feature flag for parallel processing
- Environment variable `ENABLE_PARALLEL_ESTIMATION=false` to revert to sequential
- Backward compatible with existing configurations

## Open Questions

1. **Concurrency limit value:** Start with 5 concurrent requests. May need tuning based on LLM provider rate limits.
2. **Progress callback integration:** How to integrate with existing progress tracking in CLI and API?
3. **Error reporting:** How to surface partial failures to users while maintaining good UX?
