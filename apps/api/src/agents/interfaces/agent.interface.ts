import { AgentType } from "../../prompts/interfaces/prompt-context.interface";
import {
  EstimationState,
  NodeConfig,
  StateUpdate,
} from "./agent-state.interface";

/**
 * Interface for a LangGraph agent node
 * Each node in the pipeline implements this interface
 */
export interface AgentNode {
  /** Node name identifier */
  name: string;

  /** Agent type for prompt selection */
  agentType: AgentType;

  /** Execute the node's logic */
  execute(state: EstimationState, config?: NodeConfig): Promise<StateUpdate>;
}

/**
 * Interface for agent node dependencies
 * Used for dependency injection in nodes
 */
export interface AgentDependencies {
  /** Prompts service for template management */
  promptsService: import("../../prompts/prompts.service").PromptsService;

  /** LLM provider for AI operations */
  llmProvider: import("../../ai/interfaces/llm-provider.interface").LLMProvider;

  /** RAG service for similarity search */
  ragService?: import("../../rag/rag.service").RagService;

  /** Langfuse service for tracing */
  langfuseService?: import("../../ai/langfuse/langfuse.service").LangfuseService;

  /** Catalogs service for accessing BA processes and atomic works */
  catalogsService?: import("../../catalogs/catalogs.service").CatalogsService;
}

/**
 * Interface for LLM response parsing configuration
 */
export interface ParseConfig {
  /** Whether to attempt JSON extraction from response */
  extractJson?: boolean;

  /** JSON schema for validation (optional) */
  jsonSchema?: Record<string, unknown>;

  /** Default value if parsing fails */
  defaultValue?: unknown;

  /** Whether to throw on parse error */
  throwOnerror?: boolean;
}

/**
 * Interface for node execution context
 * Provides utilities and services to nodes during execution
 */
export interface NodeExecutionContext {
  /** Node name for logging */
  nodeName: string;

  /** Trace ID for Langfuse */
  traceId?: string;

  /** Start time for duration tracking */
  startTime: number;

  /** Log function */
  log: (message: string, ...args: unknown[]) => void;

  /** Error log function */
  logError: (message: string, error: Error) => void;
}

/**
 * Factory function type for creating agent nodes
 */
export type AgentNodeFactory = (dependencies: AgentDependencies) => AgentNode;
