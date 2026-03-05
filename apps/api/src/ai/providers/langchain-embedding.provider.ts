import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Embeddings } from "@langchain/core/embeddings";
import {
  EmbeddingProvider,
  EmbeddingProviderConfig,
} from "../interfaces/embedding-provider.interface";
import { Config } from "../../config/configuration";

/**
 * LangChain-based embedding provider using ZhipuAI's OpenAI-compatible API
 */
@Injectable()
export class LangchainEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger(LangchainEmbeddingProvider.name);
  private readonly embeddings: OpenAIEmbeddings;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService<Config, true>) {
    const config: EmbeddingProviderConfig = {
      apiKey: configService.get("zhipuai.apiKey", { infer: true }),
      baseUrl: configService.get("zhipuai.baseUrl", { infer: true }),
      modelName: configService.get("zhipuai.embeddingModel", { infer: true }),
      batchSize: 100,
    };

    this.modelName = config.modelName;
    this.logger.log(`Initializing embedding provider with model: ${config.modelName}`);

    this.embeddings = new OpenAIEmbeddings({
      modelName: config.modelName,
      openAIApiKey: config.apiKey,
      configuration: {
        baseURL: config.baseUrl,
      },
    });
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
