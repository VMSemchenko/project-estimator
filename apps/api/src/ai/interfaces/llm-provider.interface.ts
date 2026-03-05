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
}
