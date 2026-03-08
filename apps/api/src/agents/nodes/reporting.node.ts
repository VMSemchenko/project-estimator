import {
  AgentType,
  PromptContext,
} from "../../prompts/interfaces/prompt-context.interface";
import { BaseAgentNode } from "../base/base-agent";
import {
  EstimationState,
  NodeConfig,
  StateUpdate,
  EstimationReport,
  ProcessSummary,
  RequirementSummary,
} from "../interfaces/agent-state.interface";
import { AgentDependencies } from "../interfaces/agent.interface";

/**
 * Reporting node for the LangGraph estimation pipeline
 * Generates final markdown and CSV reports
 */
export class ReportingNode extends BaseAgentNode {
  readonly name = "reporting";
  readonly agentType = AgentType.REPORTING;

  constructor(dependencies: AgentDependencies) {
    super(dependencies);
  }

  /**
   * Execute reporting logic
   */
  async execute(
    state: EstimationState,
    config?: NodeConfig,
  ): Promise<StateUpdate> {
    const startTime = this.logStart(state);

    try {
      // Validate required state
      this.validateState(state, ["estimates"]);

      if (state.estimates.length === 0) {
        this.logger.warn("No estimates to report");
        return {
          report: this.createEmptyReport(state),
          currentStep: this.name,
        };
      }

      // Step 1: Aggregate estimates
      const summaryByProcess = this.aggregateByProcess(state);
      const summaryByRequirement = this.aggregateByRequirement(state);
      const totalHours = this.calculateTotalHours(state.estimates);

      // Step 2: Generate markdown report using LLM
      const markdownContent = await this.generateMarkdownReport(state, {
        totalHours,
        summaryByProcess,
        summaryByRequirement,
      });

      // Step 3: Generate CSV content
      const csvContent = this.generateCsvContent(state);

      // Step 4: Build final report
      const report: EstimationReport = {
        timestamp: new Date().toISOString(),
        inputFolder: state.inputFolder,
        totalHours,
        summaryByProcess,
        summaryByRequirement,
        estimates: state.estimates,
        markdownContent,
        csvContent,
      };

      this.logger.log(
        `Generated report with total hours: ${this.formatHours(totalHours)}`,
      );

      const update: StateUpdate = {
        report,
      };

      return this.createSuccessUpdate(update, startTime);
    } catch (error) {
      return this.handleError(error, state);
    }
  }

  /**
   * Create an empty report for cases with no estimates
   */
  private createEmptyReport(state: EstimationState): EstimationReport {
    return {
      timestamp: new Date().toISOString(),
      inputFolder: state.inputFolder,
      totalHours: 0,
      summaryByProcess: [],
      summaryByRequirement: [],
      estimates: [],
      markdownContent: "# BA Work Estimation Report\n\nNo estimates generated.",
      csvContent: "",
    };
  }

  /**
   * Aggregate estimates by BA process
   */
  private aggregateByProcess(state: EstimationState): ProcessSummary[] {
    const processMap = new Map<string, { hours: number; count: number }>();

    for (const work of state.atomicWorks) {
      const process = work.baProcess;
      const estimate = state.estimates.find((e) => e.atomicWorkId === work.id);

      if (estimate) {
        const existing = processMap.get(process) || { hours: 0, count: 0 };
        processMap.set(process, {
          hours: existing.hours + estimate.expectedHours,
          count: existing.count + 1,
        });
      }
    }

    const summaries: ProcessSummary[] = [];
    for (const [processName, data] of processMap) {
      summaries.push({
        processId: processName.toLowerCase().replace(/\s+/g, "-"),
        processName: processName,
        totalHours: Math.round(data.hours * 10) / 10,
        workCount: data.count,
      });
    }

    return summaries.sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Aggregate estimates by requirement
   */
  private aggregateByRequirement(state: EstimationState): RequirementSummary[] {
    const requirementMap = new Map<
      string,
      { hours: number; count: number; title: string }
    >();

    for (const estimate of state.estimates) {
      const reqId = estimate.requirementId;
      const requirement = state.requirements.find((r) => r.id === reqId);

      const existing = requirementMap.get(reqId) || {
        hours: 0,
        count: 0,
        title: "Unknown",
      };
      requirementMap.set(reqId, {
        hours: existing.hours + estimate.expectedHours,
        count: existing.count + 1,
        title: requirement?.title || existing.title,
      });
    }

    const summaries: RequirementSummary[] = [];
    for (const [reqId, data] of requirementMap) {
      summaries.push({
        requirementId: reqId,
        requirementTitle: data.title,
        totalHours: Math.round(data.hours * 10) / 10,
        workCount: data.count,
      });
    }

    return summaries.sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Calculate total hours from estimates
   */
  private calculateTotalHours(estimates: EstimationState["estimates"]): number {
    return (
      Math.round(estimates.reduce((sum, e) => sum + e.expectedHours, 0) * 10) /
      10
    );
  }

  /**
   * Generate markdown report using LLM
   */
  private async generateMarkdownReport(
    state: EstimationState,
    summary: {
      totalHours: number;
      summaryByProcess: ProcessSummary[];
      summaryByRequirement: RequirementSummary[];
    },
  ): Promise<string> {
    // Calculate overall confidence from estimates
    const confidenceLevels = state.estimates.map((e) => e.confidence);
    const highCount = confidenceLevels.filter((c) => c === "high").length;
    const mediumCount = confidenceLevels.filter((c) => c === "medium").length;
    const overallConfidence: "high" | "medium" | "low" =
      highCount > mediumCount
        ? "high"
        : mediumCount > confidenceLevels.length / 3
          ? "medium"
          : "low";

    // Build decomposition results grouped by requirement
    const decompositionMap = new Map<
      string,
      {
        requirementTitle: string;
        atomicWorks: Array<{
          id: string;
          name: string;
          baProcess: string;
          rationale: string;
        }>;
      }
    >();
    for (const work of state.atomicWorks) {
      const existing = decompositionMap.get(work.requirementId);
      if (existing) {
        existing.atomicWorks.push({
          id: work.id,
          name: work.name,
          baProcess: work.baProcess,
          rationale: work.rationale || "",
        });
      } else {
        const req = state.requirements.find((r) => r.id === work.requirementId);
        decompositionMap.set(work.requirementId, {
          requirementTitle: req?.title || "Unknown",
          atomicWorks: [
            {
              id: work.id,
              name: work.name,
              baProcess: work.baProcess,
              rationale: work.rationale || "",
            },
          ],
        });
      }
    }

    // Build context for LLM with all required template variables
    const context: PromptContext = {
      inputFolderPath: state.inputFolder,
      timestamp: new Date().toISOString(),
      totalExpectedHours: summary.totalHours,
      requirementsCount: state.requirements.length,
      atomicWorksCount: state.atomicWorks.length,
      confidenceLevel: overallConfidence,
      validationResults: state.validationReport
        ? {
            status:
              state.validationReport.status === "pending"
                ? "partial"
                : (state.validationReport.status as
                    | "valid"
                    | "invalid"
                    | "partial"),
            missingArtifacts: state.validationReport.missingArtifacts || [],
            qualityIssues: state.validationReport.qualityIssues || [],
            recommendations: state.validationReport.recommendations || [],
            canProceed: state.validationReport.canProceed ?? false,
          }
        : undefined,
      requirements: state.requirements.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        originalText: r.originalText || r.description,
        type: r.type || ("functional" as const),
        acceptanceCriteria: r.acceptanceCriteria || [],
        priority: r.priority || ("medium" as const),
        sourceDocument: r.sourceDocument || "",
      })),
      decompositionResults: Array.from(decompositionMap.entries()).map(
        ([requirementId, data]) => ({
          requirementId,
          requirementTitle: data.requirementTitle,
          atomicWorks: data.atomicWorks,
        }),
      ),
      estimates: state.estimates.map((e) => ({
        requirementId: e.requirementId,
        atomicWorkId: e.atomicWorkId,
        baseHours: e.baseHours,
        optimistic: e.optimistic,
        mostLikely: e.mostLikely,
        pessimistic: e.pessimistic,
        expectedHours: e.expectedHours,
        appliedCoefficients: e.appliedCoefficients || [],
        assumptions: e.assumptions || [],
        confidence: e.confidence,
      })),
    };

    try {
      // Invoke LLM for report generation
      const response = await this.invokeLLMJson<{ markdown: string }>(context, {
        defaultValue: { markdown: "" },
      });

      // Ensure response and markdown field exist
      if (response?.markdown && typeof response.markdown === "string") {
        return response.markdown;
      }
    } catch (error) {
      this.logger.warn(
        `LLM report generation failed, using template: ${error}`,
      );
    }

    // Fallback to template-based report
    return this.generateTemplateReport(state, summary);
  }

  /**
   * Generate a template-based markdown report
   */
  private generateTemplateReport(
    state: EstimationState,
    summary: {
      totalHours: number;
      summaryByProcess: ProcessSummary[];
      summaryByRequirement: RequirementSummary[];
    },
  ): string {
    const lines: string[] = [
      "# BA Work Estimation Report",
      "",
      `**Generated:** ${new Date().toISOString()}`,
      `**Input Folder:** ${state.inputFolder}`,
      `**Total Estimated Hours:** ${this.formatHours(summary.totalHours)}`,
      "",
      "## Summary by BA Process",
      "",
      "| Process | Hours | Works |",
      "|---------|-------|-------|",
    ];

    for (const proc of summary.summaryByProcess) {
      lines.push(
        `| ${proc.processName} | ${this.formatHours(proc.totalHours)} | ${proc.workCount} |`,
      );
    }

    lines.push(
      "",
      "## Summary by Requirement",
      "",
      "| Requirement | Hours | Works |",
      "|-------------|-------|-------|",
    );

    for (const req of summary.summaryByRequirement) {
      lines.push(
        `| ${req.requirementTitle} | ${this.formatHours(req.totalHours)} | ${req.workCount} |`,
      );
    }

    lines.push("", "## Detailed Estimates", "");

    for (const estimate of state.estimates) {
      const requirement = state.requirements.find(
        (r) => r.id === estimate.requirementId,
      );
      const work = state.atomicWorks.find(
        (w) => w.id === estimate.atomicWorkId,
      );

      lines.push(
        `### ${estimate.requirementId}: ${requirement?.title || "Unknown"}`,
      );
      lines.push(`- **Atomic Work:** ${work?.name || estimate.atomicWorkId}`);
      lines.push(`- **BA Process:** ${work?.baProcess || "Unknown"}`);
      lines.push(`- **Base Hours:** ${estimate.baseHours}h`);
      lines.push(`- **PERT Estimates:**`);
      lines.push(`  - Optimistic: ${estimate.optimistic.toFixed(1)}h`);
      lines.push(`  - Most Likely: ${estimate.mostLikely.toFixed(1)}h`);
      lines.push(`  - Pessimistic: ${estimate.pessimistic.toFixed(1)}h`);
      lines.push(
        `  - **Expected:** ${this.formatHours(estimate.expectedHours)}`,
      );
      lines.push(`- **Confidence:** ${estimate.confidence}`);

      if (estimate.appliedCoefficients.length > 0) {
        lines.push(`- **Applied Coefficients:**`);
        for (const coef of estimate.appliedCoefficients) {
          lines.push(`  - ${coef.name} (${coef.multiplier}x): ${coef.reason}`);
        }
      }

      if (estimate.assumptions.length > 0) {
        lines.push(`- **Assumptions:**`);
        for (const assumption of estimate.assumptions) {
          lines.push(`  - ${assumption}`);
        }
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Generate CSV content for export
   */
  private generateCsvContent(state: EstimationState): string {
    const headers = [
      "Requirement ID",
      "Requirement Title",
      "Atomic Work ID",
      "Atomic Work Name",
      "BA Process",
      "Base Hours",
      "Optimistic",
      "Most Likely",
      "Pessimistic",
      "Expected Hours",
      "Confidence",
      "Coefficients",
      "Assumptions",
    ];

    const rows = state.estimates.map((estimate) => {
      const requirement = state.requirements.find(
        (r) => r.id === estimate.requirementId,
      );
      const work = state.atomicWorks.find(
        (w) => w.id === estimate.atomicWorkId,
      );

      return [
        estimate.requirementId,
        this.escapeCsvField(requirement?.title || "Unknown"),
        estimate.atomicWorkId,
        this.escapeCsvField(work?.name || "Unknown"),
        this.escapeCsvField(work?.baProcess || "Unknown"),
        estimate.baseHours,
        estimate.optimistic.toFixed(2),
        estimate.mostLikely.toFixed(2),
        estimate.pessimistic.toFixed(2),
        estimate.expectedHours.toFixed(2),
        estimate.confidence,
        this.escapeCsvField(
          estimate.appliedCoefficients.map((c) => c.name).join("; "),
        ),
        this.escapeCsvField(estimate.assumptions.join("; ")),
      ];
    });

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  /**
   * Escape a field for CSV format
   */
  private escapeCsvField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}

/**
 * Factory function to create reporting node
 */
export function createReportingNode(
  dependencies: AgentDependencies,
): ReportingNode {
  return new ReportingNode(dependencies);
}

/**
 * LangGraph node function wrapper
 */
export async function reportingNode(
  state: EstimationState,
  config?: NodeConfig,
): Promise<StateUpdate> {
  // This is a placeholder - in actual implementation, the node instance
  // would be created by the module and injected
  throw new Error(
    "ReportingNode must be created via factory with dependencies",
  );
}
