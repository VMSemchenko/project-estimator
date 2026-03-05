import { EstimationState, EstimationError } from './agent-state.interface';

/**
 * Result of a single node execution
 */
export interface NodeResult {
  /** Whether the node execution was successful */
  success: boolean;

  /** Partial state update to merge */
  stateUpdate: Partial<EstimationState>;

  /** Errors that occurred during execution */
  errors: EstimationError[];

  /** Duration of execution in milliseconds */
  duration: number;

  /** Node name that produced this result */
  nodeName: string;
}

/**
 * Result of the complete estimation pipeline
 */
export interface PipelineResult {
  /** Whether the entire pipeline was successful */
  success: boolean;

  /** Final state after all nodes completed */
  finalState: EstimationState;

  /** All errors that occurred during pipeline execution */
  errors: EstimationError[];

  /** Total pipeline duration in milliseconds */
  totalDuration: number;

  /** Individual node results */
  nodeResults: NodeResult[];

  /** Summary statistics */
  summary: PipelineSummary;
}

/**
 * Summary statistics for the pipeline execution
 */
export interface PipelineSummary {
  /** Number of artifacts processed */
  artifactsProcessed: number;

  /** Number of requirements extracted */
  requirementsExtracted: number;

  /** Number of atomic works identified */
  atomicWorksIdentified: number;

  /** Number of estimates generated */
  estimatesGenerated: number;

  /** Total estimated hours */
  totalEstimatedHours: number;

  /** Whether validation passed */
  validationPassed: boolean;

  /** Whether report was generated */
  reportGenerated: boolean;
}

/**
 * Result of validation node specifically
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Validation status */
  status: 'valid' | 'invalid' | 'partial';

  /** List of missing required documents */
  missingDocuments: string[];

  /** Quality issues found */
  qualityIssues: QualityIssue[];

  /** Recommendations for improvement */
  recommendations: string[];

  /** Whether to proceed with estimation */
  canProceed: boolean;
}

/**
 * Quality issue details
 */
export interface QualityIssue {
  /** Document where issue was found */
  document: string;

  /** Issue severity */
  severity: 'error' | 'warning' | 'info';

  /** Issue description */
  description: string;

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Result of extraction node specifically
 */
export interface ExtractionResult {
  /** Number of requirements extracted */
  count: number;

  /** Extracted requirements */
  requirements: ExtractedRequirement[];

  /** Source document information */
  sourceDocument: string;

  /** Extraction confidence */
  confidence: number;
}

/**
 * Extracted requirement details
 */
export interface ExtractedRequirement {
  /** Generated requirement ID */
  id: string;

  /** Requirement title */
  title: string;

  /** Full description */
  description: string;

  /** Original text from document */
  originalText: string;

  /** Requirement type */
  type: 'functional' | 'non-functional' | 'constraint';

  /** Acceptance criteria */
  acceptanceCriteria: string[];

  /** Priority level */
  priority: 'high' | 'medium' | 'low';
}

/**
 * Result of decomposition node specifically
 */
export interface DecompositionResult {
  /** Number of requirements decomposed */
  requirementsProcessed: number;

  /** Total atomic works identified */
  totalAtomicWorks: number;

  /** Decomposition mappings */
  mappings: DecompositionMapping[];

  /** Average works per requirement */
  averageWorksPerRequirement: number;
}

/**
 * Decomposition mapping details
 */
export interface DecompositionMapping {
  /** Requirement ID */
  requirementId: string;

  /** Requirement title */
  requirementTitle: string;

  /** Mapped atomic works */
  atomicWorks: MappedAtomicWork[];
}

/**
 * Mapped atomic work details
 */
export interface MappedAtomicWork {
  /** Atomic work ID */
  id: string;

  /** Atomic work name */
  name: string;

  /** BA process */
  baProcess: string;

  /** Mapping confidence */
  confidence: number;

  /** Rationale for mapping */
  rationale: string;
}

/**
 * Result of estimation node specifically
 */
export interface EstimationResult {
  /** Number of estimates generated */
  count: number;

  /** Total estimated hours */
  totalHours: number;

  /** Individual estimates */
  estimates: GeneratedEstimate[];

  /** Coefficients applied */
  appliedCoefficients: string[];

  /** Average confidence level */
  averageConfidence: number;
}

/**
 * Generated estimate details
 */
export interface GeneratedEstimate {
  /** Requirement ID */
  requirementId: string;

  /** Atomic work ID */
  atomicWorkId: string;

  /** Base hours */
  baseHours: number;

  /** Optimistic estimate */
  optimistic: number;

  /** Most likely estimate */
  mostLikely: number;

  /** Pessimistic estimate */
  pessimistic: number;

  /** Expected hours (PERT) */
  expectedHours: number;

  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Result of reporting node specifically
 */
export interface ReportingResult {
  /** Whether report was generated successfully */
  success: boolean;

  /** Report format */
  format: 'markdown' | 'csv' | 'both';

  /** Markdown content */
  markdownContent?: string;

  /** CSV content */
  csvContent?: string;

  /** Report file paths (if saved) */
  filePaths?: {
    markdown?: string;
    csv?: string;
  };
}
