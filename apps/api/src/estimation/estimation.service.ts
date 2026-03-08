import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import {
  EstimationJob,
  EstimationStatus,
  ConfidenceLevel,
  CreateEstimationRequest,
  CreateEstimationResponse,
  GetEstimationResponse,
  EstimationLinks,
  EstimationErrorType,
  EstimationErrorDetails,
} from "./interfaces/estimation-job.interface";
import { CreateEstimationDto, CatalogSet } from "./dto/create-estimation.dto";
import { AgentsService } from "../agents";
import { TracingService, MetricsService } from "../observability";
import { TraceContext } from "../observability/interfaces/trace-context.interface";
import { LLMError } from "../agents/errors/llm-error";
import { CatalogsService } from "../catalogs";

/**
 * Service for managing estimation jobs
 */
@Injectable()
export class EstimationService {
  private readonly logger = new Logger(EstimationService.name);
  private readonly jobs: Map<string, EstimationJob> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly agentsService: AgentsService,
    private readonly tracingService: TracingService,
    private readonly metricsService: MetricsService,
    private readonly catalogsService: CatalogsService,
  ) {}

  /**
   * Generate a unique estimation ID
   */
  private generateId(): string {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const shortId = uuidv4().split("-")[0];
    return `est-${dateStr}-${shortId}`;
  }

  /**
   * Generate HATEOAS links for an estimation
   */
  private generateLinks(id: string): EstimationLinks {
    return {
      self: `/estimate/${id}`,
      report: `/estimate/${id}/report`,
    };
  }

  /**
   * Create a new estimation job
   */
  async createEstimation(
    dto: CreateEstimationDto,
  ): Promise<CreateEstimationResponse> {
    const id = this.generateId();
    const now = new Date();

    // Switch catalog set if specified and different from current
    const catalogSet = dto.catalogSet || CatalogSet.REAL_WORLD;
    if (catalogSet !== this.catalogsService.getCurrentCatalogSet()) {
      this.logger.log(`Switching to catalog set: ${catalogSet}`);
      await this.catalogsService.switchCatalogSet(catalogSet);
    }

    const job: EstimationJob = {
      id,
      status: EstimationStatus.PENDING,
      inputFolder: dto.inputFolder,
      outputFolder: dto.outputFolder || "./reports",
      verbose: dto.verbose ?? false,
      testMode: dto.testMode ?? false,
      catalogSet: catalogSet,
      createdAt: now,
    };

    this.jobs.set(id, job);
    this.logger.log(
      `Created estimation job: ${id} with catalog set: ${catalogSet}`,
    );

    // Start processing asynchronously
    this.processEstimation(id).catch((error) => {
      this.logger.error(`Estimation ${id} failed:`, error);
    });

    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      links: this.generateLinks(job.id),
    };
  }

  /**
   * Get estimation by ID
   */
  async getEstimation(id: string): Promise<GetEstimationResponse> {
    const job = this.jobs.get(id);

    if (!job) {
      throw new NotFoundException(`Estimation with ID ${id} not found`);
    }

    const response: GetEstimationResponse = {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
    };

    if (job.completedAt) {
      response.completedAt = job.completedAt.toISOString();
    }

    if (job.summary) {
      response.summary = job.summary;
    }

    if (job.artifacts) {
      response.artifacts = job.artifacts;
    }

    if (job.error) {
      response.error = job.error;
    }

    return response;
  }

  /**
   * Process estimation job asynchronously
   */
  private async processEstimation(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      return;
    }

    // Start tracing for this estimation
    const traceContext = this.tracingService.startEstimationTrace({
      estimationId: id,
      inputFolder: job.inputFolder,
      metadata: {
        testMode: job.testMode,
        verbose: job.verbose,
      },
    });

    // Create metrics builder
    const metricsBuilder = this.metricsService.createBuilder(id);

    try {
      // Update status to processing
      job.status = EstimationStatus.PROCESSING;
      this.jobs.set(id, job);
      this.logger.log(`Processing estimation: ${id}`);

      // Execute the estimation pipeline with trace context
      const result = await this.agentsService.runEstimationPipeline(
        job.inputFolder,
        traceContext,
      );

      // Update job with results
      job.status = EstimationStatus.COMPLETED;
      job.completedAt = new Date();

      if (result.summary) {
        job.summary = {
          totalHours: result.summary.totalEstimatedHours,
          requirementsCount: result.summary.requirementsExtracted,
          confidenceLevel: this.determineConfidenceLevel(result.summary),
        };
      }

      // Include the actual report content in artifacts
      if (result.summary?.reportGenerated && result.finalState?.report) {
        const report = result.finalState.report;
        job.artifacts = {
          report: `${job.outputFolder}/estimation-report.md`,
          csv: `${job.outputFolder}/estimation-breakdown.csv`,
          estimationReport: report.markdownContent,
          detailedBreakdown: report.csvContent,
        };
      }

      this.jobs.set(id, job);
      this.logger.log(`Completed estimation: ${id}`);

      // End tracing and record metrics
      this.tracingService.endEstimationTrace(traceContext, {
        success: true,
        summary: job.summary,
      });

      metricsBuilder
        .markCompleted()
        .withDuration(Date.now() - traceContext.startTime.getTime());

      this.metricsService.recordEstimationMetrics(metricsBuilder.build());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      this.logger.error(`Estimation ${id} failed:`, errorMessage);

      // Classify error type and create detailed error info
      const errorDetails = this.classifyError(error);

      job.status = EstimationStatus.FAILED;
      job.error = errorMessage;
      job.errorDetails = errorDetails;
      job.completedAt = new Date();
      this.jobs.set(id, job);

      // Record error in trace and metrics
      this.tracingService.recordTraceError(traceContext, errorObj, {
        stage: "estimation",
        errorType: errorDetails.type,
      });
      this.tracingService.endEstimationTrace(traceContext, {
        success: false,
        error: errorMessage,
        errorType: errorDetails.type,
      });

      metricsBuilder
        .markFailed(errorMessage)
        .withDuration(Date.now() - traceContext.startTime.getTime());

      this.metricsService.recordEstimationMetrics(metricsBuilder.build());
    } finally {
      // Flush trace data
      await this.tracingService.flush();
    }
  }

  /**
   * Determine confidence level based on pipeline summary
   */
  private determineConfidenceLevel(summary: {
    artifactsProcessed: number;
    requirementsExtracted: number;
    validationPassed: boolean;
  }): ConfidenceLevel {
    if (summary.validationPassed && summary.requirementsExtracted >= 5) {
      return ConfidenceLevel.HIGH;
    } else if (summary.requirementsExtracted >= 2) {
      return ConfidenceLevel.MEDIUM;
    }
    return ConfidenceLevel.LOW;
  }

  /**
   * Map confidence level string to enum
   */
  private mapConfidenceLevel(level: string): ConfidenceLevel {
    switch (level?.toLowerCase()) {
      case "high":
        return ConfidenceLevel.HIGH;
      case "low":
        return ConfidenceLevel.LOW;
      default:
        return ConfidenceLevel.MEDIUM;
    }
  }

  /**
   * Classify error type and create detailed error information
   * @param error - The error to classify
   * @returns Detailed error information with classification
   */
  private classifyError(error: unknown): EstimationErrorDetails {
    const timestamp = new Date().toISOString();

    // Check for LLMError first (most specific)
    if (LLMError.isLLMError(error)) {
      return {
        type: EstimationErrorType.LLM_FAILURE,
        message: error.message,
        node: error.context?.node,
        stack: error.stack,
        retryable: error.isRetryable(),
        timestamp,
      };
    }

    // Check for common error patterns
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const errorName = error.constructor.name.toLowerCase();

      // LLM-related errors (rate limits, API errors, etc.)
      if (
        message.includes("rate limit") ||
        message.includes("too many requests") ||
        message.includes("api key") ||
        message.includes("authentication") ||
        message.includes("openai") ||
        message.includes("anthropic") ||
        message.includes("llm") ||
        errorName.includes("llm") ||
        errorName.includes("openai") ||
        errorName.includes("anthropic")
      ) {
        return {
          type: EstimationErrorType.LLM_FAILURE,
          message: error.message,
          stack: error.stack,
          retryable:
            message.includes("rate limit") ||
            message.includes("too many requests"),
          timestamp,
        };
      }

      // File I/O errors
      if (
        message.includes("enoent") ||
        message.includes("eacces") ||
        message.includes("permission") ||
        message.includes("file not found") ||
        message.includes("directory") ||
        errorName.includes("file") ||
        errorName.includes("io")
      ) {
        return {
          type: EstimationErrorType.IO_ERROR,
          message: error.message,
          stack: error.stack,
          timestamp,
        };
      }

      // Validation errors
      if (
        message.includes("validation") ||
        message.includes("invalid") ||
        message.includes("required") ||
        errorName.includes("validation")
      ) {
        return {
          type: EstimationErrorType.VALIDATION_ERROR,
          message: error.message,
          stack: error.stack,
          timestamp,
        };
      }

      // Parse errors
      if (
        message.includes("json") ||
        message.includes("parse") ||
        message.includes("syntax") ||
        errorName.includes("syntax") ||
        errorName.includes("parse")
      ) {
        return {
          type: EstimationErrorType.PARSE_ERROR,
          message: error.message,
          stack: error.stack,
          timestamp,
        };
      }

      // RAG errors
      if (
        message.includes("embedding") ||
        message.includes("vector") ||
        message.includes("retrieval") ||
        message.includes("rag") ||
        message.includes("mongodb") ||
        message.includes("database")
      ) {
        return {
          type: EstimationErrorType.RAG_ERROR,
          message: error.message,
          stack: error.stack,
          timestamp,
        };
      }
    }

    // Default to unknown error type
    return {
      type: EstimationErrorType.UNKNOWN,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    };
  }

  /**
   * Get all estimation jobs (for admin/debug purposes)
   */
  async getAllEstimations(): Promise<GetEstimationResponse[]> {
    const estimations: GetEstimationResponse[] = [];

    for (const job of this.jobs.values()) {
      estimations.push({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        summary: job.summary,
        error: job.error,
        errorDetails: job.errorDetails,
      });
    }

    return estimations.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Delete an estimation job
   */
  async deleteEstimation(id: string): Promise<void> {
    if (!this.jobs.has(id)) {
      throw new NotFoundException(`Estimation with ID ${id} not found`);
    }

    this.jobs.delete(id);
    this.logger.log(`Deleted estimation job: ${id}`);
  }
}
