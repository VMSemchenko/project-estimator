import * as fs from "fs";
import * as path from "path";
import {
  AgentType,
  PromptContext,
} from "../../prompts/interfaces/prompt-context.interface";
import { BaseAgentNode } from "../base/base-agent";
import {
  EstimationState,
  NodeConfig,
  StateUpdate,
  Artifact,
  ValidationReport,
} from "../interfaces/agent-state.interface";
import { AgentDependencies } from "../interfaces/agent.interface";

/**
 * Required document types for validation
 */
const REQUIRED_DOCUMENTS = ["BV", "ShRD"];

/**
 * Document type patterns for identification
 */
const DOCUMENT_PATTERNS: Record<string, RegExp[]> = {
  BV: [/business\s*vision/i, /bv/i, /vision\s*document/i],
  ShRD: [/stakeholder\s*requirements/i, /shrd/i, /requirements\s*document/i],
};

/**
 * Validation node for the LangGraph estimation pipeline
 * Validates input artifacts for completeness and quality
 */
export class ValidationNode extends BaseAgentNode {
  readonly name = "validation";
  readonly agentType = AgentType.VALIDATION;

  constructor(dependencies: AgentDependencies) {
    super(dependencies);
  }

  /**
   * Execute validation logic
   */
  async execute(
    state: EstimationState,
    config?: NodeConfig,
  ): Promise<StateUpdate> {
    const startTime = this.logStart(state);

    try {
      // Step 1: Read input folder and discover artifacts
      const artifacts = await this.discoverArtifacts(state.inputFolder);

      // Step 2: Check required documents exist
      const documentCheck = this.checkRequiredDocuments(artifacts);

      // Step 3: Use LLM to validate document quality
      const qualityCheck = await this.validateDocumentQuality(artifacts);

      // Step 4: Build validation report
      const validationReport: ValidationReport = {
        status: this.determineValidationStatus(documentCheck, qualityCheck),
        missingArtifacts: documentCheck.missing,
        qualityIssues: qualityCheck.issues,
        recommendations: qualityCheck.recommendations,
        canProceed:
          documentCheck.missing.length === 0 && qualityCheck.canProceed,
      };

      // Step 5: Determine if pipeline should continue
      const shouldStop = !validationReport.canProceed;

      const update: StateUpdate = {
        artifacts,
        validationStatus: validationReport.status,
        validationReport,
        shouldStop,
      };

      return this.createSuccessUpdate(update, startTime);
    } catch (error) {
      return this.handleError(error, state);
    }
  }

  /**
   * Discover and load artifacts from the input folder
   */
  private async discoverArtifacts(inputFolder: string): Promise<Artifact[]> {
    this.logger.log(`Discovering artifacts in: ${inputFolder}`);

    if (!fs.existsSync(inputFolder)) {
      throw new Error(`Input folder does not exist: ${inputFolder}`);
    }

    const artifacts: Artifact[] = [];
    const files = fs.readdirSync(inputFolder);

    for (const file of files) {
      const filePath = path.join(inputFolder, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();

        // Only process supported file types
        if ([".md", ".txt", ".docx", ".pdf"].includes(ext)) {
          const content = await this.readFileContent(filePath, ext);

          artifacts.push({
            name: file,
            path: filePath,
            content,
            type: this.identifyDocumentType(file, content),
          });
        }
      }
    }

    this.logger.log(`Discovered ${artifacts.length} artifacts`);
    return artifacts;
  }

  /**
   * Read file content based on file type
   */
  private async readFileContent(
    filePath: string,
    ext: string,
  ): Promise<string> {
    if (ext === ".md" || ext === ".txt") {
      return fs.readFileSync(filePath, "utf-8");
    }

    // For .docx and .pdf, we would need additional libraries
    // For now, return a placeholder
    this.logger.warn(`File type ${ext} not fully supported, reading as text`);
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      return `[Binary content from ${path.basename(filePath)}]`;
    }
  }

  /**
   * Identify document type based on filename and content
   */
  private identifyDocumentType(filename: string, content: string): string {
    const filenameLower = filename.toLowerCase();
    const contentSample = content.substring(0, 2000).toLowerCase();

    for (const [docType, patterns] of Object.entries(DOCUMENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(filenameLower) || pattern.test(contentSample)) {
          return docType;
        }
      }
    }

    return "unknown";
  }

  /**
   * Check if all required documents are present
   */
  private checkRequiredDocuments(artifacts: Artifact[]): {
    found: string[];
    missing: string[];
  } {
    const foundTypes = new Set(artifacts.map((a) => a.type));
    const missing = REQUIRED_DOCUMENTS.filter((type) => !foundTypes.has(type));
    const found = REQUIRED_DOCUMENTS.filter((type) => foundTypes.has(type));

    return { found, missing };
  }

  /**
   * Validate document quality using LLM
   */
  private async validateDocumentQuality(artifacts: Artifact[]): Promise<{
    issues: string[];
    recommendations: string[];
    canProceed: boolean;
  }> {
    // Build context for LLM
    const context: PromptContext = {
      inputFolderPath: "",
      discoveredFiles: artifacts.map((a) => ({
        name: a.name,
        path: a.path,
        content: a.content, // Full document content for accurate validation
        type: a.type,
      })),
    };

    // Default response for fallback
    const defaultResponse = {
      issues: [] as string[],
      recommendations: [] as string[],
      canProceed: true,
    };

    try {
      // Invoke LLM for quality validation
      const response = await this.invokeLLMJson<{
        issues: string[];
        recommendations: string[];
        canProceed: boolean;
      }>(context, {
        defaultValue: defaultResponse,
      });

      // Ensure the response has the expected structure
      // The LLM might return a valid JSON but with missing fields
      return {
        issues: Array.isArray(response?.issues) ? response.issues : [],
        recommendations: Array.isArray(response?.recommendations)
          ? response.recommendations
          : [],
        canProceed:
          typeof response?.canProceed === "boolean"
            ? response.canProceed
            : true,
      };
    } catch (error) {
      this.logger.warn(
        `Quality validation failed, proceeding with basic checks: ${error}`,
      );

      // Fallback to basic validation
      const issues: string[] = [];
      const recommendations: string[] = [];

      for (const artifact of artifacts) {
        if (artifact.content && artifact.content.length < 100) {
          issues.push(`Document ${artifact.name} appears to be too short`);
        }
      }

      return {
        issues,
        recommendations,
        canProceed: issues.length === 0,
      };
    }
  }

  /**
   * Determine overall validation status
   */
  private determineValidationStatus(
    documentCheck: { found: string[]; missing: string[] },
    qualityCheck: { issues: string[]; canProceed: boolean },
  ): "valid" | "invalid" | "pending" {
    if (documentCheck.missing.length > 0) {
      return "invalid";
    }

    if (qualityCheck.issues.length > 0 && !qualityCheck.canProceed) {
      return "invalid";
    }

    if (qualityCheck.issues.length > 0) {
      return "valid"; // Valid with warnings
    }

    return "valid";
  }
}

/**
 * Factory function to create validation node
 */
export function createValidationNode(
  dependencies: AgentDependencies,
): ValidationNode {
  return new ValidationNode(dependencies);
}

/**
 * LangGraph node function wrapper
 */
export async function validationNode(
  state: EstimationState,
  config?: NodeConfig,
): Promise<StateUpdate> {
  // This is a placeholder - in actual implementation, the node instance
  // would be created by the module and injected
  throw new Error(
    "ValidationNode must be created via factory with dependencies",
  );
}
