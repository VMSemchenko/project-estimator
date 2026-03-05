/**
 * Estimate command for CLI
 * Runs the full estimation pipeline on a folder of discovery artifacts
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PromptsService } from '../../prompts/prompts.service';
import { LangchainLLMProvider } from '../../ai/providers/langchain-llm.provider';
import { LangchainEmbeddingProvider } from '../../ai/providers/langchain-embedding.provider';
import { RagService } from '../../rag/rag.service';
import { LangfuseService } from '../../ai/langfuse/langfuse.service';
import { CatalogsService } from '../../catalogs/catalogs.service';
import {
  createEstimationGraph,
  executeEstimationGraph,
  GraphExecutionOptions,
} from '../../agents/graph/estimation.graph';
import { AgentDependencies } from '../../agents/interfaces/agent.interface';
import { GraphState } from '../../agents/graph/state';
import { createProgress, Progress } from '../utils/progress';
import { createOutputWriter, OutputWriter } from '../utils/output-writer';

/**
 * Estimate command options
 */
export interface EstimateCommandOptions {
  /** Output directory */
  output?: string;
  /** Verbose mode */
  verbose?: boolean;
  /** Test mode (use cheaper model) */
  testMode?: boolean;
  /** Force catalog re-indexing */
  reindex?: boolean;
}

/**
 * Estimate command handler
 */
async function runEstimate(
  inputFolder: string,
  options: EstimateCommandOptions
): Promise<void> {
  const progress = createProgress({ verbose: options.verbose });

  // Resolve absolute paths
  const inputPath = path.resolve(inputFolder);
  const outputPath = options.output ? path.resolve(options.output) : inputPath;

  // Validate input folder exists
  if (!fs.existsSync(inputPath)) {
    progress.error(`Input folder not found: ${inputPath}`);
    process.exit(1);
  }

  if (!fs.statSync(inputPath).isDirectory()) {
    progress.error(`Input path is not a directory: ${inputPath}`);
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // Initialize NestJS application context
    progress.header('search', 'Initializing estimation system');

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: options.verbose ? ['error', 'warn', 'log'] : ['error'],
    });

    // Get services
    const promptsService = app.get(PromptsService);
    const llmProvider = app.get(LangchainLLMProvider);
    const embeddingProvider = app.get(LangchainEmbeddingProvider);
    const ragService = app.get(RagService);
    const langfuseService = app.get(LangfuseService);
    const catalogsService = app.get(CatalogsService);

    // Configure model based on test mode
    if (options.testMode) {
      progress.verbose('Using test mode with cheaper model');
      // Could configure different model here
    }

    // Force re-index if requested
    if (options.reindex) {
      progress.start('Re-indexing catalogs...');
      await catalogsService.loadAllCatalogs();
      await catalogsService.indexCatalogs();
      progress.succeed('Catalogs re-indexed');
    }

    // Create agent dependencies
    const dependencies: AgentDependencies = {
      promptsService,
      llmProvider,
      ragService,
      langfuseService,
    };

    // Create estimation graph
    progress.verbose('Creating estimation graph');
    const graph = createEstimationGraph(dependencies);

    // Execute estimation with progress tracking
    progress.header('search', 'Validating input artifacts');

    const graphOptions: GraphExecutionOptions = {
      maxSteps: 10,
      timeout: 300000, // 5 minutes
      onProgress: (step: string, state: GraphState) => {
        updateProgressForStep(progress, step, state);
      },
    };

    const result = await executeEstimationGraph(graph, inputPath, graphOptions);

    // Check for errors
    if (result.errors.length > 0) {
      progress.warn(`Completed with ${result.errors.length} error(s)`);
      for (const error of result.errors) {
        progress.verbose(`${error.node}: ${error.message}`);
      }
    }

    // Generate output files
    if (result.report) {
      progress.header('document', 'Generating report');

      const outputWriter = createOutputWriter({
        outputDir: outputPath,
        verbose: options.verbose,
      });

      const files = await outputWriter.writeReport(result.report);

      progress.logItem(`Report saved to: ${files.markdown}`);
      progress.logItem(`CSV saved to: ${files.csv}`);

      // Print summary
      const duration = Date.now() - startTime;
      printSummary(progress, result, duration);
    } else {
      progress.error('No report generated');
      process.exit(1);
    }

    // Clean up
    await app.close();
    progress.stop();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    progress.error('Estimation failed', errorMessage);
    
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

/**
 * Update progress based on current step
 */
function updateProgressForStep(
  progress: Progress,
  step: string,
  state: GraphState
): void {
  switch (step) {
    case 'validation':
      if (state.validationStatus === 'valid') {
        const artifactCount = state.artifacts.length;
        const artifactNames = state.artifacts.map((a) => a.name).join(', ');
        progress.succeed(`Found ${artifactCount} artifacts`);
        progress.logItem(artifactNames);
      } else if (state.validationStatus === 'invalid') {
        progress.fail('Validation failed');
        if (state.validationReport) {
          for (const missing of state.validationReport.missingArtifacts) {
            progress.logItem(`Missing: ${missing}`, false);
          }
        }
      }
      break;

    case 'extraction':
      if (state.requirements.length > 0) {
        progress.succeed(`Extracted ${state.requirements.length} requirements`);
      }
      break;

    case 'decomposition':
      if (state.atomicWorks.length > 0) {
        progress.succeed(`Mapped ${state.atomicWorks.length} atomic works`);
      }
      break;

    case 'estimation':
      if (state.estimates.length > 0) {
        progress.succeed(`Calculated ${state.estimates.length} estimates`);
      }
      break;

    case 'reporting':
      if (state.report) {
        progress.succeed('Report generated');
      }
      break;
  }
}

/**
 * Print final summary
 */
function printSummary(
  progress: Progress,
  result: GraphState,
  duration: number
): void {
  const report = result.report;

  if (!report) {
    return;
  }

  // Calculate confidence
  const confidenceLevels = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const estimate of report.estimates) {
    confidenceLevels[estimate.confidence]++;
  }

  let overallConfidence = 'Medium';
  if (confidenceLevels.high > confidenceLevels.low) {
    overallConfidence = 'High';
  } else if (confidenceLevels.low > confidenceLevels.high) {
    overallConfidence = 'Low';
  }

  progress.summary('Summary', {
    'Total BA Hours': report.totalHours.toFixed(1),
    'Requirements': report.summaryByRequirement.length.toString(),
    'Confidence': overallConfidence,
    'Duration': `${Math.round(duration / 1000)}s`,
  });
}

/**
 * Configure the estimate command
 */
export function configureEstimateCommand(program: Command): void {
  program
    .command('estimate <input_folder>')
    .description('Generate BA work estimation for a project')
    .option('-o, --output <path>', 'Output directory (default: input_folder)')
    .option('-v, --verbose', 'Show detailed progress', false)
    .option('-t, --test-mode', 'Use cheaper/faster model', false)
    .option('-r, --reindex', 'Force catalog re-indexing', false)
    .action(async (inputFolder: string, options: EstimateCommandOptions) => {
      await runEstimate(inputFolder, options);
    });
}
