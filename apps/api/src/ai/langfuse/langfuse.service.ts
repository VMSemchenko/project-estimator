import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Langfuse } from "langfuse";
import { CallbackHandler } from "langfuse-langchain";
import { Config } from "../../config/configuration";

/**
 * Langfuse service for LLM observability and tracing
 * Provides integration with Langfuse for tracking LLM calls
 */
@Injectable()
export class LangfuseService implements OnModuleDestroy {
  private readonly logger = new Logger(LangfuseService.name);
  private readonly langfuseClient: Langfuse | null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService<Config, true>) {
    this.enabled = configService.get("langfuse.enabled", { infer: true });

    if (this.enabled) {
      const publicKey = configService.get("langfuse.publicKey", { infer: true });
      const secretKey = configService.get("langfuse.secretKey", { infer: true });
      const host = configService.get("langfuse.host", { infer: true });

      this.langfuseClient = new Langfuse({
        publicKey,
        secretKey,
        baseUrl: host,
      });

      this.logger.log("Langfuse tracing enabled");
    } else {
      this.langfuseClient = null;
      this.logger.log("Langfuse tracing disabled");
    }
  }

  /**
   * Check if Langfuse tracing is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the Langfuse client instance
   */
  getClient(): Langfuse | null {
    return this.langfuseClient;
  }

  /**
   * Create a LangChain callback handler for tracing
   */
  createCallbackHandler(
    options: {
      traceName?: string;
      traceId?: string;
      sessionId?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): CallbackHandler | null {
    if (!this.enabled || !this.langfuseClient) {
      return null;
    }

    return new CallbackHandler({
      publicKey: this.configService.get("langfuse.publicKey", { infer: true }),
      secretKey: this.configService.get("langfuse.secretKey", { infer: true }),
      baseUrl: this.configService.get("langfuse.host", { infer: true }),
      ...options,
    });
  }

  /**
   * Create a new trace
   */
  createTrace(options: {
    name: string;
    id?: string;
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    input?: unknown;
    output?: unknown;
  }) {
    if (!this.enabled || !this.langfuseClient) {
      return null;
    }

    return this.langfuseClient.trace(options);
  }

  /**
   * Create a new span
   */
  createSpan(options: {
    traceId: string;
    name: string;
    startTime?: Date;
    endTime?: Date;
    metadata?: Record<string, unknown>;
    input?: unknown;
    output?: unknown;
    level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  }) {
    if (!this.enabled || !this.langfuseClient) {
      return null;
    }

    return this.langfuseClient.span(options);
  }

  /**
   * Flush all pending events to Langfuse
   */
  async flush(): Promise<void> {
    if (this.enabled && this.langfuseClient) {
      await this.langfuseClient.flushAsync();
      this.logger.debug("Langfuse events flushed");
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.flush();
    this.logger.log("Langfuse service shutdown complete");
  }
}
