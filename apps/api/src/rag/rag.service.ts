import { Injectable, Logger } from "@nestjs/common";
import { MongodbStore } from "./vectorstore/mongodb.store";
import { LangchainEmbeddingProvider } from "../ai/providers/langchain-embedding.provider";
import { LangfuseService } from "../ai/langfuse/langfuse.service";
import {
  RetrievedDocument,
  SimilaritySearchOptions,
  SimilaritySearchResult,
} from "./interfaces/retrieved-document.interface";

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Provides high-level RAG operations including similarity search
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly mongodbStore: MongodbStore,
    private readonly embeddingProvider: LangchainEmbeddingProvider,
    private readonly langfuseService: LangfuseService,
  ) {}

  /**
   * Perform similarity search to find relevant documents
   */
  async similaritySearch(
    query: string,
    options: SimilaritySearchOptions = {},
  ): Promise<SimilaritySearchResult> {
    const startTime = Date.now();
    const { k = 4, scoreThreshold, filter } = options;

    this.logger.debug(`Performing similarity search with k=${k}`);

    // Create Langfuse trace if enabled
    const trace = this.langfuseService.createTrace({
      name: "similarity_search",
      input: { query, options },
    });

    try {
      // Perform the search
      const results = await this.mongodbStore.similaritySearch(query, k, filter);

      // Transform results and apply score threshold if specified
      let documents: RetrievedDocument[] = results.map((result, index) => ({
        id: `doc_${index}`,
        content: result.content,
        score: result.score,
        metadata: result.metadata,
      }));

      if (scoreThreshold !== undefined) {
        documents = documents.filter((doc) => doc.score >= scoreThreshold);
      }

      const duration = Date.now() - startTime;

      // Update trace with results
      if (trace) {
        trace.update({
          output: { documentCount: documents.length },
          metadata: { duration },
        });
      }

      this.logger.debug(
        `Similarity search completed in ${duration}ms, found ${documents.length} documents`,
      );

      return {
        documents,
        query,
        duration,
      };
    } catch (error) {
      this.logger.error(`Similarity search failed: ${error}`);

      // Update trace with error
      if (trace) {
        trace.update({
          output: { error: String(error) },
        });
      }

      throw error;
    }
  }

  /**
   * Perform similarity search using a pre-computed embedding
   */
  async similaritySearchVector(
    embedding: number[],
    options: SimilaritySearchOptions = {},
  ): Promise<SimilaritySearchResult> {
    const startTime = Date.now();
    const { k = 4, scoreThreshold, filter } = options;

    this.logger.debug(`Performing vector similarity search with k=${k}`);

    const trace = this.langfuseService.createTrace({
      name: "vector_similarity_search",
      input: { embeddingLength: embedding.length, options },
    });

    try {
      const results = await this.mongodbStore.similaritySearchVectorWithScore(
        embedding,
        k,
        filter,
      );

      let documents: RetrievedDocument[] = results.map((result, index) => ({
        id: `doc_${index}`,
        content: result.content,
        score: result.score,
        metadata: result.metadata,
      }));

      if (scoreThreshold !== undefined) {
        documents = documents.filter((doc) => doc.score >= scoreThreshold);
      }

      const duration = Date.now() - startTime;

      if (trace) {
        trace.update({
          output: { documentCount: documents.length },
          metadata: { duration },
        });
      }

      return {
        documents,
        query: "",
        duration,
      };
    } catch (error) {
      this.logger.error(`Vector similarity search failed: ${error}`);

      if (trace) {
        trace.update({
          output: { error: String(error) },
        });
      }

      throw error;
    }
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(
    texts: string[],
    metadatas?: Record<string, unknown>[],
    ids?: string[],
  ): Promise<string[]> {
    this.logger.debug(`Adding ${texts.length} documents to vector store`);

    const trace = this.langfuseService.createTrace({
      name: "add_documents",
      input: { documentCount: texts.length },
    });

    try {
      const result = await this.mongodbStore.addDocuments(texts, metadatas, ids);

      if (trace) {
        trace.update({
          output: { ids: result },
        });
      }

      this.logger.debug(`Added ${result.length} documents successfully`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to add documents: ${error}`);

      if (trace) {
        trace.update({
          output: { error: String(error) },
        });
      }

      throw error;
    }
  }

  /**
   * Delete documents from the vector store
   */
  async deleteDocuments(ids: string[]): Promise<boolean> {
    this.logger.debug(`Deleting ${ids.length} documents from vector store`);

    return this.mongodbStore.deleteDocuments(ids);
  }

  /**
   * Get the embedding for a text
   */
  async getEmbedding(text: string): Promise<number[]> {
    return this.embeddingProvider.embedText(text);
  }

  /**
   * Get embeddings for multiple texts
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    return this.embeddingProvider.embedTexts(texts);
  }

  /**
   * Get the total document count in the vector store
   */
  async getDocumentCount(): Promise<number> {
    return this.mongodbStore.getDocumentCount();
  }

  /**
   * Format retrieved documents for context injection
   */
  formatDocumentsForContext(documents: RetrievedDocument[]): string {
    if (documents.length === 0) {
      return "";
    }

    return documents
      .map((doc, index) => {
        const metadata = Object.entries(doc.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");

        return `[Document ${index + 1}]${metadata ? ` (${metadata})` : ""}\n${doc.content}`;
      })
      .join("\n\n");
  }
}
