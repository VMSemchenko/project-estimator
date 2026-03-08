import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  LLMProvider,
  LLMProviderConfig,
} from "../interfaces/llm-provider.interface";
import { Config } from "../../config/configuration";

/**
 * LangChain-based LLM provider supporting multiple providers:
 * - ZhipuAI (OpenAI-compatible API)
 * - Google Gemini
 */
@Injectable()
export class LangchainLLMProvider implements LLMProvider {
  private readonly logger = new Logger(LangchainLLMProvider.name);
  private readonly chatModel: ChatOpenAI | ChatGoogleGenerativeAI;
  private readonly modelName: string;
  private readonly providerName: string;

  constructor(private readonly configService: ConfigService) {
    const fullConfig = configService.get<Config>("config");
    const provider =
      fullConfig?.llmProvider || process.env.LLM_PROVIDER || "zhipuai";
    this.providerName = provider;

    if (provider === "gemini") {
      // Initialize Gemini provider
      const config = {
        apiKey: fullConfig?.gemini?.apiKey || process.env.GEMINI_API_KEY || "",
        modelName:
          fullConfig?.gemini?.llmModel ||
          process.env.GEMINI_MODEL ||
          "gemini-1.5-flash",
        temperature: 0.1,
      };

      this.modelName = config.modelName;
      this.logger.log(
        `Initializing Gemini LLM provider with model: ${config.modelName}`,
      );

      if (!config.apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      this.chatModel = new ChatGoogleGenerativeAI({
        model: config.modelName,
        apiKey: config.apiKey,
        temperature: config.temperature ?? 0.1,
      });
    } else {
      // Initialize ZhipuAI provider (OpenAI-compatible)
      const config: LLMProviderConfig = {
        apiKey:
          fullConfig?.zhipuai?.apiKey || process.env.ZHIPUAI_API_KEY || "",
        baseUrl:
          fullConfig?.zhipuai?.baseUrl ||
          process.env.ZHIPUAI_BASE_URL ||
          "https://open.bigmodel.cn/api/paas/v4",
        modelName:
          fullConfig?.zhipuai?.llmModel || process.env.LLM_MODEL || "glm-5",
        temperature: 0.1,
      };

      this.modelName = config.modelName;
      this.logger.log(
        `Initializing ZhipuAI LLM provider with model: ${config.modelName}`,
      );

      if (!config.apiKey) {
        throw new Error("ZHIPUAI_API_KEY is not configured");
      }

      this.chatModel = new ChatOpenAI({
        modelName: config.modelName,
        openAIApiKey: config.apiKey,
        configuration: {
          baseURL: config.baseUrl,
        },
        temperature: config.temperature ?? 0.1,
        maxTokens: config.maxTokens,
      });
    }
  }

  /**
   * Get the underlying LangChain chat model instance
   */
  getChatModel(): ChatOpenAI | ChatGoogleGenerativeAI {
    return this.chatModel;
  }

  /**
   * Get the model name being used
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return this.providerName;
  }
}
