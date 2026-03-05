import { LangfuseTraceClient, LangfuseSpanClient } from 'langfuse-core';

/**
 * Context object for tracking estimation traces
 */
export interface TraceContext {
  /** Unique identifier for the estimation */
  estimationId: string;
  /** Langfuse trace object */
  trace: LangfuseTraceClient | null;
  /** Input folder being processed */
  inputFolder: string;
  /** Start time of the estimation */
  startTime: Date;
  /** Map of agent node names to their spans */
  spans: Map<string, LangfuseSpanClient>;
  /** Metadata associated with the trace */
  metadata: Record<string, unknown>;
}

/**
 * Configuration for creating a trace context
 */
export interface TraceContextConfig {
  estimationId: string;
  inputFolder: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for creating an agent span
 */
export interface AgentSpanConfig {
  agentName: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Token usage information for LLM calls
 */
export interface TokenUsage {
  /** Number of tokens in the prompt */
  promptTokens: number;
  /** Number of tokens in the completion */
  completionTokens: number;
  /** Total tokens (prompt + completion) */
  totalTokens: number;
}

/**
 * Metrics for a single node execution
 */
export interface NodeMetric {
  /** Name of the agent node */
  nodeName: string;
  /** Duration of execution in milliseconds */
  duration: number;
  /** Number of tokens used (if LLM was called) */
  tokens: number;
  /** Whether the node execution was successful */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Complete metrics for an estimation run
 */
export interface EstimationMetrics {
  /** Unique identifier for the estimation */
  estimationId: string;
  /** Total tokens used across all nodes */
  totalTokens: number;
  /** Total prompt tokens */
  promptTokens: number;
  /** Total completion tokens */
  completionTokens: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Metrics for each node */
  nodeMetrics: NodeMetric[];
  /** Timestamp when estimation started */
  startedAt: Date;
  /** Timestamp when estimation completed */
  completedAt?: Date;
  /** Whether the estimation was successful */
  success: boolean;
  /** Error message if estimation failed */
  error?: string;
}

/**
 * Time range for aggregate metrics queries
 */
export interface TimeRange {
  /** Start of the time range */
  start: Date;
  /** End of the time range */
  end: Date;
}

/**
 * Aggregate metrics across multiple estimations
 */
export interface AggregateMetrics {
  /** Total number of estimations */
  totalEstimations: number;
  /** Number of successful estimations */
  successfulEstimations: number;
  /** Number of failed estimations */
  failedEstimations: number;
  /** Average duration in milliseconds */
  averageDuration: number;
  /** Total tokens used */
  totalTokens: number;
  /** Average tokens per estimation */
  averageTokens: number;
  /** Average node metrics by node name */
  averageNodeMetrics: Record<string, {
    averageDuration: number;
    averageTokens: number;
    successRate: number;
  }>;
  /** Time range of the metrics */
  timeRange: TimeRange;
}

/**
 * LLM span data for tracking
 */
export interface LLMSpanData {
  /** Name of the LLM call */
  name: string;
  /** Input prompt */
  input: string;
  /** Output response */
  output: string;
  /** Token usage */
  tokenUsage?: TokenUsage;
  /** Duration in milliseconds */
  duration?: number;
  /** Model used */
  model?: string;
}

/**
 * Error data for tracking
 */
export interface ErrorData {
  /** Error message */
  message: string;
  /** Stack trace */
  stack?: string;
  /** Node where error occurred */
  node?: string;
  /** Timestamp */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
