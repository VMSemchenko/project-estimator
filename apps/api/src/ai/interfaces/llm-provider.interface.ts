import { ChatOpenAI } from "@langchain/openai";

/**
 * Interface for LLM provider configuration
 */
export interface LLMProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API */
  baseUrl: string;
  /** Model name to use */
  modelName: string;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Context for LLM operations
 */
export interface LLMOperationContext {
  /** Operation type (invoke, stream, embed, etc.) */
  operation?: string;
  /** Node where the operation is being performed */
  node?: string;
}

/**
 * Interface for LLM provider
 * Abstracts the LLM implementation details
 */
export interface LLMProvider {
  /**
   * Get the underlying LangChain chat model instance
   */
  getChatModel(): ChatOpenAI;

  /**
   * Get the model name being used
   */
  getModelName(): string;

  /**
   * Get the current provider name (e.g., ZhipuAI, Groq)
   */
  getCurrentProviderName(): string;

  /**
   * Execute an LLM operation with retry logic and exponential backoff
   * @param operation The operation to execute (e.g., chatModel.invoke)
   * @param context Optional context for error reporting
   * @returns The result of the operation
   */
  executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: LLMOperationContext,
  ): Promise<T>;
}
