import { Controller, Get, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongoClient } from "mongodb";
import { Config } from "./config/configuration";
import { MONGO_CLIENT } from "./database/database.module";
import { LangfuseService } from "./ai/langfuse/langfuse.service";

@Controller()
export class AppController {
  constructor(
    private configService: ConfigService,
    @Inject(MONGO_CLIENT) private mongoClient: MongoClient,
    private langfuseService?: LangfuseService,
  ) {}

  @Get()
  getRoot(): { message: string; version: string } {
    return {
      message: "BA Work Estimator API",
      version: "0.1.0",
    };
  }

  @Get("health")
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    services: {
      mongodb: string;
      zhipuai: string;
      langfuse: string;
    };
  }> {
    const services = {
      mongodb: await this.checkMongoDB(),
      zhipuai: this.checkZhipuAI(),
      langfuse: this.checkLangfuse(),
    };

    const allHealthy =
      services.mongodb === "connected" &&
      services.zhipuai === "available" &&
      (services.langfuse === "connected" || services.langfuse === "disabled");

    return {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get("config")
  getConfig(): { nodeEnv: string; llmModel: string } {
    const config = this.configService.get<Config>("config");
    return {
      nodeEnv: config?.app?.nodeEnv || "development",
      llmModel: config?.zhipuai?.llmModel || "glm-5",
    };
  }

  private async checkMongoDB(): Promise<string> {
    try {
      await this.mongoClient.db().command({ ping: 1 });
      return "connected";
    } catch {
      return "disconnected";
    }
  }

  private checkZhipuAI(): string {
    const config = this.configService.get<Config>("config");
    const apiKey = config?.zhipuai?.apiKey;
    return apiKey && apiKey.length > 0 ? "available" : "not_configured";
  }

  private checkLangfuse(): string {
    const config = this.configService.get<Config>("config");
    const enabled = config?.langfuse?.enabled;
    if (!enabled) {
      return "disabled";
    }

    const publicKey = config?.langfuse?.publicKey;
    const secretKey = config?.langfuse?.secretKey;
    return publicKey && secretKey ? "connected" : "not_configured";
  }
}
