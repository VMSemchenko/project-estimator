import {
  Module,
  OnModuleInit,
  Injectable,
  Logger,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiModule } from "../ai/ai.module";
import { PromptsModule } from "../prompts/prompts.module";
import { RagModule } from "../rag/rag.module";
import { PromptsService } from "../prompts/prompts.service";
import { LangchainLLMProvider } from "../ai/providers/langchain-llm.provider";
import { LangfuseService } from "../ai/langfuse/langfuse.service";
import { RagService } from "../rag/rag.service";
import { Config } from "../config/configuration";
import { CatalogsModule } from "../catalogs/catalogs.module";
import { CatalogsService } from "../catalogs/catalogs.service";

import {
  ValidationNode,
  ExtractionNode,
  DecompositionNode,
  EstimationNode,
  ReportingNode,
  createValidationNode,
  createExtractionNode,
  createDecompositionNode,
  createEstimationNode,
  createReportingNode,
} from "./nodes";
import { AgentDependencies } from "./interfaces/agent.interface";
import {
  EstimationState,
  createInitialState,
  StateUpdate,
  EstimationReport,
} from "./interfaces/agent-state.interface";
import {
  PipelineResult,
  PipelineSummary,
} from "./interfaces/agent-result.interface";
import { TraceContext } from "../observability/interfaces/trace-context.interface";
import {
  createEstimationGraph,
  executeEstimationGraph,
  streamEstimationGraph,
  EstimationGraph,
  GraphState,
  GraphExecutionOptions,
} from "./graph";

/**
 * Service for orchestrating agent node execution
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @Inject("VALIDATION_NODE") private readonly validationNode: ValidationNode,
    @Inject("EXTRACTION_NODE") private readonly extractionNode: ExtractionNode,
    @Inject("DECOMPOSITION_NODE")
    private readonly decompositionNode: DecompositionNode,
    @Inject("ESTIMATION_NODE") private readonly estimationNode: EstimationNode,
    @Inject("REPORTING_NODE") private readonly reportingNode: ReportingNode,
  ) {}

  /**
   * Run the complete estimation pipeline
   * @param inputFolder - Path to the input folder
   * @param traceContext - Optional trace context for observability
   */
  async runEstimationPipeline(
    inputFolder: string,
    traceContext?: TraceContext,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    this.logger.log(`Starting estimation pipeline for: ${inputFolder}`);

    // Initialize state with trace context
    let state = createInitialState(inputFolder);
    if (traceContext) {
      state.traceContext = traceContext;
    }
    const nodeResults: PipelineResult["nodeResults"] = [];

    try {
      // Step 1: Validation
      this.logger.log("Running validation node...");
      const validationResult = await this.validationNode.execute(state);
      nodeResults.push({
        success: !validationResult.shouldStop,
        stateUpdate: validationResult,
        errors: validationResult.errors || [],
        duration: 0,
        nodeName: "validation",
      });
      state = this.mergeState(state, validationResult);

      if (state.shouldStop) {
        this.logger.warn("Pipeline stopped after validation");
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 2: Extraction
      this.logger.log("Running extraction node...");
      const extractionResult = await this.extractionNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: extractionResult,
        errors: [],
        duration: 0,
        nodeName: "extraction",
      });
      state = this.mergeState(state, extractionResult);

      if (state.shouldStop) {
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 3: Decomposition
      this.logger.log("Running decomposition node...");
      const decompositionResult = await this.decompositionNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: decompositionResult,
        errors: [],
        duration: 0,
        nodeName: "decomposition",
      });
      state = this.mergeState(state, decompositionResult);

      if (state.shouldStop) {
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 4: Estimation
      this.logger.log("Running estimation node...");
      const estimationResult = await this.estimationNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: estimationResult,
        errors: [],
        duration: 0,
        nodeName: "estimation",
      });
      state = this.mergeState(state, estimationResult);

      if (state.shouldStop) {
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 5: Reporting
      this.logger.log("Running reporting node...");
      const reportingResult = await this.reportingNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: reportingResult,
        errors: [],
        duration: 0,
        nodeName: "reporting",
      });
      state = this.mergeState(state, reportingResult);

      const totalDuration = Date.now() - startTime;
      this.logger.log(`Pipeline completed in ${totalDuration}ms`);

      return this.createPipelineResult(state, nodeResults, startTime);
    } catch (error) {
      this.logger.error(`Pipeline failed: ${error}`);

      const errorState: EstimationState = {
        ...state,
        errors: [
          ...state.errors,
          {
            timestamp: new Date().toISOString(),
            node: "pipeline",
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        ],
        shouldStop: true,
      };

      return this.createPipelineResult(errorState, nodeResults, startTime);
    }
  }

  /**
   * Run individual node by name
   */
  async runNode(
    nodeName: string,
    state: EstimationState,
  ): Promise<StateUpdate> {
    switch (nodeName) {
      case "validation":
        return this.validationNode.execute(state);
      case "extraction":
        return this.extractionNode.execute(state);
      case "decomposition":
        return this.decompositionNode.execute(state);
      case "estimation":
        return this.estimationNode.execute(state);
      case "reporting":
        return this.reportingNode.execute(state);
      default:
        throw new Error(`Unknown node: ${nodeName}`);
    }
  }

  /**
   * Get the report from a completed state
   */
  getReport(state: EstimationState): EstimationReport | undefined {
    return state.report;
  }

  /**
   * Merge state update into current state
   */
  private mergeState(
    state: EstimationState,
    update: StateUpdate,
  ): EstimationState {
    return {
      ...state,
      ...update,
      // Merge arrays instead of replacing
      errors: update.errors
        ? [...state.errors, ...update.errors]
        : state.errors,
    };
  }

  /**
   * Create pipeline result from final state
   */
  private createPipelineResult(
    state: EstimationState,
    nodeResults: PipelineResult["nodeResults"],
    startTime: number,
  ): PipelineResult {
    const totalDuration = Date.now() - startTime;

    const summary: PipelineSummary = {
      artifactsProcessed: state.artifacts.length,
      requirementsExtracted: state.requirements.length,
      atomicWorksIdentified: state.atomicWorks.length,
      estimatesGenerated: state.estimates.length,
      totalEstimatedHours: state.report?.totalHours || 0,
      validationPassed: state.validationStatus === "valid",
      reportGenerated: !!state.report,
    };

    return {
      success: !state.shouldStop && state.errors.length === 0,
      finalState: state,
      errors: state.errors,
      totalDuration,
      nodeResults,
      summary,
    };
  }
}

/**
 * Service for executing the LangGraph-based estimation pipeline
 * This service uses the StateGraph orchestration for more robust execution
 */
@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);
  private graph: EstimationGraph | null = null;

  constructor(private readonly agentDependencies: AgentDependencies) {}

  /**
   * Get or create the estimation graph (lazy initialization)
   */
  private getGraph(): EstimationGraph {
    if (!this.graph) {
      this.logger.log("Initializing estimation graph...");
      this.graph = createEstimationGraph(this.agentDependencies);
    }
    return this.graph;
  }

  /**
   * Run the complete estimation pipeline using LangGraph
   * @param inputFolder - Path to the input folder containing artifacts
   * @param options - Execution options
   * @returns Final graph state
   */
  async runEstimation(
    inputFolder: string,
    options?: GraphExecutionOptions,
  ): Promise<GraphState> {
    this.logger.log(`Starting LangGraph estimation for: ${inputFolder}`);
    const startTime = Date.now();

    try {
      const graph = this.getGraph();
      const result = await executeEstimationGraph(graph, inputFolder, options);

      const duration = Date.now() - startTime;
      this.logger.log(`LangGraph estimation completed in ${duration}ms`);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`LangGraph estimation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stream estimation results for real-time progress updates
   * @param inputFolder - Path to the input folder containing artifacts
   * @param options - Execution options
   * @returns Async generator yielding state updates
   */
  async *streamEstimation(
    inputFolder: string,
    options?: GraphExecutionOptions,
  ): AsyncGenerator<{ node: string; state: GraphState }> {
    this.logger.log(`Starting LangGraph stream estimation for: ${inputFolder}`);

    const graph = this.getGraph();
    yield* streamEstimationGraph(graph, inputFolder, options);
  }

  /**
   * Get the report from a completed graph state
   */
  getReport(state: GraphState): EstimationReport | undefined {
    return state.report;
  }

  /**
   * Check if the estimation was successful
   */
  isSuccess(state: GraphState): boolean {
    return !state.shouldStop && state.errors.length === 0;
  }

  /**
   * Get a summary of the estimation results
   */
  getSummary(state: GraphState): {
    artifactsProcessed: number;
    requirementsExtracted: number;
    atomicWorksIdentified: number;
    estimatesGenerated: number;
    totalEstimatedHours: number;
    validationPassed: boolean;
    reportGenerated: boolean;
    errorCount: number;
  } {
    return {
      artifactsProcessed: state.artifacts.length,
      requirementsExtracted: state.requirements.length,
      atomicWorksIdentified: state.atomicWorks.length,
      estimatesGenerated: state.estimates.length,
      totalEstimatedHours: state.report?.totalHours || 0,
      validationPassed: state.validationStatus === "valid",
      reportGenerated: !!state.report,
      errorCount: state.errors.length,
    };
  }
}

/**
 * Module for managing and executing LangGraph agent nodes
 */
@Module({
  imports: [AiModule, PromptsModule, RagModule, CatalogsModule],
  providers: [
    // Node providers
    {
      provide: "VALIDATION_NODE",
      useFactory: (deps: AgentDependencies) => createValidationNode(deps),
      inject: ["AGENT_DEPENDENCIES"],
    },
    {
      provide: "EXTRACTION_NODE",
      useFactory: (deps: AgentDependencies) => createExtractionNode(deps),
      inject: ["AGENT_DEPENDENCIES"],
    },
    {
      provide: "DECOMPOSITION_NODE",
      useFactory: (deps: AgentDependencies) => createDecompositionNode(deps),
      inject: ["AGENT_DEPENDENCIES"],
    },
    {
      provide: "ESTIMATION_NODE",
      useFactory: (deps: AgentDependencies) => createEstimationNode(deps),
      inject: ["AGENT_DEPENDENCIES"],
    },
    {
      provide: "REPORTING_NODE",
      useFactory: (deps: AgentDependencies) => createReportingNode(deps),
      inject: ["AGENT_DEPENDENCIES"],
    },
    // Agent dependencies provider
    {
      provide: "AGENT_DEPENDENCIES",
      useFactory: (
        promptsService: PromptsService,
        llmProvider: LangchainLLMProvider,
        ragService: RagService,
        langfuseService: LangfuseService,
        catalogsService: CatalogsService,
      ): AgentDependencies => ({
        promptsService,
        llmProvider,
        ragService,
        langfuseService,
        catalogsService,
      }),
      inject: [
        PromptsService,
        LangchainLLMProvider,
        RagService,
        LangfuseService,
        CatalogsService,
      ],
    },
    // Graph service provider
    {
      provide: "GRAPH_SERVICE",
      useFactory: (deps: AgentDependencies) => new GraphService(deps),
      inject: ["AGENT_DEPENDENCIES"],
    },
    // GraphService class provider (uses AGENT_DEPENDENCIES token)
    {
      provide: GraphService,
      useFactory: (deps: AgentDependencies) => new GraphService(deps),
      inject: ["AGENT_DEPENDENCIES"],
    },
    AgentsService,
  ],
  exports: [
    AgentsService,
    GraphService,
    "VALIDATION_NODE",
    "EXTRACTION_NODE",
    "DECOMPOSITION_NODE",
    "ESTIMATION_NODE",
    "REPORTING_NODE",
    "GRAPH_SERVICE",
  ],
})
export class AgentsModule implements OnModuleInit {
  onModuleInit() {
    // Module initialization logic if needed
  }
}
