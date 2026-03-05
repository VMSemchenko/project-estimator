import { Embeddings } from "@langchain/core/embeddings";

/**
 * Interface for embedding provider configuration
 */
export interface EmbeddingProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API */
  baseUrl: string;
  /** Model name to use */
  modelName: string;
  /** Batch size for embedding requests */
  batchSize?: number;
}

/**
 * Interface for embedding provider
 * Abstracts the embedding implementation details
 */
export interface EmbeddingProvider {
  /**
   * Get the underlying LangChain embeddings instance
   */
  getEmbeddings(): Embeddings;

  /**
   * Get the model name being used
   */
  getModelName(): string;

  /**
   * Embed a single text
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Embed multiple texts
   */
  embedTexts(texts: string[]): Promise<number[][]>;
}
