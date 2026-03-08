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
 * Error type classification for failed estimations
 */
export enum EstimationErrorType {
  /** LLM API call failed (rate limit, timeout, API error, etc.) */
  LLM_FAILURE = "llm_failure",

  /** Input/output file operations failed */
  IO_ERROR = "io_error",

  /** Validation of input artifacts failed */
  VALIDATION_ERROR = "validation_error",

  /** JSON parsing or response format error */
  PARSE_ERROR = "parse_error",

  /** RAG retrieval failed */
  RAG_ERROR = "rag_error",

  /** Unknown/unexpected error */
  UNKNOWN = "unknown",
}

/**
 * Detailed error information for failed estimations
 */
export interface EstimationErrorDetails {
  /** Classification of the error type */
  type: EstimationErrorType;

  /** Human-readable error message */
  message: string;

  /** Node where the error occurred */
  node?: string;

  /** Original error stack trace */
  stack?: string;

  /** Whether this error is potentially retryable */
  retryable?: boolean;

  /** Timestamp when the error occurred */
  timestamp?: string;
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
  catalogSet?: string;
  createdAt: Date;
  completedAt?: Date;
  summary?: EstimationSummary;
  artifacts?: EstimationArtifacts;
  /** @deprecated Use errorDetails instead */
  error?: string;
  /** Detailed error information including type classification */
  errorDetails?: EstimationErrorDetails;
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
  /** @deprecated Use errorDetails instead */
  error?: string;
  /** Detailed error information including type classification */
  errorDetails?: EstimationErrorDetails;
}
