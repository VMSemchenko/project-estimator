/**
 * Output writer utilities for CLI
 * Generates markdown and CSV output files
 */

import * as fs from "fs";
import * as path from "path";
import {
  EstimationReport,
  Estimate,
  ProcessSummary,
} from "../../agents/interfaces/agent-state.interface";

/**
 * Output writer options
 */
export interface OutputWriterOptions {
  /** Output directory path */
  outputDir: string;
  /** Verbose mode */
  verbose?: boolean;
}

/**
 * Output file paths
 */
export interface OutputFiles {
  /** Markdown report path */
  markdown: string;
  /** CSV breakdown path */
  csv: string;
}

/**
 * Output writer class for generating report files
 */
export class OutputWriter {
  private options: OutputWriterOptions;
  private currentTimestamp: string | null = null;

  constructor(options: OutputWriterOptions) {
    this.options = options;
  }

  /**
   * Generate ISO format timestamp for folder name
   * Colons are replaced with hyphens for filesystem compatibility
   */
  private generateTimestamp(): string {
    const now = new Date();
    return now
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\.\d{3}Z$/, "");
    // Results in: 2026-03-08T20-45-00
  }

  /**
   * Get cached timestamp or generate new one
   * Ensures consistent timestamp across multiple calls in same run
   */
  private getTimestamp(): string {
    if (!this.currentTimestamp) {
      this.currentTimestamp = this.generateTimestamp();
    }
    return this.currentTimestamp;
  }

  /**
   * Ensure output directory exists with timestamped subdirectory
   * @returns The path to the timestamped subdirectory
   */
  async ensureOutputDir(): Promise<string> {
    // Ensure base output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Create timestamped subdirectory
    const timestamp = this.getTimestamp();
    const timestampedDir = path.join(this.options.outputDir, timestamp);
    fs.mkdirSync(timestampedDir, { recursive: true });

    return timestampedDir;
  }

  /**
   * Write all output files from estimation report
   */
  async writeReport(report: EstimationReport): Promise<OutputFiles> {
    const timestampedDir = await this.ensureOutputDir();

    const files: OutputFiles = {
      markdown: path.join(timestampedDir, "estimation-report.md"),
      csv: path.join(timestampedDir, "estimation-breakdown.csv"),
    };

    // Write markdown report
    const markdownContent = this.generateMarkdown(report);
    fs.writeFileSync(files.markdown, markdownContent, "utf-8");

    // Write CSV breakdown
    const csvContent = this.generateCSV(report);
    fs.writeFileSync(files.csv, csvContent, "utf-8");

    return files;
  }

  /**
   * Generate markdown report content with beautiful formatting
   */
  private generateMarkdown(report: EstimationReport): string {
    const lines: string[] = [];
    const date = new Date(report.timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const overallConfidence = this.getOverallConfidence(report.estimates);
    const confidenceEmoji = this.getConfidenceEmoji(overallConfidence);

    // Header with banner
    lines.push('<div align="center">');
    lines.push("");
    lines.push("# 📊 BA Work Estimation Report");
    lines.push("");
    lines.push(`<sub>Generated on **${date}**</sub>`);
    lines.push("");
    lines.push("</div>");
    lines.push("");

    // Quick Stats Cards
    lines.push("<table>");
    lines.push("<tr>");
    lines.push(
      `<td width="25%" align="center"><h3>⏱️ ${report.totalHours.toFixed(1)}h</h3><sub>Total Hours</sub></td>`,
    );
    lines.push(
      `<td width="25%" align="center"><h3>📋 ${report.summaryByRequirement.length}</h3><sub>Requirements</sub></td>`,
    );
    lines.push(
      `<td width="25%" align="center"><h3>🔧 ${report.estimates.length}</h3><sub>Atomic Works</sub></td>`,
    );
    lines.push(
      `<td width="25%" align="center"><h3>${confidenceEmoji} ${overallConfidence}</h3><sub>Confidence</sub></td>`,
    );
    lines.push("</tr>");
    lines.push("</table>");
    lines.push("");

    // Progress bar for hours visualization
    lines.push("---");
    lines.push("");
    lines.push("## 📈 Effort Distribution");
    lines.push("");

    // Visual progress bars for BA Processes
    lines.push("### By BA Process");
    lines.push("");
    for (const process of report.summaryByProcess) {
      const percentage = (process.totalHours / report.totalHours) * 100;
      const bar = this.createProgressBar(percentage);
      const emoji = this.getProcessEmoji(process.processName);
      lines.push(`**${emoji} ${this.formatProcessName(process.processName)}**`);
      lines.push(
        `\`${bar}\` **${percentage.toFixed(0)}%** (${process.totalHours.toFixed(1)}h)`,
      );
      lines.push("");
    }

    // Requirements breakdown with visual cards
    lines.push("---");
    lines.push("");
    lines.push("## 📋 Requirements Breakdown");
    lines.push("");

    const estimatesByReq = this.groupEstimatesByRequirement(report.estimates);

    for (const req of report.summaryByRequirement) {
      const reqEstimates = estimatesByReq[req.requirementId] || [];
      const reqPercentage = (req.totalHours / report.totalHours) * 100;
      const reqBar = this.createProgressBar(reqPercentage, 20);

      lines.push(`<details>`);
      lines.push(
        `<summary><strong>📌 ${req.requirementId}</strong>: ${req.requirementTitle} — <code>${req.totalHours.toFixed(1)}h</code> (${req.workCount} works)</summary>`,
      );
      lines.push("");
      lines.push(
        `| Atomic Work | BA Process | Optimistic | Most Likely | Pessimistic | Expected |`,
      );
      lines.push(
        `|:------------|:-----------|:----------:|:-----------:|:-----------:|:--------:|`,
      );

      for (const est of reqEstimates) {
        const confEmoji = this.getConfidenceEmoji(est.confidence);
        lines.push(
          `| ${this.formatAtomicWork(est.atomicWorkId)} | ${this.formatProcessName(est.baProcess || "N/A")} | ${est.optimistic.toFixed(1)}h | ${est.mostLikely.toFixed(1)}h | ${est.pessimistic.toFixed(1)}h | **${est.expectedHours.toFixed(1)}h** ${confEmoji} |`,
        );
      }
      lines.push("");

      // Show assumptions if any
      const assumptions = [
        ...new Set(reqEstimates.flatMap((e) => e.assumptions)),
      ];
      if (assumptions.length > 0) {
        lines.push(`> 💡 **Assumptions:**`);
        lines.push(`> `);
        for (const assumption of assumptions) {
          lines.push(`> - ${assumption}`);
        }
        lines.push("");
      }
      lines.push(`</details>`);
      lines.push("");
    }

    // Applied Coefficients section
    lines.push("---");
    lines.push("");
    lines.push("## ⚖️ Applied Coefficients");
    lines.push("");

    const allCoefficients = this.extractAllCoefficients(report.estimates);
    if (allCoefficients.length > 0) {
      lines.push("| Coefficient | Multiplier | Reason |");
      lines.push("|:------------|:----------:|:-------|");

      for (const coef of allCoefficients) {
        const effect =
          coef.multiplier > 1 ? "📈" : coef.multiplier < 1 ? "📉" : "➡️";
        lines.push(
          `| ${effect} **${coef.name}** | ${coef.multiplier.toFixed(2)}x | ${coef.reason} |`,
        );
      }
      lines.push("");
    } else {
      lines.push("> ✅ No risk coefficients were applied to this estimation.");
      lines.push("");
    }

    // Risk Assessment
    lines.push("---");
    lines.push("");
    lines.push("## ⚠️ Risk Assessment");
    lines.push("");

    const riskLevel = this.calculateRiskLevel(report);
    lines.push(
      `**Overall Risk Level:** ${riskLevel.emoji} **${riskLevel.level}**`,
    );
    lines.push("");
    lines.push(`> ${riskLevel.description}`);
    lines.push("");

    // Footer
    lines.push("---");
    lines.push("");
    lines.push('<div align="center">');
    lines.push("");
    lines.push(`<sub>📍 Input: \`${report.inputFolder}\`</sub>`);
    lines.push("");
    lines.push("*Generated with 💜 by BA Work Estimation System*");
    lines.push("");
    lines.push("</div>");
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(percentage: number, length: number = 30): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  /**
   * Get emoji for confidence level
   */
  private getConfidenceEmoji(confidence: string): string {
    switch (confidence.toLowerCase()) {
      case "high":
        return "🟢";
      case "medium":
        return "🟡";
      case "low":
        return "🔴";
      default:
        return "⚪";
    }
  }

  /**
   * Get emoji for BA process
   */
  private getProcessEmoji(processName: string): string {
    const name = processName.toLowerCase();
    if (
      name.includes("elicitation") ||
      name.includes("interview") ||
      name.includes("workshop")
    )
      return "🎤";
    if (name.includes("analysis") || name.includes("feasibility")) return "🔍";
    if (
      name.includes("documentation") ||
      name.includes("writing") ||
      name.includes("specification")
    )
      return "📝";
    if (
      name.includes("validation") ||
      name.includes("review") ||
      name.includes("sign")
    )
      return "✅";
    if (name.includes("management") || name.includes("planning")) return "📊";
    return "⚙️";
  }

  /**
   * Format process name for display
   */
  private formatProcessName(name: string): string {
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Format atomic work name for display
   */
  private formatAtomicWork(name: string): string {
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(report: EstimationReport): {
    level: string;
    emoji: string;
    description: string;
  } {
    const avgPessimisticRatio =
      report.estimates.reduce((sum, est) => {
        return sum + est.pessimistic / est.expectedHours;
      }, 0) / report.estimates.length;

    const confidenceScore =
      {
        high: 3,
        medium: 2,
        low: 1,
      }[this.getOverallConfidence(report.estimates).toLowerCase()] || 2;

    const riskScore = avgPessimisticRatio * (4 - confidenceScore);

    if (riskScore < 2) {
      return {
        level: "Low",
        emoji: "🟢",
        description:
          "The estimation has high confidence with low variance. Delivery is likely on schedule.",
      };
    } else if (riskScore < 3.5) {
      return {
        level: "Medium",
        emoji: "🟡",
        description:
          "Some uncertainty exists in the estimation. Consider adding buffer time for critical paths.",
      };
    } else {
      return {
        level: "High",
        emoji: "🔴",
        description:
          "Significant uncertainty in estimation. Recommend further analysis and risk mitigation strategies.",
      };
    }
  }

  /**
   * Generate CSV breakdown content
   */
  private generateCSV(report: EstimationReport): string {
    const lines: string[] = [];

    // Header row
    lines.push(
      "requirement_id,atomic_work,ba_process,coefficient,O,M,P,expected_hours,confidence",
    );

    // Data rows
    for (const estimate of report.estimates) {
      const coefficients = estimate.appliedCoefficients
        .map((c) => `${c.name}:${c.multiplier.toFixed(2)}`)
        .join("; ");

      const row = [
        estimate.requirementId,
        estimate.atomicWorkId,
        estimate.baProcess || "",
        `"${coefficients}"`,
        estimate.optimistic.toFixed(1),
        estimate.mostLikely.toFixed(1),
        estimate.pessimistic.toFixed(1),
        estimate.expectedHours.toFixed(1),
        estimate.confidence,
      ];

      lines.push(row.join(","));
    }

    return lines.join("\n");
  }

  /**
   * Get overall confidence from estimates
   */
  private getOverallConfidence(estimates: Estimate[]): string {
    if (estimates.length === 0) return "Unknown";

    const confidenceScores = {
      high: 3,
      medium: 2,
      low: 1,
    };

    const totalScore = estimates.reduce((sum, est) => {
      return sum + (confidenceScores[est.confidence] || 2);
    }, 0);

    const avgScore = totalScore / estimates.length;

    if (avgScore >= 2.5) return "High";
    if (avgScore >= 1.5) return "Medium";
    return "Low";
  }

  /**
   * Group estimates by requirement ID
   */
  private groupEstimatesByRequirement(
    estimates: Estimate[],
  ): Record<string, Estimate[]> {
    return estimates.reduce(
      (acc, est) => {
        if (!acc[est.requirementId]) {
          acc[est.requirementId] = [];
        }
        acc[est.requirementId].push(est);
        return acc;
      },
      {} as Record<string, Estimate[]>,
    );
  }

  /**
   * Extract unique coefficients from all estimates
   */
  private extractAllCoefficients(
    estimates: Estimate[],
  ): Array<{ name: string; multiplier: number; reason: string }> {
    const seen = new Set<string>();
    const result: Array<{ name: string; multiplier: number; reason: string }> =
      [];

    for (const est of estimates) {
      for (const coef of est.appliedCoefficients) {
        if (!seen.has(coef.id)) {
          seen.add(coef.id);
          result.push({
            name: coef.name,
            multiplier: coef.multiplier,
            reason: coef.reason,
          });
        }
      }
    }

    return result;
  }
}

/**
 * Create an output writer instance
 */
export function createOutputWriter(options: OutputWriterOptions): OutputWriter {
  return new OutputWriter(options);
}

/**
 * Extend Estimate interface to include baProcess for CSV output
 */
declare module "../../agents/interfaces/agent-state.interface" {
  interface Estimate {
    baProcess?: string;
  }
}
