import { registerAs } from "@nestjs/config";

export interface AppConfig {
  nodeEnv: string;
  port: number;
}

export interface ZhipuAIConfig {
  apiKey: string;
  baseUrl: string;
  llmModel: string;
  embeddingModel: string;
}

export interface OpenAIConfig {
  apiKey: string;
  embeddingModel: string;
}

export interface LocalEmbeddingConfig {
  model: string;
}

export interface MongoDBConfig {
  uri: string;
  dbName: string;
  vectorSearchIndex: string;
}

export interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  host: string;
  enabled: boolean;
}

export interface Config {
  app: AppConfig;
  zhipuai: ZhipuAIConfig;
  openai: OpenAIConfig;
  localEmbedding: LocalEmbeddingConfig;
  mongodb: MongoDBConfig;
  langfuse: LangfuseConfig;
}

export default registerAs(
  "config",
  (): Config => ({
    app: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: parseInt(process.env.PORT || "3000", 10),
    },
    zhipuai: {
      apiKey: process.env.ZHIPUAI_API_KEY || "",
      baseUrl: process.env.ZHIPUAI_BASE_URL || "https://api.z.ai/api/paas/v4",
      llmModel: process.env.LLM_MODEL || "glm-5",
      embeddingModel: process.env.EMBEDDING_MODEL || "embedding-2",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      embeddingModel:
        process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002",
    },
    localEmbedding: {
      model: process.env.LOCAL_EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
    },
    mongodb: {
      uri: process.env.MONGODB_URI || "",
      dbName:
        process.env.MONGODB_URI?.split("/").pop()?.split("?")[0] || "estimator",
      vectorSearchIndex: process.env.VECTOR_SEARCH_INDEX || "vector_index",
    },
    langfuse: {
      publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
      secretKey: process.env.LANGFUSE_SECRET_KEY || "",
      host: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
      enabled: process.env.LANGFUSE_ENABLED === "true",
    },
  }),
);
