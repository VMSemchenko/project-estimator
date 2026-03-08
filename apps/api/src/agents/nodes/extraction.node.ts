import {
  AgentType,
  PromptContext,
  NormalizedRequirement,
} from "../../prompts/interfaces/prompt-context.interface";
import { BaseAgentNode } from "../base/base-agent";
import {
  EstimationState,
  NodeConfig,
  StateUpdate,
} from "../interfaces/agent-state.interface";
import { AgentDependencies } from "../interfaces/agent.interface";

/**
 * Extraction node for the LangGraph estimation pipeline
 * Extracts and normalizes requirements from ShRD document
 */
export class ExtractionNode extends BaseAgentNode {
  readonly name = "extraction";
  readonly agentType = AgentType.EXTRACTION;

  constructor(dependencies: AgentDependencies) {
    super(dependencies);
  }

  /**
   * Execute extraction logic
   */
  async execute(
    state: EstimationState,
    config?: NodeConfig,
  ): Promise<StateUpdate> {
    const startTime = this.logStart(state);

    try {
      // Validate required state
      this.validateState(state, ["artifacts", "validationStatus"]);

      // Check if validation passed
      if (state.validationStatus === "invalid") {
        this.logger.warn("Skipping extraction due to failed validation");
        return {
          requirements: [],
          currentStep: this.name,
        };
      }

      // Step 1: Find the ShRD document
      const shrdDocument = this.findShRDDocument(state.artifacts);
      if (!shrdDocument) {
        throw new Error("ShRD document not found in artifacts");
      }

      // Step 2: Use LLM to extract requirements
      const extractedRequirements = await this.extractRequirementsWithLLM(
        shrdDocument.content,
        state,
      );

      // Step 3: Normalize and assign IDs
      const normalizedRequirements = this.normalizeRequirements(
        extractedRequirements,
        shrdDocument.name,
      );

      this.logger.log(
        `Extracted ${normalizedRequirements.length} requirements`,
      );

      const update: StateUpdate = {
        requirements: normalizedRequirements,
      };

      return this.createSuccessUpdate(update, startTime);
    } catch (error) {
      return this.handleError(error, state);
    }
  }

  /**
   * Find the ShRD document from artifacts
   */
  private findShRDDocument(
    artifacts: EstimationState["artifacts"],
  ): EstimationState["artifacts"][0] | null {
    // Look for ShRD by type
    const shrd = artifacts.find((a) => a.type === "ShRD");
    if (shrd) return shrd;

    // Fallback: look by filename patterns
    return (
      artifacts.find(
        (a) =>
          /stakeholder\s*requirements/i.test(a.name) ||
          /shrd/i.test(a.name) ||
          /requirements\.md$/i.test(a.name),
      ) || null
    );
  }

  /**
   * Extract requirements using LLM
   */
  private async extractRequirementsWithLLM(
    documentContent: string,
    state: EstimationState,
  ): Promise<Partial<NormalizedRequirement>[]> {
    // Find Business Vision document for context
    const businessVisionDoc = this.findBusinessVisionDocument(state.artifacts);

    // Build context for LLM
    const context: PromptContext = {
      documentContent: documentContent.substring(0, 50000), // Limit content size
      stakeholderRequirements: documentContent.substring(0, 50000),
      businessVision:
        businessVisionDoc?.content.substring(0, 50000) || "Not available",
    };

    try {
      // Invoke LLM for requirement extraction
      // The prompt template returns a direct array of requirements, not wrapped in an object
      const response = await this.invokeLLMJson<Partial<NormalizedRequirement>[]>(
        context,
        {
          defaultValue: [],
        },
      );

      // Ensure response is a valid array
      if (!response || !Array.isArray(response)) {
        this.logger.warn(
          "LLM response is not a valid requirements array, returning empty array",
        );
        return [];
      }

      return response;
    } catch (error) {
      this.logger.error(`Failed to extract requirements: ${error}`);
      throw error;
    }
  }

  /**
   * Find the Business Vision document from artifacts
   */
  private findBusinessVisionDocument(
    artifacts: EstimationState["artifacts"],
  ): EstimationState["artifacts"][0] | null {
    // Look for BV by type
    const bv = artifacts.find((a) => a.type === "BV");
    if (bv) return bv;

    // Fallback: look by filename patterns
    return (
      artifacts.find(
        (a) =>
          /business\s*vision/i.test(a.name) ||
          /bv/i.test(a.name) ||
          /vision\.md$/i.test(a.name),
      ) || null
    );
  }

  /**
   * Normalize requirements and assign IDs
   */
  private normalizeRequirements(
    extracted: Partial<NormalizedRequirement>[],
    sourceDocument: string,
  ): NormalizedRequirement[] {
    return extracted.map((req, index) => {
      const id = this.generateRequirementId(index);

      return {
        id,
        title: req.title || `Requirement ${index + 1}`,
        description: req.description || req.originalText || "",
        originalText: req.originalText || req.description || "",
        type: this.normalizeRequirementType(req.type),
        acceptanceCriteria: req.acceptanceCriteria || [],
        priority: this.normalizePriority(req.priority),
        sourceDocument,
      };
    });
  }

  /**
   * Generate a requirement ID
   */
  private generateRequirementId(index: number): string {
    return `REQ-${String(index + 1).padStart(3, "0")}`;
  }

  /**
   * Normalize requirement type
   */
  private normalizeRequirementType(
    type: string | undefined,
  ): "functional" | "non-functional" | "constraint" {
    if (!type) return "functional";

    const typeLower = type.toLowerCase();
    if (
      typeLower.includes("non-functional") ||
      typeLower.includes("nonfunctional")
    ) {
      return "non-functional";
    }
    if (typeLower.includes("constraint") || typeLower.includes("limitation")) {
      return "constraint";
    }
    return "functional";
  }

  /**
   * Normalize priority level
   */
  private normalizePriority(
    priority: string | undefined,
  ): "high" | "medium" | "low" {
    if (!priority) return "medium";

    const priorityLower = priority.toLowerCase();
    if (
      priorityLower.includes("high") ||
      priorityLower.includes("critical") ||
      priorityLower.includes("must")
    ) {
      return "high";
    }
    if (
      priorityLower.includes("low") ||
      priorityLower.includes("nice") ||
      priorityLower.includes("optional")
    ) {
      return "low";
    }
    return "medium";
  }
}

/**
 * Factory function to create extraction node
 */
export function createExtractionNode(
  dependencies: AgentDependencies,
): ExtractionNode {
  return new ExtractionNode(dependencies);
}

/**
 * LangGraph node function wrapper
 */
export async function extractionNode(
  state: EstimationState,
  config?: NodeConfig,
): Promise<StateUpdate> {
  // This is a placeholder - in actual implementation, the node instance
  // would be created by the module and injected
  throw new Error(
    "ExtractionNode must be created via factory with dependencies",
  );
}
