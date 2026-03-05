import { Module } from "@nestjs/common";
import { MongodbStore } from "./vectorstore/mongodb.store";
import { RagService } from "./rag.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  providers: [MongodbStore, RagService],
  exports: [RagService, MongodbStore],
})
export class RagModule {}
