import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Embeddings } from "@langchain/core/embeddings";
import {
  EmbeddingProvider,
  EmbeddingProviderConfig,
} from "../interfaces/embedding-provider.interface";
import { Config } from "../../config/configuration";

// Dynamic import for ESM module @xenova/transformers
// Using a workaround to prevent TypeScript from transforming the dynamic import
// This is needed because @xenova/transformers is an ESM-only package
const dynamicImport = new Function(
  "modulePath",
  "return import(modulePath)",
) as (modulePath: string) => Promise<any>;

// Module-level cache for transformers
let transformersModule: {
  pipeline: any;
  env: any;
} | null = null;

async function getTransformers() {
  if (!transformersModule) {
    const transformers = await dynamicImport("@xenova/transformers");
    transformersModule = {
      pipeline: transformers.pipeline,
      env: transformers.env,
    };
    // Configure transformers.js to use local cache
    transformersModule.env.allowLocalModels = false;
  }
  return transformersModule;
}

/**
 * Local HuggingFace Transformers Embeddings wrapper that extends LangChain Embeddings class
 * Uses @xenova/transformers for local inference - no API key required
 */
class LocalTransformersEmbeddings extends Embeddings {
  private embedderPromise: Promise<any> | null = null;
  private readonly modelName: string;

  constructor(modelName: string = "Xenova/all-MiniLM-L6-v2") {
    super({});
    this.modelName = modelName;
  }

  private async getEmbedder() {
    if (!this.embedderPromise) {
      // Load transformers dynamically (ESM module)
      const { pipeline } = await getTransformers();
      this.embedderPromise = pipeline("feature-extraction", this.modelName, {
        quantized: true, // Use quantized model for smaller size
      });
    }
    return this.embedderPromise;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embedder = await this.getEmbedder();
    const results: number[][] = [];

    for (const text of texts) {
      const output = await embedder(text, { pooling: "mean", normalize: true });
      results.push(Array.from(output.data as Float32Array));
    }

    return results;
  }

  async embedQuery(text: string): Promise<number[]> {
    const embedder = await this.getEmbedder();
    const output = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  }
}

/**
 * LangChain-based embedding provider using local HuggingFace Transformers
 * No API key required - runs entirely locally
 */
@Injectable()
export class LangchainEmbeddingProvider
  implements EmbeddingProvider, OnModuleInit
{
  private readonly logger = new Logger(LangchainEmbeddingProvider.name);
  private readonly embeddings: LocalTransformersEmbeddings;
  private readonly modelName: string;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    const fullConfig = configService.get<Config>("config");

    // Use local transformers for embeddings (no API key required)
    const config: EmbeddingProviderConfig = {
      apiKey: "", // Not needed for local embeddings
      baseUrl: "", // Not needed for local embeddings
      modelName:
        fullConfig?.localEmbedding?.model ||
        process.env.LOCAL_EMBEDDING_MODEL ||
        "Xenova/all-MiniLM-L6-v2",
      batchSize: 100,
    };

    this.modelName = config.modelName;
    this.logger.log(
      `Initializing local embedding provider with model: ${config.modelName}`,
    );

    this.embeddings = new LocalTransformersEmbeddings(config.modelName);
  }

  async onModuleInit() {
    // Pre-load the model on initialization
    this.logger.log("Pre-loading local embedding model...");
    try {
      await this.embeddings.embedQuery("test");
      this.initialized = true;
      this.logger.log("Local embedding model loaded successfully");
    } catch (error) {
      this.logger.error(`Failed to load embedding model: ${error}`);
      throw error;
    }
  }

  /**
   * Get the underlying LangChain embeddings instance
   */
  getEmbeddings(): Embeddings {
    return this.embeddings;
  }

  /**
   * Get the model name being used
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Embed a single text
   */
  async embedText(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }

  /**
   * Embed multiple texts
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    return this.embeddings.embedDocuments(texts);
  }
}
