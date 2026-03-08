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
} from "./interfaces/estimation-job.interface";
import { CreateEstimationDto } from "./dto/create-estimation.dto";
import { AgentsService } from "../agents";
import { TracingService, MetricsService } from "../observability";
import { TraceContext } from "../observability/interfaces/trace-context.interface";

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

    const job: EstimationJob = {
      id,
      status: EstimationStatus.PENDING,
      inputFolder: dto.inputFolder,
      outputFolder: dto.outputFolder || "./reports",
      verbose: dto.verbose ?? false,
      testMode: dto.testMode ?? false,
      createdAt: now,
    };

    this.jobs.set(id, job);
    this.logger.log(`Created estimation job: ${id}`);

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

      job.status = EstimationStatus.FAILED;
      job.error = errorMessage;
      job.completedAt = new Date();
      this.jobs.set(id, job);

      // Record error in trace and metrics
      this.tracingService.recordTraceError(traceContext, errorObj, {
        stage: "estimation",
      });
      this.tracingService.endEstimationTrace(traceContext, {
        success: false,
        error: errorMessage,
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
