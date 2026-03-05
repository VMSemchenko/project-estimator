import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { LLMProvider, LLMProviderConfig } from "../interfaces/llm-provider.interface";
import { Config } from "../../config/configuration";

/**
 * LangChain-based LLM provider using ZhipuAI's OpenAI-compatible API
 */
@Injectable()
export class LangchainLLMProvider implements LLMProvider {
  private readonly logger = new Logger(LangchainLLMProvider.name);
  private readonly chatModel: ChatOpenAI;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService<Config, true>) {
    const config: LLMProviderConfig = {
      apiKey: configService.get("zhipuai.apiKey", { infer: true }),
      baseUrl: configService.get("zhipuai.baseUrl", { infer: true }),
      modelName: configService.get("zhipuai.llmModel", { infer: true }),
      temperature: 0.1,
    };

    this.modelName = config.modelName;
    this.logger.log(`Initializing LLM provider with model: ${config.modelName}`);

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

  /**
   * Get the underlying LangChain chat model instance
   */
  getChatModel(): ChatOpenAI {
    return this.chatModel;
  }

  /**
   * Get the model name being used
   */
  getModelName(): string {
    return this.modelName;
  }
}
