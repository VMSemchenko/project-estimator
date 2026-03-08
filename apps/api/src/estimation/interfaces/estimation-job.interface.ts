/**
 * Estimation job status enum
 */
export enum EstimationStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Confidence level for estimation results
 */
export enum ConfidenceLevel {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Summary of estimation results
 */
export interface EstimationSummary {
  totalHours: number;
  requirementsCount: number;
  confidenceLevel: ConfidenceLevel;
}

/**
 * Artifacts generated during estimation
 */
export interface EstimationArtifacts {
  report: string;
  csv: string;
  estimationReport?: string; // Full markdown report content
  detailedBreakdown?: string; // JSON breakdown content
  riskAssessment?: string; // Risk assessment content
}

/**
 * Links for HATEOAS support
 */
export interface EstimationLinks {
  self: string;
  report: string;
}

/**
 * Estimation job interface
 */
export interface EstimationJob {
  id: string;
  status: EstimationStatus;
  inputFolder: string;
  outputFolder: string;
  verbose: boolean;
  testMode: boolean;
  createdAt: Date;
  completedAt?: Date;
  summary?: EstimationSummary;
  artifacts?: EstimationArtifacts;
  error?: string;
}

/**
 * Create estimation request
 */
export interface CreateEstimationRequest {
  inputFolder: string;
  outputFolder?: string;
  verbose?: boolean;
  testMode?: boolean;
}

/**
 * Estimation response for POST /estimate
 */
export interface CreateEstimationResponse {
  id: string;
  status: EstimationStatus;
  createdAt: string;
  links: EstimationLinks;
}

/**
 * Full estimation response for GET /estimate/:id
 */
export interface GetEstimationResponse {
  id: string;
  status: EstimationStatus;
  createdAt: string;
  completedAt?: string;
  summary?: EstimationSummary;
  artifacts?: EstimationArtifacts;
  error?: string;
}
