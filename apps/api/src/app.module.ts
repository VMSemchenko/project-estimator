import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { AppController } from "./app.controller";
import { DatabaseModule } from "./database";
import { AiModule } from "./ai";
import { RagModule } from "./rag";
import { CatalogsModule } from "./catalogs";
import { PromptsModule } from "./prompts";
import { AgentsModule } from "./agents";
import { ToolsModule } from "./tools";
import { EstimationModule } from "./estimation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env.local", ".env"],
    }),
    DatabaseModule,
    AiModule,
    RagModule,
    CatalogsModule,
    PromptsModule,
    AgentsModule,
    ToolsModule,
    EstimationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
