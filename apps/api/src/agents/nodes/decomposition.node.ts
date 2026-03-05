import { AgentType, PromptContext } from '../../prompts/interfaces/prompt-context.interface';
import { BaseAgentNode } from '../base/base-agent';
import {
  EstimationState,
  NodeConfig,
  StateUpdate,
  AtomicWorkMapping,
} from '../interfaces/agent-state.interface';
import { AgentDependencies } from '../interfaces/agent.interface';
import { RagService } from '../../rag/rag.service';
import { RetrievedDocument } from '../../rag/interfaces/retrieved-document.interface';

/**
 * Decomposition node for the LangGraph estimation pipeline
 * Decomposes requirements into atomic BA works using RAG
 */
export class DecompositionNode extends BaseAgentNode {
  readonly name = 'decomposition';
  readonly agentType = AgentType.DECOMPOSITION;

  private readonly ragService: RagService | null;

  constructor(dependencies: AgentDependencies) {
    super(dependencies);
    this.ragService = dependencies.ragService || null;
  }

  /**
   * Execute decomposition logic
   */
  async execute(state: EstimationState, config?: NodeConfig): Promise<StateUpdate> {
    const startTime = this.logStart(state);

    try {
      // Validate required state
      this.validateState(state, ['requirements']);

      if (state.requirements.length === 0) {
        this.logger.warn('No requirements to decompose');
        return {
          atomicWorks: [],
          currentStep: this.name,
        };
      }

      // Step 1: Query RAG for relevant atomic works for each requirement
      const atomicWorksMappings: AtomicWorkMapping[] = [];

      for (const requirement of state.requirements) {
        this.logger.debug(`Decomposing requirement: ${requirement.id}`);

        // Query RAG for relevant atomic works
        const relevantWorks = await this.queryRelevantAtomicWorks(requirement.description);

        // Use LLM to map requirement to atomic works
        const mappings = await this.mapRequirementToAtomicWorks(
          requirement,
          relevantWorks,
          state,
        );

        atomicWorksMappings.push(...mappings);
      }

      this.logger.log(`Created ${atomicWorksMappings.length} atomic work mappings`);

      const update: StateUpdate = {
        atomicWorks: atomicWorksMappings,
      };

      return this.createSuccessUpdate(update, startTime);
    } catch (error) {
      return this.handleError(error, state);
    }
  }

  /**
   * Query RAG for relevant atomic works
   */
  private async queryRelevantAtomicWorks(
    requirementDescription: string,
  ): Promise<RetrievedDocument[]> {
    if (!this.ragService) {
      this.logger.warn('RAG service not available, returning empty results');
      return [];
    }

    try {
      const result = await this.ragService.similaritySearch(
        requirementDescription,
        {
          k: 10,
          scoreThreshold: 0.5,
          filter: { docType: 'atomic_work' },
        },
      );

      this.logger.debug(
        `Found ${result.documents.length} relevant atomic works for requirement`,
      );

      return result.documents;
    } catch (error) {
      this.logger.error(`RAG query failed: ${error}`);
      return [];
    }
  }

  /**
   * Map a requirement to atomic works using LLM
   */
  private async mapRequirementToAtomicWorks(
    requirement: EstimationState['requirements'][0],
    relevantWorks: RetrievedDocument[],
    state: EstimationState,
  ): Promise<AtomicWorkMapping[]> {
    // Build context for LLM
    const context: PromptContext = {
      requirements: [requirement],
      atomicWorksCatalog: relevantWorks.map((doc) => ({
        id: String(doc.metadata?.id || doc.id),
        name: String(doc.metadata?.name || 'Unknown'),
        baProcess: String(doc.metadata?.baProcess || 'Unknown'),
        baseHours: Number(doc.metadata?.baseHours || 0),
        description: doc.content.substring(0, 500),
      })),
    };

    try {
      // Invoke LLM for decomposition
      const response = await this.invokeLLMJson<{
        mappings: Array<{
          atomicWorkId: string;
          atomicWorkName: string;
          baProcess: string;
          rationale: string;
        }>;
      }>(context, {
        defaultValue: { mappings: [] },
      });

      // Transform to atomic work mappings
      return response.mappings.map((mapping) => ({
        id: mapping.atomicWorkId,
        name: mapping.atomicWorkName,
        baProcess: mapping.baProcess,
        rationale: mapping.rationale,
        requirementId: requirement.id,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to map requirement ${requirement.id}: ${error}`,
      );

      // Fallback: create basic mappings from RAG results
      return relevantWorks.slice(0, 3).map((doc) => ({
        id: String(doc.metadata?.id || doc.id),
        name: String(doc.metadata?.name || 'Unknown Work'),
        baProcess: String(doc.metadata?.baProcess || 'Unknown'),
        rationale: `Automatically matched based on similarity (score: ${doc.score?.toFixed(2)})`,
        requirementId: requirement.id,
      }));
    }
  }

  /**
   * Group atomic works by BA process
   */
  groupByProcess(mappings: AtomicWorkMapping[]): Map<string, AtomicWorkMapping[]> {
    const grouped = new Map<string, AtomicWorkMapping[]>();

    for (const mapping of mappings) {
      const process = mapping.baProcess;
      if (!grouped.has(process)) {
        grouped.set(process, []);
      }
      grouped.get(process)!.push(mapping);
    }

    return grouped;
  }

  /**
   * Get unique atomic works from mappings
   */
  getUniqueWorks(mappings: AtomicWorkMapping[]): AtomicWorkMapping[] {
    const seen = new Set<string>();
    const unique: AtomicWorkMapping[] = [];

    for (const mapping of mappings) {
      if (!seen.has(mapping.id)) {
        seen.add(mapping.id);
        unique.push(mapping);
      }
    }

    return unique;
  }
}

/**
 * Factory function to create decomposition node
 */
export function createDecompositionNode(dependencies: AgentDependencies): DecompositionNode {
  return new DecompositionNode(dependencies);
}

/**
 * LangGraph node function wrapper
 */
export async function decompositionNode(
  state: EstimationState,
  config?: NodeConfig,
): Promise<StateUpdate> {
  // This is a placeholder - in actual implementation, the node instance
  // would be created by the module and injected
  throw new Error('DecompositionNode must be created via factory with dependencies');
}
