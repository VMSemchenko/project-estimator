import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient, Collection, Document as MongoDocument } from "mongodb";
import { Embeddings } from "@langchain/core/embeddings";
import { LangchainEmbeddingProvider } from "../../ai/providers/langchain-embedding.provider";
import { Config } from "../../config/configuration";
import { MONGO_CLIENT } from "../../database/database.module";

/**
 * MongoDB Atlas Vector Store wrapper
 * Provides vector search capabilities using MongoDB Atlas
 */
@Injectable()
export class MongodbStore implements OnModuleDestroy {
  private readonly logger = new Logger(MongodbStore.name);
  private readonly vectorStore: MongoDBAtlasVectorSearch;
  private readonly collection: Collection<MongoDocument>;
  private readonly indexName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingProvider: LangchainEmbeddingProvider,
    @Inject(MONGO_CLIENT) private readonly mongoClient: MongoClient,
  ) {
    const config = configService.get<Config>("config");
    const dbName = config?.mongodb?.dbName || "estimator";
    this.indexName = config?.mongodb?.vectorSearchIndex || "vector_index";

    const db = mongoClient.db(dbName);
    this.collection = db.collection("catalogs");

    this.logger.log(
      `Initializing MongoDB Atlas Vector Store with index: ${this.indexName}`,
    );

    this.vectorStore = new MongoDBAtlasVectorSearch(
      embeddingProvider.getEmbeddings() as Embeddings,
      {
        collection: this.collection,
        indexName: this.indexName,
      },
    );
  }

  /**
   * Get the underlying vector store instance
   */
  getVectorStore(): MongoDBAtlasVectorSearch {
    return this.vectorStore;
  }

  /**
   * Get the collection being used
   */
  getCollection(): Collection<MongoDocument> {
    return this.collection;
  }

  /**
   * Get the index name
   */
  getIndexName(): string {
    return this.indexName;
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

    const documents = texts.map((text, index) => ({
      pageContent: text,
      metadata: metadatas?.[index] ?? {},
    }));

    return this.vectorStore.addDocuments(documents, { ids });
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(
    query: string,
    k: number = 4,
    filter?: Record<string, unknown>,
  ): Promise<
    { content: string; score: number; metadata: Record<string, unknown> }[]
  > {
    this.logger.debug(
      `Performing similarity search for: ${query.substring(0, 50)}...`,
    );

    const results = await this.vectorStore.similaritySearchWithScore(
      query,
      k,
      filter,
    );

    return results.map(([document, score]) => ({
      content: document.pageContent,
      score,
      metadata: document.metadata,
    }));
  }

  /**
   * Perform similarity search with vector
   */
  async similaritySearchVectorWithScore(
    embedding: number[],
    k: number = 4,
    filter?: Record<string, unknown>,
  ): Promise<
    { content: string; score: number; metadata: Record<string, unknown> }[]
  > {
    this.logger.debug(`Performing vector similarity search with ${k} results`);

    const results = await this.vectorStore.similaritySearchVectorWithScore(
      embedding,
      k,
      filter,
    );

    return results.map(([document, score]) => ({
      content: document.pageContent,
      score,
      metadata: document.metadata,
    }));
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(ids: string[]): Promise<boolean> {
    this.logger.debug(`Deleting ${ids.length} documents from vector store`);

    const result = await this.collection.deleteMany({
      id: { $in: ids },
    });

    return result.acknowledged;
  }

  /**
   * Delete documents by filter
   */
  async deleteByFilter(filter: Record<string, unknown>): Promise<boolean> {
    this.logger.debug("Deleting documents by filter from vector store");

    const result = await this.collection.deleteMany(filter);

    return result.acknowledged;
  }

  /**
   * Get document count in the collection
   */
  async getDocumentCount(): Promise<number> {
    return this.collection.countDocuments();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("MongoDB store shutdown complete");
  }
}
