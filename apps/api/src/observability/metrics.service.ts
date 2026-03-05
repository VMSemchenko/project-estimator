import { Injectable, Logger } from '@nestjs/common';
import {
  EstimationMetrics,
  NodeMetric,
  TimeRange,
  AggregateMetrics,
} from './interfaces/trace-context.interface';

/**
 * Service for tracking and aggregating estimation metrics
 * Provides in-memory storage of metrics with aggregation capabilities
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metricsStore: Map<string, EstimationMetrics> = new Map();

  /**
   * Record metrics for an estimation run
   * @param metrics - The metrics to record
   */
  recordEstimationMetrics(metrics: EstimationMetrics): void {
    this.metricsStore.set(metrics.estimationId, metrics);
    this.logger.debug(`Recorded metrics for estimation: ${metrics.estimationId}`);
  }

  /**
   * Get metrics for a specific estimation
   * @param estimationId - The estimation ID
   * @returns The metrics or undefined if not found
   */
  getEstimationMetrics(estimationId: string): EstimationMetrics | undefined {
    return this.metricsStore.get(estimationId);
  }

  /**
   * Get aggregate metrics for a time range
   * @param timeRange - The time range to aggregate over
   * @returns Aggregated metrics
   */
  getAggregateMetrics(timeRange: TimeRange): AggregateMetrics {
    const metricsInRange = this.getMetricsInRange(timeRange);

    const totalEstimations = metricsInRange.length;
    const successfulEstimations = metricsInRange.filter((m) => m.success).length;
    const failedEstimations = totalEstimations - successfulEstimations;

    const totalDuration = metricsInRange.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalEstimations > 0 ? totalDuration / totalEstimations : 0;

    const totalTokens = metricsInRange.reduce((sum, m) => sum + m.totalTokens, 0);
    const averageTokens = totalEstimations > 0 ? totalTokens / totalEstimations : 0;

    // Aggregate node metrics
    const nodeMetricsMap = this.aggregateNodeMetrics(metricsInRange);

    return {
      totalEstimations,
      successfulEstimations,
      failedEstimations,
      averageDuration,
      totalTokens,
      averageTokens,
      averageNodeMetrics: nodeMetricsMap,
      timeRange,
    };
  }

  /**
   * Get all estimation metrics
   * @returns Array of all metrics
   */
  getAllMetrics(): EstimationMetrics[] {
    return Array.from(this.metricsStore.values());
  }

  /**
   * Get metrics within a time range
   * @param timeRange - The time range to filter by
   * @returns Array of metrics within the time range
   */
  private getMetricsInRange(timeRange: TimeRange): EstimationMetrics[] {
    return Array.from(this.metricsStore.values()).filter((m) => {
      return m.startedAt >= timeRange.start && m.startedAt <= timeRange.end;
    });
  }

  /**
   * Aggregate node metrics across estimations
   * @param metrics - Array of metrics to aggregate
   * @returns Map of node name to aggregated metrics
   */
  private aggregateNodeMetrics(
    metrics: EstimationMetrics[],
  ): Record<string, { averageDuration: number; averageTokens: number; successRate: number }> {
    const nodeStats: Record<
      string,
      { durations: number[]; tokens: number[]; successes: number[] }
    > = {};

    // Collect stats for each node
    for (const m of metrics) {
      for (const nodeMetric of m.nodeMetrics) {
        if (!nodeStats[nodeMetric.nodeName]) {
          nodeStats[nodeMetric.nodeName] = {
            durations: [],
            tokens: [],
            successes: [],
          };
        }

        nodeStats[nodeMetric.nodeName].durations.push(nodeMetric.duration);
        nodeStats[nodeMetric.nodeName].tokens.push(nodeMetric.tokens);
        nodeStats[nodeMetric.nodeName].successes.push(nodeMetric.success ? 1 : 0);
      }
    }

    // Calculate averages
    const result: Record<
      string,
      { averageDuration: number; averageTokens: number; successRate: number }
    > = {};

    for (const [nodeName, stats] of Object.entries(nodeStats)) {
      const count = stats.durations.length;
      result[nodeName] = {
        averageDuration:
          count > 0 ? stats.durations.reduce((a, b) => a + b, 0) / count : 0,
        averageTokens:
          count > 0 ? stats.tokens.reduce((a, b) => a + b, 0) / count : 0,
        successRate:
          count > 0 ? stats.successes.reduce((a, b) => a + b, 0) / count : 0,
      };
    }

    return result;
  }

  /**
   * Create a metrics builder for fluent API
   * @param estimationId - The estimation ID
   * @returns Metrics builder instance
   */
  createBuilder(estimationId: string): MetricsBuilder {
    return new MetricsBuilder(estimationId);
  }

  /**
   * Delete metrics for an estimation
   * @param estimationId - The estimation ID
   * @returns True if metrics were deleted, false if not found
   */
  deleteMetrics(estimationId: string): boolean {
    const deleted = this.metricsStore.delete(estimationId);
    if (deleted) {
      this.logger.debug(`Deleted metrics for estimation: ${estimationId}`);
    }
    return deleted;
  }

  /**
   * Clear all stored metrics
   */
  clearAll(): void {
    this.metricsStore.clear();
    this.logger.debug('Cleared all metrics');
  }

  /**
   * Get the count of stored metrics
   */
  getMetricsCount(): number {
    return this.metricsStore.size;
  }
}

/**
 * Builder class for creating estimation metrics
 */
export class MetricsBuilder {
  private readonly estimationId: string;
  private totalTokens = 0;
  private promptTokens = 0;
  private completionTokens = 0;
  private duration = 0;
  private readonly nodeMetrics: NodeMetric[] = [];
  private readonly startedAt: Date;
  private completedAt?: Date;
  private success = true;
  private error?: string;

  constructor(estimationId: string) {
    this.estimationId = estimationId;
    this.startedAt = new Date();
  }

  /**
   * Set token usage
   */
  withTokenUsage(promptTokens: number, completionTokens: number): this {
    this.promptTokens = promptTokens;
    this.completionTokens = completionTokens;
    this.totalTokens = promptTokens + completionTokens;
    return this;
  }

  /**
   * Set duration
   */
  withDuration(durationMs: number): this {
    this.duration = durationMs;
    return this;
  }

  /**
   * Add node metric
   */
  addNodeMetric(metric: NodeMetric): this {
    this.nodeMetrics.push(metric);
    return this;
  }

  /**
   * Mark as completed
   */
  markCompleted(): this {
    this.completedAt = new Date();
    return this;
  }

  /**
   * Mark as failed
   */
  markFailed(error: string): this {
    this.success = false;
    this.error = error;
    this.completedAt = new Date();
    return this;
  }

  /**
   * Build the metrics object
   */
  build(): EstimationMetrics {
    return {
      estimationId: this.estimationId,
      totalTokens: this.totalTokens,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      duration: this.duration,
      nodeMetrics: this.nodeMetrics,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      success: this.success,
      error: this.error,
    };
  }
}
