import { AgentType, PromptContext } from '../../prompts/interfaces/prompt-context.interface';
import { BaseAgentNode } from '../base/base-agent';
import {
  EstimationState,
  NodeConfig,
  StateUpdate,
  Estimate,
  AppliedCoefficient,
} from '../interfaces/agent-state.interface';
import { AgentDependencies } from '../interfaces/agent.interface';
import { RagService } from '../../rag/rag.service';
import { RetrievedDocument } from '../../rag/interfaces/retrieved-document.interface';

/**
 * Estimation node for the LangGraph estimation pipeline
 * Calculates PERT estimates for each atomic work
 */
export class EstimationNode extends BaseAgentNode {
  readonly name = 'estimation';
  readonly agentType = AgentType.ESTIMATION;

  private readonly ragService: RagService | null;

  constructor(dependencies: AgentDependencies) {
    super(dependencies);
    this.ragService = dependencies.ragService || null;
  }

  /**
   * Execute estimation logic
   */
  async execute(state: EstimationState, config?: NodeConfig): Promise<StateUpdate> {
    const startTime = this.logStart(state);

    try {
      // Validate required state
      this.validateState(state, ['atomicWorks']);

      if (state.atomicWorks.length === 0) {
        this.logger.warn('No atomic works to estimate');
        return {
          estimates: [],
          currentStep: this.name,
        };
      }

      // Step 1: Query RAG for coefficients
      const coefficients = await this.queryCoefficients(state);

      // Step 2: Calculate PERT estimates for each atomic work
      const estimates: Estimate[] = [];

      for (const work of state.atomicWorks) {
        this.logger.debug(`Estimating work: ${work.id}`);

        // Get base hours from RAG or use default
        const baseHours = await this.getBaseHours(work.id);

        // Calculate PERT estimate using LLM
        const estimate = await this.calculatePertEstimate(
          work,
          baseHours,
          coefficients,
          state,
        );

        estimates.push(estimate);
      }

      this.logger.log(`Generated ${estimates.length} estimates`);

      const update: StateUpdate = {
        estimates,
      };

      return this.createSuccessUpdate(update, startTime);
    } catch (error) {
      return this.handleError(error, state);
    }
  }

  /**
   * Query RAG for complexity coefficients
   */
  private async queryCoefficients(
    state: EstimationState,
  ): Promise<RetrievedDocument[]> {
    if (!this.ragService) {
      this.logger.warn('RAG service not available, skipping coefficient lookup');
      return [];
    }

    // Build a context string from requirements for coefficient matching
    const contextText = state.requirements
      .map((r) => `${r.title}: ${r.description}`)
      .join('\n');

    try {
      const result = await this.ragService.similaritySearch(contextText, {
        k: 5,
        scoreThreshold: 0.6,
        filter: { docType: 'coefficient' },
      });

      this.logger.debug(`Found ${result.documents.length} relevant coefficients`);
      return result.documents;
    } catch (error) {
      this.logger.error(`Coefficient query failed: ${error}`);
      return [];
    }
  }

  /**
   * Get base hours for an atomic work from RAG
   */
  private async getBaseHours(workId: string): Promise<number> {
    if (!this.ragService) {
      return 4; // Default base hours
    }

    try {
      const result = await this.ragService.similaritySearch(workId, {
        k: 1,
        filter: { docType: 'atomic_work', id: workId },
      });

      if (result.documents.length > 0 && result.documents[0].metadata?.baseHours) {
        return Number(result.documents[0].metadata.baseHours);
      }
    } catch (error) {
      this.logger.debug(`Could not retrieve base hours for ${workId}: ${error}`);
    }

    return 4; // Default base hours
  }

  /**
   * Calculate PERT estimate using LLM
   */
  private async calculatePertEstimate(
    work: EstimationState['atomicWorks'][0],
    baseHours: number,
    coefficients: RetrievedDocument[],
    state: EstimationState,
  ): Promise<Estimate> {
    // Find the related requirement
    const requirement = state.requirements.find(
      (r) => r.id === work.requirementId,
    );

    // Build context for LLM
    const context: PromptContext = {
      requirements: requirement ? [requirement] : [],
      estimates: [
        {
          requirementId: work.requirementId,
          atomicWorkId: work.id,
          baseHours,
          optimistic: baseHours * 0.5,
          mostLikely: baseHours,
          pessimistic: baseHours * 2,
          expectedHours: baseHours,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'medium',
        },
      ],
    };

    // Add coefficient references
    if (coefficients.length > 0) {
      context.atomicWorksCatalog = coefficients.map((doc) => ({
        id: String(doc.metadata?.id || doc.id),
        name: String(doc.metadata?.name || 'Coefficient'),
        baProcess: 'coefficient',
        baseHours: Number(doc.metadata?.multiplier || 1),
        description: doc.content.substring(0, 300),
      }));
    }

    try {
      // Invoke LLM for PERT estimation
      const response = await this.invokeLLMJson<{
        optimistic: number;
        mostLikely: number;
        pessimistic: number;
        appliedCoefficients: Array<{
          id: string;
          name: string;
          multiplier: number;
          reason: string;
        }>;
        assumptions: string[];
        confidence: 'high' | 'medium' | 'low';
      }>(context, {
        defaultValue: {
          optimistic: baseHours * 0.5,
          mostLikely: baseHours,
          pessimistic: baseHours * 2,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'medium',
        },
      });

      // Calculate expected hours using PERT formula
      const expectedHours = this.calculatePert(
        response.optimistic,
        response.mostLikely,
        response.pessimistic,
      );

      return {
        requirementId: work.requirementId,
        atomicWorkId: work.id,
        baseHours,
        optimistic: response.optimistic,
        mostLikely: response.mostLikely,
        pessimistic: response.pessimistic,
        expectedHours,
        appliedCoefficients: response.appliedCoefficients.map((c) => ({
          id: c.id,
          name: c.name,
          multiplier: c.multiplier,
          reason: c.reason,
        })),
        assumptions: response.assumptions,
        confidence: response.confidence,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate PERT estimate: ${error}`);

      // Fallback to basic PERT calculation
      const optimistic = baseHours * 0.5;
      const mostLikely = baseHours;
      const pessimistic = baseHours * 2;
      const expectedHours = this.calculatePert(optimistic, mostLikely, pessimistic);

      return {
        requirementId: work.requirementId,
        atomicWorkId: work.id,
        baseHours,
        optimistic,
        mostLikely,
        pessimistic,
        expectedHours,
        appliedCoefficients: [],
        assumptions: ['Fallback estimate due to LLM error'],
        confidence: 'low',
      };
    }
  }

  /**
   * Calculate total estimated hours
   */
  calculateTotalHours(estimates: Estimate[]): number {
    return estimates.reduce((sum, e) => sum + e.expectedHours, 0);
  }

  /**
   * Group estimates by requirement
   */
  groupByRequirement(estimates: Estimate[]): Map<string, Estimate[]> {
    const grouped = new Map<string, Estimate[]>();

    for (const estimate of estimates) {
      const reqId = estimate.requirementId;
      if (!grouped.has(reqId)) {
        grouped.set(reqId, []);
      }
      grouped.get(reqId)!.push(estimate);
    }

    return grouped;
  }

  /**
   * Group estimates by BA process
   */
  groupByProcess(
    estimates: Estimate[],
    atomicWorks: EstimationState['atomicWorks'],
  ): Map<string, Estimate[]> {
    const workToProcess = new Map<string, string>();
    for (const work of atomicWorks) {
      workToProcess.set(work.id, work.baProcess);
    }

    const grouped = new Map<string, Estimate[]>();

    for (const estimate of estimates) {
      const process = workToProcess.get(estimate.atomicWorkId) || 'Unknown';
      if (!grouped.has(process)) {
        grouped.set(process, []);
      }
      grouped.get(process)!.push(estimate);
    }

    return grouped;
  }
}

/**
 * Factory function to create estimation node
 */
export function createEstimationNode(dependencies: AgentDependencies): EstimationNode {
  return new EstimationNode(dependencies);
}

/**
 * LangGraph node function wrapper
 */
export async function estimationNode(
  state: EstimationState,
  config?: NodeConfig,
): Promise<StateUpdate> {
  // This is a placeholder - in actual implementation, the node instance
  // would be created by the module and injected
  throw new Error('EstimationNode must be created via factory with dependencies');
}
