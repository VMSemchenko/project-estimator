import {
  AgentType,
  PromptContext,
} from "../../prompts/interfaces/prompt-context.interface";
import { BaseAgentNode } from "../base/base-agent";
import {
  EstimationState,
  NodeConfig,
  StateUpdate,
  Estimate,
  AppliedCoefficient,
} from "../interfaces/agent-state.interface";
import { AgentDependencies } from "../interfaces/agent.interface";
import { RagService } from "../../rag/rag.service";
import { RetrievedDocument } from "../../rag/interfaces/retrieved-document.interface";

/**
 * Estimation node for the LangGraph estimation pipeline
 * Calculates PERT estimates for each atomic work
 */
export class EstimationNode extends BaseAgentNode {
  readonly name = "estimation";
  readonly agentType = AgentType.ESTIMATION;

  private readonly ragService: RagService | null;

  constructor(dependencies: AgentDependencies) {
    super(dependencies);
    this.ragService = dependencies.ragService || null;
  }

  /**
   * Execute estimation logic
   */
  async execute(
    state: EstimationState,
    config?: NodeConfig,
  ): Promise<StateUpdate> {
    const startTime = this.logStart(state);

    try {
      // Validate required state
      this.validateState(state, ["atomicWorks"]);

      if (state.atomicWorks.length === 0) {
        this.logger.warn("No atomic works to estimate");
        return {
          estimates: [],
          currentStep: this.name,
        };
      }

      // Step 1: Query RAG for coefficients (single query)
      const coefficients = await this.queryCoefficients(state);

      // Step 2: Batch fetch all base hours (single query instead of N queries)
      const baseHoursMap = await this.batchGetBaseHours(state.atomicWorks);

      // Step 3: Calculate PERT estimates for each atomic work
      const estimates: Estimate[] = [];

      for (const work of state.atomicWorks) {
        // Skip works without valid IDs
        if (!work || !work.id) {
          this.logger.warn(
            `Skipping atomic work with missing ID: ${JSON.stringify(work)}`,
          );
          continue;
        }

        this.logger.debug(`Estimating work: ${work.id}`);

        // Get base hours from pre-fetched map or use default
        const baseHours = baseHoursMap.get(work.id) || 4;

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
      this.logger.warn(
        "RAG service not available, skipping coefficient lookup",
      );
      return [];
    }

    // Build a context string from requirements for coefficient matching
    const contextText = state.requirements
      .map((r) => `${r.title}: ${r.description}`)
      .join("\n");

    try {
      const result = await this.ragService.similaritySearch(contextText, {
        k: 5,
        scoreThreshold: 0.6,
        filter: { docType: "coefficient" },
      });

      this.logger.debug(
        `Found ${result.documents.length} relevant coefficients`,
      );
      return result.documents;
    } catch (error) {
      this.logger.error(`Coefficient query failed: ${error}`);
      return [];
    }
  }

  /**
   * Batch get base hours for all atomic works from RAG
   * This is more efficient than making N individual queries
   */
  private async batchGetBaseHours(
    works: EstimationState["atomicWorks"],
  ): Promise<Map<string, number>> {
    const baseHoursMap = new Map<string, number>();

    if (!this.ragService || works.length === 0) {
      return baseHoursMap;
    }

    // Get unique work IDs
    const uniqueIds = Array.from(
      new Set(works.map((w) => w.id).filter(Boolean)),
    );

    if (uniqueIds.length === 0) {
      return baseHoursMap;
    }

    this.logger.debug(
      `Batch fetching base hours for ${uniqueIds.length} unique work IDs`,
    );

    try {
      // Build a single query with all work IDs
      // Query for atomic works documents that match any of our IDs
      const queryText = uniqueIds.join(" ");

      const result = await this.ragService.similaritySearch(queryText, {
        k: Math.min(uniqueIds.length * 2, 100), // Get enough results
        filter: { docType: "atomic_work" },
      });

      // Build a map of work ID -> base hours
      for (const doc of result.documents) {
        const workId = doc.metadata?.id as string | undefined;
        if (workId && doc.metadata?.baseHours) {
          baseHoursMap.set(workId, Number(doc.metadata.baseHours));
        }
      }

      this.logger.debug(
        `Found base hours for ${baseHoursMap.size} of ${uniqueIds.length} works`,
      );
    } catch (error) {
      this.logger.warn(`Batch base hours query failed: ${error}`);
    }

    return baseHoursMap;
  }

  /**
   * Get base hours for an atomic work from RAG (legacy method, kept for reference)
   */
  private async getBaseHours(workId: string): Promise<number> {
    if (!this.ragService) {
      return 4; // Default base hours
    }

    try {
      // Use metadata.id for filtering as it's typically indexed
      // Note: MongoDB Atlas requires fields used in filters to be indexed
      const result = await this.ragService.similaritySearch(workId, {
        k: 1,
        filter: { docType: "atomic_work", "metadata.id": workId },
      });

      if (
        result.documents.length > 0 &&
        result.documents[0].metadata?.baseHours
      ) {
        return Number(result.documents[0].metadata.baseHours);
      }
    } catch (error) {
      this.logger.debug(
        `Could not retrieve base hours for ${workId}: ${error}`,
      );
    }

    return 4; // Default base hours
  }

  /**
   * Calculate PERT estimate using LLM
   */
  private async calculatePertEstimate(
    work: EstimationState["atomicWorks"][0],
    baseHours: number,
    coefficients: RetrievedDocument[],
    state: EstimationState,
  ): Promise<Estimate> {
    // Find the related requirement
    const requirement = state.requirements.find(
      (r) => r.id === work.requirementId,
    );

    // Build decomposition results for context - group atomic works by requirement
    const decompositionResults = this.buildDecompositionContext(state);

    // Build coefficients context
    const coefficientsContext = this.buildCoefficientsContext(coefficients);

    // Build context for LLM
    const context: PromptContext = {
      requirements: requirement ? [requirement] : [],
      decompositionResults,
      coefficients: coefficientsContext,
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
          confidence: "medium",
        },
      ],
    };

    // Also add atomic works catalog for reference
    if (coefficients.length > 0) {
      context.atomicWorksCatalog = coefficients.map((doc) => ({
        id: String(doc.metadata?.id || doc.id),
        name: String(doc.metadata?.name || "Coefficient"),
        baProcess: "coefficient",
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
        confidence: "high" | "medium" | "low";
      }>(context, {
        defaultValue: {
          optimistic: baseHours * 0.5,
          mostLikely: baseHours,
          pessimistic: baseHours * 2,
          appliedCoefficients: [],
          assumptions: [],
          confidence: "medium",
        },
      });

      // Ensure response has required fields with fallbacks
      const optimistic = response?.optimistic ?? baseHours * 0.5;
      const mostLikely = response?.mostLikely ?? baseHours;
      const pessimistic = response?.pessimistic ?? baseHours * 2;
      const appliedCoefficients = response?.appliedCoefficients ?? [];
      const assumptions = response?.assumptions ?? [];
      const confidence = response?.confidence ?? "medium";

      // Validate arrays are actually arrays
      const validAppliedCoefficients = Array.isArray(appliedCoefficients)
        ? appliedCoefficients
        : [];
      const validAssumptions = Array.isArray(assumptions) ? assumptions : [];

      // Calculate expected hours using PERT formula
      const expectedHours = this.calculatePert(
        optimistic,
        mostLikely,
        pessimistic,
      );

      return {
        requirementId: work.requirementId,
        atomicWorkId: work.id,
        baseHours,
        optimistic,
        mostLikely,
        pessimistic,
        expectedHours,
        appliedCoefficients: validAppliedCoefficients.map((c) => ({
          id: c.id,
          name: c.name,
          multiplier: c.multiplier,
          reason: c.reason,
        })),
        assumptions: validAssumptions,
        confidence,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate PERT estimate: ${error}`);

      // Fallback to basic PERT calculation
      const optimistic = baseHours * 0.5;
      const mostLikely = baseHours;
      const pessimistic = baseHours * 2;
      const expectedHours = this.calculatePert(
        optimistic,
        mostLikely,
        pessimistic,
      );

      return {
        requirementId: work.requirementId,
        atomicWorkId: work.id,
        baseHours,
        optimistic,
        mostLikely,
        pessimistic,
        expectedHours,
        appliedCoefficients: [],
        assumptions: ["Fallback estimate due to LLM error"],
        confidence: "low",
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
    atomicWorks: EstimationState["atomicWorks"],
  ): Map<string, Estimate[]> {
    const workToProcess = new Map<string, string>();
    for (const work of atomicWorks) {
      workToProcess.set(work.id, work.baProcess);
    }

    const grouped = new Map<string, Estimate[]>();

    for (const estimate of estimates) {
      const process = workToProcess.get(estimate.atomicWorkId) || "Unknown";
      if (!grouped.has(process)) {
        grouped.set(process, []);
      }
      grouped.get(process)!.push(estimate);
    }

    return grouped;
  }

  /**
   * Build decomposition results context for the prompt template
   * Groups atomic works by requirement ID
   */
  private buildDecompositionContext(state: EstimationState): Array<{
    requirementId: string;
    requirementTitle: string;
    atomicWorks: Array<{
      id: string;
      name: string;
      baProcess: string;
      rationale: string;
      requirementId: string;
    }>;
  }> {
    // Group atomic works by requirement
    const worksByRequirement = new Map<
      string,
      Array<{
        id: string;
        name: string;
        baProcess: string;
        rationale: string;
        requirementId: string;
      }>
    >();

    for (const work of state.atomicWorks) {
      if (!worksByRequirement.has(work.requirementId)) {
        worksByRequirement.set(work.requirementId, []);
      }
      worksByRequirement.get(work.requirementId)!.push({
        id: work.id,
        name: work.name,
        baProcess: work.baProcess,
        rationale: work.rationale,
        requirementId: work.requirementId,
      });
    }

    // Build decomposition results with requirement titles
    return state.requirements.map((req) => ({
      requirementId: req.id,
      requirementTitle: req.title,
      atomicWorks: worksByRequirement.get(req.id) || [],
    }));
  }

  /**
   * Build coefficients context for the prompt template
   */
  private buildCoefficientsContext(coefficients: RetrievedDocument[]): Array<{
    id: string;
    name: string;
    multiplier: number;
    criteria: string;
  }> {
    return coefficients.map((doc) => ({
      id: String(doc.metadata?.id || doc.id),
      name: String(doc.metadata?.name || "Coefficient"),
      multiplier: Number(doc.metadata?.multiplier || 1),
      criteria: doc.content.substring(0, 200),
    }));
  }
}

/**
 * Factory function to create estimation node
 */
export function createEstimationNode(
  dependencies: AgentDependencies,
): EstimationNode {
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
  throw new Error(
    "EstimationNode must be created via factory with dependencies",
  );
}
