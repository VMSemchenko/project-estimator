import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Langfuse,
  LangfuseTraceClient,
  LangfuseSpanClient,
  LangfuseGenerationClient,
} from "langfuse";
import { CallbackHandler } from "langfuse-langchain";
import { Config } from "../../config/configuration";
import {
  TokenUsage,
  LLMSpanData,
  ErrorData,
} from "../../observability/interfaces/trace-context.interface";

/**
 * Langfuse service for LLM observability and tracing
 * Provides integration with Langfuse for tracking LLM calls
 */
@Injectable()
export class LangfuseService implements OnModuleDestroy {
  private readonly logger = new Logger(LangfuseService.name);
  private readonly langfuseClient: Langfuse | null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (this.configService as any).get("config") as
      | Config
      | undefined;
    this.enabled = config?.langfuse?.enabled ?? false;

    if (this.enabled) {
      const publicKey = config?.langfuse?.publicKey || "";
      const secretKey = config?.langfuse?.secretKey || "";
      const host = config?.langfuse?.host || "https://cloud.langfuse.com";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (this.configService as any).get("config") as
      | Config
      | undefined;
    return new CallbackHandler({
      publicKey: config?.langfuse?.publicKey || "",
      secretKey: config?.langfuse?.secretKey || "",
      baseUrl: config?.langfuse?.host || "https://cloud.langfuse.com",
      ...options,
    });
  }

  /**
   * Create a new trace for an estimation run
   */
  createTrace(options: {
    name: string;
    id?: string;
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    input?: unknown;
    output?: unknown;
  }): LangfuseTraceClient | null {
    if (!this.enabled || !this.langfuseClient) {
      return null;
    }

    return this.langfuseClient.trace(options);
  }

  /**
   * Create a new span within a trace
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
  }): LangfuseSpanClient | null {
    if (!this.enabled || !this.langfuseClient) {
      return null;
    }

    return this.langfuseClient.span(options);
  }

  /**
   * Track an LLM span with input/output
   * @param trace - The parent trace
   * @param data - LLM span data including name, input, output, and token usage
   */
  trackLlmSpan(
    trace: LangfuseTraceClient | null,
    data: LLMSpanData,
  ): LangfuseGenerationClient | null {
    if (!this.enabled || !trace) {
      return null;
    }

    const generation = trace.generation({
      name: data.name,
      input: data.input,
      output: data.output,
      metadata: {
        model: data.model,
        duration: data.duration,
      },
    });

    // Track token usage if available
    if (data.tokenUsage) {
      this.trackTokenUsage(generation, data.tokenUsage);
    }

    this.logger.debug(`Tracked LLM span: ${data.name}`);
    return generation;
  }

  /**
   * Track token usage on a span/generation
   * @param span - The span to track tokens on
   * @param tokenUsage - Token usage information
   */
  trackTokenUsage(
    span: LangfuseGenerationClient | null,
    tokenUsage: TokenUsage,
  ): void {
    if (!this.enabled || !span) {
      return;
    }

    span.update({
      metadata: {
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        totalTokens: tokenUsage.totalTokens,
      },
    });

    this.logger.debug(
      `Tracked token usage: ${tokenUsage.promptTokens} prompt + ${tokenUsage.completionTokens} completion = ${tokenUsage.totalTokens} total`,
    );
  }

  /**
   * Track an error in a trace
   * @param trace - The trace to track the error in
   * @param error - The error to track
   * @param metadata - Additional metadata about the error
   */
  trackError(
    trace: LangfuseTraceClient | null,
    error: Error,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.enabled || !trace) {
      return;
    }

    const errorData: ErrorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      metadata,
    };

    trace.event({
      name: "error",
      metadata: errorData,
      level: "ERROR",
    });

    this.logger.error(`Tracked error in trace: ${error.message}`);
  }

  /**
   * Track an error in a span
   * @param span - The span to track the error in
   * @param error - The error to track
   */
  trackSpanError(span: LangfuseSpanClient | null, error: Error): void {
    if (!this.enabled || !span) {
      return;
    }

    span.update({
      level: "ERROR",
      metadata: {
        errorMessage: error.message,
        errorStack: error.stack,
        errorTimestamp: new Date().toISOString(),
      },
    });

    this.logger.error(`Tracked error in span: ${error.message}`);
  }

  /**
   * Create a span from a trace for an agent node
   * @param trace - The parent trace
   * @param agentName - Name of the agent node
   * @param input - Input data for the agent
   */
  createAgentSpan(
    trace: LangfuseTraceClient | null,
    agentName: string,
    input?: unknown,
  ): LangfuseSpanClient | null {
    if (!this.enabled || !trace) {
      return null;
    }

    return trace.span({
      name: `agent_${agentName}`,
      input,
      metadata: {
        agentName,
        startTime: new Date().toISOString(),
      },
    });
  }

  /**
   * End a span with output data
   * @param span - The span to end
   * @param output - Output data from the span
   */
  endSpan(span: LangfuseSpanClient | null, output?: unknown): void {
    if (!this.enabled || !span) {
      return;
    }

    span.update({
      output,
      metadata: {
        endTime: new Date().toISOString(),
      },
    });

    this.logger.debug("Ended span");
  }

  /**
   * Update a trace with final output
   * @param trace - The trace to update
   * @param output - Final output data
   */
  updateTraceOutput(trace: LangfuseTraceClient | null, output: unknown): void {
    if (!this.enabled || !trace) {
      return;
    }

    trace.update({
      output,
    });

    this.logger.debug("Updated trace output");
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
