import { Module, OnModuleInit, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { PromptsModule } from '../prompts/prompts.module';
import { RagModule } from '../rag/rag.module';
import { PromptsService } from '../prompts/prompts.service';
import { LangchainLLMProvider } from '../ai/providers/langchain-llm.provider';
import { LangfuseService } from '../ai/langfuse/langfuse.service';
import { RagService } from '../rag/rag.service';
import { Config } from '../config/configuration';

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
} from './nodes';
import { AgentDependencies } from './interfaces/agent.interface';
import {
  EstimationState,
  createInitialState,
  StateUpdate,
  EstimationReport,
} from './interfaces/agent-state.interface';
import { PipelineResult, PipelineSummary } from './interfaces/agent-result.interface';

/**
 * Service for orchestrating agent node execution
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly validationNode: ValidationNode,
    private readonly extractionNode: ExtractionNode,
    private readonly decompositionNode: DecompositionNode,
    private readonly estimationNode: EstimationNode,
    private readonly reportingNode: ReportingNode,
  ) {}

  /**
   * Run the complete estimation pipeline
   */
  async runEstimationPipeline(inputFolder: string): Promise<PipelineResult> {
    const startTime = Date.now();
    this.logger.log(`Starting estimation pipeline for: ${inputFolder}`);

    // Initialize state
    let state = createInitialState(inputFolder);
    const nodeResults: PipelineResult['nodeResults'] = [];

    try {
      // Step 1: Validation
      this.logger.log('Running validation node...');
      const validationResult = await this.validationNode.execute(state);
      nodeResults.push({
        success: !validationResult.shouldStop,
        stateUpdate: validationResult,
        errors: validationResult.errors || [],
        duration: 0,
        nodeName: 'validation',
      });
      state = this.mergeState(state, validationResult);

      if (state.shouldStop) {
        this.logger.warn('Pipeline stopped after validation');
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 2: Extraction
      this.logger.log('Running extraction node...');
      const extractionResult = await this.extractionNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: extractionResult,
        errors: [],
        duration: 0,
        nodeName: 'extraction',
      });
      state = this.mergeState(state, extractionResult);

      if (state.shouldStop) {
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 3: Decomposition
      this.logger.log('Running decomposition node...');
      const decompositionResult = await this.decompositionNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: decompositionResult,
        errors: [],
        duration: 0,
        nodeName: 'decomposition',
      });
      state = this.mergeState(state, decompositionResult);

      if (state.shouldStop) {
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 4: Estimation
      this.logger.log('Running estimation node...');
      const estimationResult = await this.estimationNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: estimationResult,
        errors: [],
        duration: 0,
        nodeName: 'estimation',
      });
      state = this.mergeState(state, estimationResult);

      if (state.shouldStop) {
        return this.createPipelineResult(state, nodeResults, startTime);
      }

      // Step 5: Reporting
      this.logger.log('Running reporting node...');
      const reportingResult = await this.reportingNode.execute(state);
      nodeResults.push({
        success: true,
        stateUpdate: reportingResult,
        errors: [],
        duration: 0,
        nodeName: 'reporting',
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
            node: 'pipeline',
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
      case 'validation':
        return this.validationNode.execute(state);
      case 'extraction':
        return this.extractionNode.execute(state);
      case 'decomposition':
        return this.decompositionNode.execute(state);
      case 'estimation':
        return this.estimationNode.execute(state);
      case 'reporting':
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
      errors: update.errors ? [...state.errors, ...update.errors] : state.errors,
    };
  }

  /**
   * Create pipeline result from final state
   */
  private createPipelineResult(
    state: EstimationState,
    nodeResults: PipelineResult['nodeResults'],
    startTime: number,
  ): PipelineResult {
    const totalDuration = Date.now() - startTime;

    const summary: PipelineSummary = {
      artifactsProcessed: state.artifacts.length,
      requirementsExtracted: state.requirements.length,
      atomicWorksIdentified: state.atomicWorks.length,
      estimatesGenerated: state.estimates.length,
      totalEstimatedHours: state.report?.totalHours || 0,
      validationPassed: state.validationStatus === 'valid',
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
 * Module for managing and executing LangGraph agent nodes
 */
@Module({
  imports: [AiModule, PromptsModule, RagModule],
  providers: [
    // Node providers
    {
      provide: 'VALIDATION_NODE',
      useFactory: (deps: AgentDependencies) => createValidationNode(deps),
      inject: ['AGENT_DEPENDENCIES'],
    },
    {
      provide: 'EXTRACTION_NODE',
      useFactory: (deps: AgentDependencies) => createExtractionNode(deps),
      inject: ['AGENT_DEPENDENCIES'],
    },
    {
      provide: 'DECOMPOSITION_NODE',
      useFactory: (deps: AgentDependencies) => createDecompositionNode(deps),
      inject: ['AGENT_DEPENDENCIES'],
    },
    {
      provide: 'ESTIMATION_NODE',
      useFactory: (deps: AgentDependencies) => createEstimationNode(deps),
      inject: ['AGENT_DEPENDENCIES'],
    },
    {
      provide: 'REPORTING_NODE',
      useFactory: (deps: AgentDependencies) => createReportingNode(deps),
      inject: ['AGENT_DEPENDENCIES'],
    },
    // Agent dependencies provider
    {
      provide: 'AGENT_DEPENDENCIES',
      useFactory: (
        promptsService: PromptsService,
        llmProvider: LangchainLLMProvider,
        ragService: RagService,
        langfuseService: LangfuseService,
      ): AgentDependencies => ({
        promptsService,
        llmProvider,
        ragService,
        langfuseService,
      }),
      inject: [PromptsService, LangchainLLMProvider, RagService, LangfuseService],
    },
    AgentsService,
  ],
  exports: [
    AgentsService,
    'VALIDATION_NODE',
    'EXTRACTION_NODE',
    'DECOMPOSITION_NODE',
    'ESTIMATION_NODE',
    'REPORTING_NODE',
  ],
})
export class AgentsModule implements OnModuleInit {
  onModuleInit() {
    // Module initialization logic if needed
  }
}
