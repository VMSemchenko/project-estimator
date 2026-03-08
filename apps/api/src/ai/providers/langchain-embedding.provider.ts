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

  constructor(private readonly configService: ConfigService) {
    const fullConfig = configService.get<Config>("config");

    const config: EmbeddingProviderConfig = {
      apiKey: fullConfig?.zhipuai?.apiKey || process.env.ZHIPUAI_API_KEY || "",
      baseUrl:
        fullConfig?.zhipuai?.baseUrl ||
        process.env.ZHIPUAI_BASE_URL ||
        "https://open.bigmodel.cn/api/paas/v4",
      modelName:
        fullConfig?.zhipuai?.embeddingModel ||
        process.env.EMBEDDING_MODEL ||
        "embedding-3",
      batchSize: 100,
    };

    this.modelName = config.modelName;
    this.logger.log(
      `Initializing embedding provider with model: ${config.modelName}`,
    );

    if (!config.apiKey) {
      throw new Error("ZHIPUAI_API_KEY is not configured");
    }

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
