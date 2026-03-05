import {
  NormalizedRequirement,
  ValidationResult,
  DecompositionResult,
  PertEstimate,
  DiscoveredFile,
} from '../../prompts/interfaces/prompt-context.interface';
import { TraceContext } from '../../observability/interfaces/trace-context.interface';

/**
 * Status of the validation stage
 */
export type ValidationStatus = 'pending' | 'valid' | 'invalid';

/**
 * Artifact representing a discovered file
 */
export interface Artifact {
  /** File name */
  name: string;

  /** File path */
  path: string;

  /** File content */
  content: string;

  /** File type/extension */
  type: string;
}

/**
 * Validation report details
 */
export interface ValidationReport {
  /** Validation status */
  status: ValidationStatus;

  /** List of missing required artifacts */
  missingArtifacts: string[];

  /** Quality issues found in documents */
  qualityIssues: string[];

  /** Recommendations for improvement */
  recommendations: string[];

  /** Whether estimation can proceed */
  canProceed: boolean;
}

/**
 * Atomic work mapping for decomposition stage
 */
export interface AtomicWorkMapping {
  /** Atomic work ID */
  id: string;

  /** Atomic work name */
  name: string;

  /** Associated BA process */
  baProcess: string;

  /** Rationale for this mapping */
  rationale: string;

  /** Requirement ID this maps to */
  requirementId: string;
}

/**
 * Estimate result for a single atomic work
 */
export interface Estimate {
  /** Requirement ID */
  requirementId: string;

  /** Atomic work ID */
  atomicWorkId: string;

  /** Base hours from catalog */
  baseHours: number;

  /** Optimistic estimate (O) */
  optimistic: number;

  /** Most likely estimate (M) */
  mostLikely: number;

  /** Pessimistic estimate (P) */
  pessimistic: number;

  /** Expected hours calculated via PERT: (O + 4M + P) / 6 */
  expectedHours: number;

  /** Applied complexity coefficients */
  appliedCoefficients: AppliedCoefficient[];

  /** Assumptions made during estimation */
  assumptions: string[];

  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Applied coefficient details
 */
export interface AppliedCoefficient {
  /** Coefficient ID */
  id: string;

  /** Coefficient name */
  name: string;

  /** Multiplier value applied */
  multiplier: number;

  /** Reason for application */
  reason: string;
}

/**
 * Final estimation report
 */
export interface EstimationReport {
  /** Report generation timestamp */
  timestamp: string;

  /** Input folder path */
  inputFolder: string;

  /** Total estimated hours */
  totalHours: number;

  /** Summary by BA process */
  summaryByProcess: ProcessSummary[];

  /** Summary by requirement */
  summaryByRequirement: RequirementSummary[];

  /** Detailed estimates */
  estimates: Estimate[];

  /** Markdown report content */
  markdownContent: string;

  /** CSV content for export */
  csvContent: string;
}

/**
 * Summary by BA process
 */
export interface ProcessSummary {
  /** Process ID */
  processId: string;

  /** Process name */
  processName: string;

  /** Total hours for this process */
  totalHours: number;

  /** Number of atomic works */
  workCount: number;
}

/**
 * Summary by requirement
 */
export interface RequirementSummary {
  /** Requirement ID */
  requirementId: string;

  /** Requirement title */
  requirementTitle: string;

  /** Total hours for this requirement */
  totalHours: number;

  /** Number of atomic works */
  workCount: number;
}

/**
 * Error information for state tracking
 */
export interface EstimationError {
  /** Error timestamp */
  timestamp: string;

  /** Node where error occurred */
  node: string;

  /** Error message */
  message: string;

  /** Error stack trace */
  stack?: string;
}

/**
 * Main state interface for the LangGraph estimation pipeline
 * This state is passed between nodes and accumulates results
 */
export interface EstimationState {
  // === Input ===
  /** Input folder path containing artifacts */
  inputFolder: string;

  /** Discovered and loaded artifacts */
  artifacts: Artifact[];

  // === Validation Stage ===
  /** Current validation status */
  validationStatus: ValidationStatus;

  /** Detailed validation report */
  validationReport?: ValidationReport;

  // === Extraction Stage ===
  /** Extracted and normalized requirements */
  requirements: NormalizedRequirement[];

  // === Decomposition Stage ===
  /** Mappings of requirements to atomic works */
  atomicWorks: AtomicWorkMapping[];

  // === Estimation Stage ===
  /** PERT estimates for each atomic work */
  estimates: Estimate[];

  // === Reporting Stage ===
  /** Final estimation report */
  report?: EstimationReport;

  // === Error Handling ===
  /** Accumulated errors */
  errors: EstimationError[];

  // === Pipeline Control ===
  /** Current step name */
  currentStep: string;

  /** Whether the pipeline should stop */
  shouldStop: boolean;

  // === Observability ===
  /** Trace context for observability */
  traceContext?: TraceContext;
}

/**
 * Configuration for node execution
 */
export interface NodeConfig {
  /** Runnable configuration from LangGraph */
  configurable?: Record<string, unknown>;
}

/**
 * Type for partial state updates returned by nodes
 */
export type StateUpdate = Partial<EstimationState>;

/**
 * Initial state factory
 */
export function createInitialState(inputFolder: string): EstimationState {
  return {
    inputFolder,
    artifacts: [],
    validationStatus: 'pending',
    requirements: [],
    atomicWorks: [],
    estimates: [],
    errors: [],
    currentStep: 'init',
    shouldStop: false,
  };
}
