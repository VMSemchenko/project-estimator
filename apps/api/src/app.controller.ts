import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Config } from "./config/configuration";

@Controller()
export class AppController {
  constructor(private configService: ConfigService<Config, true>) {}

  @Get()
  getRoot(): { message: string; version: string } {
    return {
      message: "BA Work Estimator API",
      version: "0.1.0",
    };
  }

  @Get("health")
  getHealth(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("config")
  getConfig(): { nodeEnv: string; llmModel: string } {
    return {
      nodeEnv: this.configService.get("app.nodeEnv", { infer: true }),
      llmModel: this.configService.get("zhipuai.llmModel", { infer: true }),
    };
  }
}
