import { Controller, Get, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongoClient } from "mongodb";
import { Config } from "./config/configuration";
import { MONGO_CLIENT } from "./database/database.module";
import { LangfuseService } from "./ai/langfuse/langfuse.service";

@Controller()
export class AppController {
  constructor(
    private configService: ConfigService<Config, true>,
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
    return {
      nodeEnv: this.configService.get("app.nodeEnv", { infer: true }),
      llmModel: this.configService.get("zhipuai.llmModel", { infer: true }),
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
    const apiKey = this.configService.get("zhipuai.apiKey", { infer: true });
    return apiKey && apiKey.length > 0 ? "available" : "not_configured";
  }

  private checkLangfuse(): string {
    const enabled = this.configService.get("langfuse.enabled", { infer: true });
    if (!enabled) {
      return "disabled";
    }

    const publicKey = this.configService.get("langfuse.publicKey", {
      infer: true,
    });
    const secretKey = this.configService.get("langfuse.secretKey", {
      infer: true,
    });

    return publicKey && secretKey ? "connected" : "not_configured";
  }
}
