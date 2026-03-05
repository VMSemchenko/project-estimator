/**
 * Output writer utilities for CLI
 * Generates markdown and CSV output files
 */

import * as fs from 'fs';
import * as path from 'path';
import { EstimationReport, Estimate, ProcessSummary } from '../../agents/interfaces/agent-state.interface';

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

  constructor(options: OutputWriterOptions) {
    this.options = options;
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir(): Promise<void> {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Write all output files from estimation report
   */
  async writeReport(report: EstimationReport): Promise<OutputFiles> {
    await this.ensureOutputDir();

    const files: OutputFiles = {
      markdown: path.join(this.options.outputDir, 'estimation-report.md'),
      csv: path.join(this.options.outputDir, 'estimation-breakdown.csv'),
    };

    // Write markdown report
    const markdownContent = this.generateMarkdown(report);
    fs.writeFileSync(files.markdown, markdownContent, 'utf-8');

    // Write CSV breakdown
    const csvContent = this.generateCSV(report);
    fs.writeFileSync(files.csv, csvContent, 'utf-8');

    return files;
  }

  /**
   * Generate markdown report content
   */
  private generateMarkdown(report: EstimationReport): string {
    const lines: string[] = [];
    const date = new Date(report.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Header
    lines.push('# BA Work Estimation Report');
    lines.push('');
    lines.push(`**Date:** ${date}`);
    lines.push(`**Input:** ${report.inputFolder}`);
    lines.push('');

    // Summary section
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total BA Hours:** ${report.totalHours.toFixed(1)}`);
    lines.push(`- **Requirements Count:** ${report.summaryByRequirement.length}`);
    lines.push(`- **Confidence Level:** ${this.getOverallConfidence(report.estimates)}`);
    lines.push('');

    // Breakdown by BA Process
    lines.push('## Breakdown by BA Process');
    lines.push('');
    lines.push('| Process | Hours | % |');
    lines.push('|---------|-------|---|');

    for (const process of report.summaryByProcess) {
      const percentage = ((process.totalHours / report.totalHours) * 100).toFixed(0);
      lines.push(`| ${process.processName} | ${process.totalHours.toFixed(1)} | ${percentage}% |`);
    }
    lines.push('');

    // Breakdown by Requirement
    lines.push('## Breakdown by Requirement');
    lines.push('');
    lines.push('| Requirement | Title | Hours | Works |');
    lines.push('|-------------|-------|-------|-------|');

    for (const req of report.summaryByRequirement) {
      lines.push(`| ${req.requirementId} | ${req.requirementTitle} | ${req.totalHours.toFixed(1)} | ${req.workCount} |`);
    }
    lines.push('');

    // Detailed Estimates
    lines.push('## Detailed Estimates');
    lines.push('');

    // Group estimates by requirement
    const estimatesByReq = this.groupEstimatesByRequirement(report.estimates);

    for (const [reqId, estimates] of Object.entries(estimatesByReq)) {
      lines.push(`### ${reqId}`);
      lines.push('');
      lines.push('| Atomic Work | BA Process | O | M | P | Expected |');
      lines.push('|-------------|------------|---|---|---|----------|');

      for (const est of estimates) {
        lines.push(
          `| ${est.atomicWorkId} | ${est.baProcess || 'N/A'} | ${est.optimistic.toFixed(1)} | ${est.mostLikely.toFixed(1)} | ${est.pessimistic.toFixed(1)} | ${est.expectedHours.toFixed(1)} |`
        );
      }
      lines.push('');

      // Show assumptions if verbose
      const assumptions = [...new Set(estimates.flatMap((e) => e.assumptions))];
      if (assumptions.length > 0) {
        lines.push('**Assumptions:**');
        lines.push('');
        for (const assumption of assumptions) {
          lines.push(`- ${assumption}`);
        }
        lines.push('');
      }
    }

    // Applied Coefficients section
    lines.push('## Applied Coefficients');
    lines.push('');

    const allCoefficients = this.extractAllCoefficients(report.estimates);
    if (allCoefficients.length > 0) {
      lines.push('| Coefficient | Multiplier | Reason |');
      lines.push('|-------------|------------|--------|');

      for (const coef of allCoefficients) {
        lines.push(`| ${coef.name} | ${coef.multiplier.toFixed(2)} | ${coef.reason} |`);
      }
      lines.push('');
    } else {
      lines.push('No coefficients were applied.');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Generated by BA Work Estimation System*');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate CSV breakdown content
   */
  private generateCSV(report: EstimationReport): string {
    const lines: string[] = [];

    // Header row
    lines.push(
      'requirement_id,atomic_work,ba_process,coefficient,O,M,P,expected_hours,confidence'
    );

    // Data rows
    for (const estimate of report.estimates) {
      const coefficients = estimate.appliedCoefficients
        .map((c) => `${c.name}:${c.multiplier.toFixed(2)}`)
        .join('; ');

      const row = [
        estimate.requirementId,
        estimate.atomicWorkId,
        estimate.baProcess || '',
        `"${coefficients}"`,
        estimate.optimistic.toFixed(1),
        estimate.mostLikely.toFixed(1),
        estimate.pessimistic.toFixed(1),
        estimate.expectedHours.toFixed(1),
        estimate.confidence,
      ];

      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Get overall confidence from estimates
   */
  private getOverallConfidence(estimates: Estimate[]): string {
    if (estimates.length === 0) return 'Unknown';

    const confidenceScores = {
      high: 3,
      medium: 2,
      low: 1,
    };

    const totalScore = estimates.reduce((sum, est) => {
      return sum + (confidenceScores[est.confidence] || 2);
    }, 0);

    const avgScore = totalScore / estimates.length;

    if (avgScore >= 2.5) return 'High';
    if (avgScore >= 1.5) return 'Medium';
    return 'Low';
  }

  /**
   * Group estimates by requirement ID
   */
  private groupEstimatesByRequirement(
    estimates: Estimate[]
  ): Record<string, Estimate[]> {
    return estimates.reduce(
      (acc, est) => {
        if (!acc[est.requirementId]) {
          acc[est.requirementId] = [];
        }
        acc[est.requirementId].push(est);
        return acc;
      },
      {} as Record<string, Estimate[]>
    );
  }

  /**
   * Extract unique coefficients from all estimates
   */
  private extractAllCoefficients(
    estimates: Estimate[]
  ): Array<{ name: string; multiplier: number; reason: string }> {
    const seen = new Set<string>();
    const result: Array<{ name: string; multiplier: number; reason: string }> = [];

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
declare module '../../agents/interfaces/agent-state.interface' {
  interface Estimate {
    baProcess?: string;
  }
}
