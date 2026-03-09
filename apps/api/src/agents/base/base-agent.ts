import { Logger } from "@nestjs/common";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import {
  AgentType,
  PromptContext,
} from "../../prompts/interfaces/prompt-context.interface";
import { PromptsService } from "../../prompts/prompts.service";
import { LLMProvider } from "../../ai/interfaces/llm-provider.interface";
import { LangfuseService } from "../../ai/langfuse/langfuse.service";
import { TracingService } from "../../observability/tracing.service";
import {
  EstimationState,
  EstimationError,
  NodeConfig,
  StateUpdate,
} from "../interfaces/agent-state.interface";
import {
  AgentNode,
  AgentDependencies,
  ParseConfig,
} from "../interfaces/agent.interface";
import { LangfuseSpanClient } from "langfuse-core";
import { LLMError } from "../errors/llm-error";

/**
 * Extended agent dependencies including tracing service
 */
export interface ExtendedAgentDependencies extends AgentDependencies {
  tracingService?: TracingService;
}

/**
 * Base class for LangGraph agent nodes
 * Provides shared functionality for LLM invocation, JSON parsing, error handling, and tracing
 */
export abstract class BaseAgentNode implements AgentNode {
  protected readonly logger: Logger;
  protected readonly promptsService: PromptsService;
  protected readonly llmProvider: LLMProvider;
  protected readonly langfuseService?: LangfuseService;
  protected readonly tracingService?: TracingService;

  abstract readonly name: string;
  abstract readonly agentType: AgentType;

  constructor(dependencies: ExtendedAgentDependencies) {
    this.promptsService = dependencies.promptsService;
    this.llmProvider = dependencies.llmProvider;
    this.langfuseService = dependencies.langfuseService;
    this.tracingService = dependencies.tracingService;
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Get node context prefix for consistent logging
   */
  protected get nodePrefix(): string {
    return `[${this.name}]`;
  }

  /**
   * Log with node context
   */
  protected logNode(message: string, ...optionalParams: unknown[]): void {
    this.logger.log(`${this.nodePrefix} ${message}`, ...optionalParams);
  }

  /**
   * Log debug with node context
   */
  protected debugNode(message: string, ...optionalParams: unknown[]): void {
    this.logger.debug(`${this.nodePrefix} ${message}`, ...optionalParams);
  }

  /**
   * Log warning with node context
   */
  protected warnNode(message: string, ...optionalParams: unknown[]): void {
    this.logger.warn(`${this.nodePrefix} ${message}`, ...optionalParams);
  }

  /**
   * Log error with node context
   */
  protected errorNode(message: string, ...optionalParams: unknown[]): void {
    this.logger.error(`${this.nodePrefix} ${message}`, ...optionalParams);
  }

  /**
   * Execute the node's logic - must be implemented by subclasses
   */
  abstract execute(
    state: EstimationState,
    config?: NodeConfig,
  ): Promise<StateUpdate>;

  /**
   * Create an error object for state tracking
   */
  protected createError(message: string, stack?: string): EstimationError {
    return {
      timestamp: new Date().toISOString(),
      node: this.name,
      message,
      stack,
    };
  }

  /**
   * Invoke LLM with a compiled prompt template
   * @param context - Context variables for template compilation
   * @param options - Optional configuration for the LLM call
   * @returns LLM response string
   */
  protected async invokeLLM(
    context: PromptContext,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {},
  ): Promise<string> {
    const startTime = Date.now();

    // Compile the prompt template with context
    const compiledPrompt = this.promptsService.compileTemplate(
      this.agentType,
      context,
    );

    // Get provider information for tracing
    const providerName = this.llmProvider.getCurrentProviderName();
    const modelName = this.llmProvider.getModelName();

    // Create Langfuse trace if enabled with provider metadata
    const trace = this.langfuseService?.createTrace({
      name: `${this.name}_llm_call`,
      input: { context, compiledPrompt },
      metadata: {
        provider: providerName,
        model: modelName,
        agentType: this.agentType,
      },
    });

    try {
      const chatModel = this.llmProvider.getChatModel();

      // Build the chain with a lambda that returns the compiled prompt as a HumanMessage
      // This avoids ChatPromptTemplate interpreting curly braces in the prompt as variables
      const chain = RunnableSequence.from([
        () => [new HumanMessage(compiledPrompt)],
        chatModel,
        new StringOutputParser(),
      ]);

      // Invoke the chain with retry logic
      const response = await this.llmProvider.executeWithRetry(
        () => chain.invoke({}),
        {
          operation: "invoke",
          node: this.name,
        },
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`LLM invocation completed in ${duration}ms`);

      // Track LLM span with provider information
      if (this.langfuseService && trace) {
        this.langfuseService.trackLlmSpan(trace, {
          name: `${this.name}_llm_generation`,
          input: compiledPrompt,
          output: response,
          model: modelName,
          provider: providerName,
          duration,
          metadata: {
            agentType: this.agentType,
          },
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`LLM invocation failed after ${duration}ms: ${error}`);

      // Track error in LLM span
      if (this.langfuseService && trace) {
        this.langfuseService.trackLlmSpan(trace, {
          name: `${this.name}_llm_generation_error`,
          input: compiledPrompt,
          output: String(error),
          model: modelName,
          provider: providerName,
          duration,
          metadata: {
            agentType: this.agentType,
            error: true,
          },
        });
      }

      // Re-throw if already an LLMError (from retry logic)
      if (error instanceof LLMError) {
        throw error;
      }

      // Wrap error in LLMError for proper classification
      throw LLMError.fromError(error, {
        node: this.name,
        operation: "invoke",
      });
    }
  }

  /**
   * Parse JSON from LLM response
   * Handles various formats including markdown code blocks
   */
  protected parseJsonResponse<T>(
    response: string,
    config: ParseConfig = {},
  ): T {
    const { extractJson = true, defaultValue, throwOnerror = true } = config;

    try {
      if (!extractJson) {
        return JSON.parse(response) as T;
      }

      // Try to extract JSON from markdown code blocks
      const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonBlockMatch) {
        return JSON.parse(jsonBlockMatch[1].trim()) as T;
      }

      // Try to find JSON object or array in the response
      const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
      const jsonArrayMatch = response.match(/\[[\s\S]*\]/);

      const jsonMatch = jsonObjectMatch || jsonArrayMatch;
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }

      // Try parsing the entire response
      return JSON.parse(response) as T;
    } catch (error) {
      this.logger.warn(`Failed to parse JSON response: ${error}`);

      if (defaultValue !== undefined) {
        return defaultValue as T;
      }

      if (throwOnerror) {
        throw new Error(`Failed to parse JSON response: ${error}`);
      }

      // Return empty object as fallback
      return {} as T;
    }
  }

  /**
   * Invoke LLM and parse response as JSON
   */
  protected async invokeLLMJson<T>(
    context: PromptContext,
    config: ParseConfig = {},
    llmOptions?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<T> {
    const response = await this.invokeLLM(context, llmOptions);
    return this.parseJsonResponse<T>(response, config);
  }

  /**
   * Log node execution start and create span if tracing is enabled
   */
  protected logStart(state: EstimationState): number {
    const startTime = Date.now();
    this.logger.log(`Starting ${this.name} node execution`);
    this.logger.debug(
      `Current state: ${JSON.stringify({
        inputFolder: state.inputFolder,
        artifactsCount: state.artifacts.length,
        requirementsCount: state.requirements.length,
        estimatesCount: state.estimates.length,
      })}`,
    );

    // Create span for this node if tracing is enabled
    if (state.traceContext && this.tracingService) {
      this.tracingService.createAgentSpan(state.traceContext, {
        agentName: this.name,
        input: {
          inputFolder: state.inputFolder,
          artifactsCount: state.artifacts.length,
          requirementsCount: state.requirements.length,
        },
      });
    }

    return startTime;
  }

  /**
   * Log node execution completion and end span
   */
  protected logComplete(
    startTime: number,
    update: StateUpdate,
    state?: EstimationState,
  ): void {
    const duration = Date.now() - startTime;
    this.logger.log(`Completed ${this.name} node in ${duration}ms`);
    this.logger.debug(
      `Output: ${JSON.stringify({
        validationStatus: update.validationStatus,
        artifactsAdded: update.artifacts?.length,
        requirementsExtracted: update.requirements?.length,
        atomicWorksDecomposed: update.atomicWorks?.length,
        estimatesGenerated: update.estimates?.length,
        hasReport: !!update.report,
      })}`,
    );

    // End span for this node if tracing is enabled
    if (state?.traceContext && this.tracingService) {
      this.tracingService.endAgentSpan(state.traceContext, this.name, {
        duration,
        validationStatus: update.validationStatus,
        requirementsCount: update.requirements?.length,
        atomicWorksCount: update.atomicWorks?.length,
        estimatesCount: update.estimates?.length,
        hasReport: !!update.report,
      });
    }
  }

  /**
   * Handle node execution error with tracing
   */
  protected handleError(error: unknown, state: EstimationState): StateUpdate {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorObj = error instanceof Error ? error : new Error(errorMessage);

    this.logger.error(`${this.name} node failed: ${errorMessage}`);

    // Record error in span if tracing is enabled
    if (state.traceContext && this.tracingService) {
      this.tracingService.recordSpanError(
        state.traceContext,
        this.name,
        errorObj,
      );
    }

    return {
      errors: [...state.errors, this.createError(errorMessage, errorStack)],
      currentStep: this.name,
      shouldStop: true,
    };
  }

  /**
   * Create a successful state update
   */
  protected createSuccessUpdate(
    update: StateUpdate,
    startTime: number,
    state?: EstimationState,
  ): StateUpdate {
    this.logComplete(startTime, update, state);
    return {
      ...update,
      currentStep: this.name,
    };
  }

  /**
   * Validate that required state fields are present
   */
  protected validateState(
    state: EstimationState,
    requiredFields: (keyof EstimationState)[],
  ): void {
    for (const field of requiredFields) {
      const value = state[field];
      if (value === undefined || value === null) {
        throw new Error(`Required state field '${field}' is missing`);
      }
      if (Array.isArray(value) && value.length === 0) {
        // For arrays, empty might be valid depending on context
        this.logger.debug(`State field '${field}' is an empty array`);
      }
    }
  }

  /**
   * Calculate PERT estimate
   * PERT formula: (O + 4M + P) / 6
   */
  protected calculatePert(
    optimistic: number,
    mostLikely: number,
    pessimistic: number,
  ): number {
    return (optimistic + 4 * mostLikely + pessimistic) / 6;
  }

  /**
   * Format hours for display
   */
  protected formatHours(hours: number): string {
    return `${hours.toFixed(1)}h`;
  }

  /**
   * Generate a unique ID
   */
  protected generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
