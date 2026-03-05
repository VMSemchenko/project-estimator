import { Injectable, Logger } from '@nestjs/common';
import { LangfuseTraceClient, LangfuseSpanClient } from 'langfuse-core';
import { LangfuseService } from '../ai/langfuse/langfuse.service';
import {
  TraceContext,
  TraceContextConfig,
  AgentSpanConfig,
} from './interfaces/trace-context.interface';

/**
 * Service for managing distributed tracing across the estimation pipeline
 * Provides high-level tracing operations for agent nodes and LLM calls
 */
@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);

  constructor(private readonly langfuseService: LangfuseService) {}

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.langfuseService.isEnabled();
  }

  /**
   * Start a new estimation trace
   * @param config - Configuration for the trace context
   * @returns Trace context object for tracking the estimation
   */
  startEstimationTrace(config: TraceContextConfig): TraceContext {
    const { estimationId, inputFolder, metadata = {} } = config;

    const trace = this.langfuseService.createTrace({
      name: `estimation_${estimationId}`,
      id: estimationId,
      metadata: {
        inputFolder,
        ...metadata,
        startTime: new Date().toISOString(),
      },
    });

    const context: TraceContext = {
      estimationId,
      trace,
      inputFolder,
      startTime: new Date(),
      spans: new Map(),
      metadata,
    };

    this.logger.log(`Started estimation trace: ${estimationId}`);
    return context;
  }

  /**
   * Create a span for an agent node within a trace
   * @param traceContext - The parent trace context
   * @param config - Configuration for the agent span
   * @returns The created span or null if tracing is disabled
   */
  createAgentSpan(
    traceContext: TraceContext,
    config: AgentSpanConfig,
  ): LangfuseSpanClient | null {
    if (!traceContext.trace) {
      return null;
    }

    const { agentName, input, metadata = {} } = config;

    // Check if span already exists
    const existingSpan = traceContext.spans.get(agentName);
    if (existingSpan) {
      this.logger.warn(`Span already exists for agent: ${agentName}`);
      return existingSpan;
    }

    const span = this.langfuseService.createAgentSpan(
      traceContext.trace,
      agentName,
      input,
    );

    if (span) {
      // Add metadata
      span.update({
        metadata: {
          ...metadata,
          agentName,
          startTime: new Date().toISOString(),
        },
      });

      traceContext.spans.set(agentName, span);
      this.logger.debug(`Created agent span: ${agentName}`);
    }

    return span;
  }

  /**
   * Get an existing span by agent name
   * @param traceContext - The trace context
   * @param agentName - Name of the agent
   * @returns The span or undefined if not found
   */
  getAgentSpan(
    traceContext: TraceContext,
    agentName: string,
  ): LangfuseSpanClient | undefined {
    return traceContext.spans.get(agentName);
  }

  /**
   * End a span with output data
   * @param traceContext - The trace context
   * @param agentName - Name of the agent
   * @param output - Output data from the agent
   */
  endAgentSpan(
    traceContext: TraceContext,
    agentName: string,
    output?: unknown,
  ): void {
    const span = traceContext.spans.get(agentName);
    if (!span) {
      this.logger.warn(`No span found for agent: ${agentName}`);
      return;
    }

    this.langfuseService.endSpan(span, output);
    traceContext.spans.delete(agentName);
    this.logger.debug(`Ended agent span: ${agentName}`);
  }

  /**
   * Record an error in a span
   * @param traceContext - The trace context
   * @param agentName - Name of the agent where error occurred
   * @param error - The error to record
   */
  recordSpanError(
    traceContext: TraceContext,
    agentName: string,
    error: Error,
  ): void {
    const span = traceContext.spans.get(agentName);
    if (!span) {
      this.logger.warn(`No span found for agent: ${agentName}`);
      return;
    }

    this.langfuseService.trackSpanError(span, error);
    this.logger.error(`Recorded error in span ${agentName}: ${error.message}`);
  }

  /**
   * Record an error in the trace
   * @param traceContext - The trace context
   * @param error - The error to record
   * @param metadata - Additional metadata about the error
   */
  recordTraceError(
    traceContext: TraceContext,
    error: Error,
    metadata?: Record<string, unknown>,
  ): void {
    if (!traceContext.trace) {
      return;
    }

    this.langfuseService.trackError(traceContext.trace, error, {
      estimationId: traceContext.estimationId,
      ...metadata,
    });
  }

  /**
   * End the estimation trace
   * @param traceContext - The trace context to end
   * @param output - Final output from the estimation
   */
  endEstimationTrace(
    traceContext: TraceContext,
    output?: unknown,
  ): void {
    if (!traceContext.trace) {
      return;
    }

    // End any remaining spans
    for (const [agentName, span] of traceContext.spans) {
      this.logger.warn(`Ending orphaned span: ${agentName}`);
      this.langfuseService.endSpan(span);
    }
    traceContext.spans.clear();

    // Update trace with final output
    const finalOutput = output && typeof output === 'object'
      ? { ...output, endTime: new Date().toISOString(), duration: Date.now() - traceContext.startTime.getTime() }
      : { result: output, endTime: new Date().toISOString(), duration: Date.now() - traceContext.startTime.getTime() };
    
    this.langfuseService.updateTraceOutput(traceContext.trace, finalOutput);

    this.logger.log(`Ended estimation trace: ${traceContext.estimationId}`);
  }

  /**
   * Track an LLM call within a trace
   * @param traceContext - The trace context
   * @param agentName - Name of the agent making the call
   * @param input - Input prompt
   * @param output - Output response
   * @param tokenUsage - Token usage information
   */
  trackLLMCall(
    traceContext: TraceContext,
    agentName: string,
    input: string,
    output: string,
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number },
  ): void {
    if (!traceContext.trace) {
      return;
    }

    this.langfuseService.trackLlmSpan(traceContext.trace, {
      name: `${agentName}_llm_call`,
      input,
      output,
      tokenUsage,
    });

    this.logger.debug(`Tracked LLM call for agent: ${agentName}`);
  }

  /**
   * Flush all pending trace data
   */
  async flush(): Promise<void> {
    await this.langfuseService.flush();
    this.logger.debug('Flushed trace data');
  }
}
