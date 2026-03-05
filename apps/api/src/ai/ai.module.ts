import { Module, Global } from "@nestjs/common";
import { LangchainLLMProvider } from "./providers/langchain-llm.provider";
import { LangchainEmbeddingProvider } from "./providers/langchain-embedding.provider";
import { LangfuseService } from "./langfuse/langfuse.service";

@Global()
@Module({
  providers: [LangchainLLMProvider, LangchainEmbeddingProvider, LangfuseService],
  exports: [LangchainLLMProvider, LangchainEmbeddingProvider, LangfuseService],
})
export class AiModule {}
