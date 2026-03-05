/**
 * Context interface for prompt templates
 */
export interface PromptContext {
  /** Input folder path */
  inputFolderPath?: string;

  /** List of discovered files */
  discoveredFiles?: DiscoveredFile[];

  /** Document content (ShRD, BV, etc.) */
  documentContent?: string;

  /** Business Vision content */
  businessVision?: string;

  /** Stakeholder Requirements Document content */
  stakeholderRequirements?: string;

  /** List of normalized requirements */
  requirements?: NormalizedRequirement[];

  /** RAG-retrieved atomic works from catalog */
  atomicWorksCatalog?: AtomicWorkReference[];

  /** BA processes catalog */
  baProcessesCatalog?: BaProcessReference[];

  /** Decomposition results */
  decompositionResults?: DecompositionResult[];

  /** PERT estimates */
  estimates?: PertEstimate[];

  /** Validation results */
  validationResults?: ValidationResult;

  /** Additional context variables */
  [key: string]: unknown;
}

/**
 * Discovered file information
 */
export interface DiscoveredFile {
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
 * Normalized requirement structure
 */
export interface NormalizedRequirement {
  /** Requirement ID (REQ-001, etc.) */
  id: string;

  /** Short title */
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

  /** Source document */
  sourceDocument: string;
}

/**
 * Reference to atomic work from catalog
 */
export interface AtomicWorkReference {
  /** Atomic work ID */
  id: string;

  /** Atomic work name */
  name: string;

  /** Associated BA process */
  baProcess: string;

  /** Base hours estimate */
  baseHours: number;

  /** Description */
  description?: string;
}

/**
 * Reference to BA process from catalog
 */
export interface BaProcessReference {
  /** Process ID */
  id: string;

  /** Process name */
  name: string;

  /** Process category */
  category: string;

  /** Description */
  description?: string;
}

/**
 * Decomposition result mapping requirement to atomic works
 */
export interface DecompositionResult {
  /** Requirement ID */
  requirementId: string;

  /** Requirement title */
  requirementTitle: string;

  /** Mapped atomic works */
  atomicWorks: AtomicWorkMapping[];
}

/**
 * Atomic work mapping details
 */
export interface AtomicWorkMapping {
  /** Atomic work ID */
  id: string;

  /** Atomic work name */
  name: string;

  /** Associated BA process */
  baProcess: string;

  /** Rationale for this work */
  rationale: string;
}

/**
 * PERT estimate structure
 */
export interface PertEstimate {
  /** Requirement ID */
  requirementId: string;

  /** Atomic work ID */
  atomicWorkId: string;

  /** Base hours from catalog */
  baseHours: number;

  /** Optimistic estimate */
  optimistic: number;

  /** Most likely estimate */
  mostLikely: number;

  /** Pessimistic estimate */
  pessimistic: number;

  /** Expected hours (PERT formula) */
  expectedHours: number;

  /** Applied coefficients */
  appliedCoefficients: AppliedCoefficient[];

  /** Assumptions made */
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

  /** Multiplier value */
  multiplier: number;

  /** Reason for application */
  reason: string;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  /** Validation status */
  status: 'valid' | 'invalid' | 'partial';

  /** Missing artifacts list */
  missingArtifacts: string[];

  /** Quality issues found */
  qualityIssues: string[];

  /** Recommendations for improvement */
  recommendations: string[];

  /** Whether estimation can proceed */
  canProceed: boolean;
}

/**
 * Agent type enumeration
 */
export enum AgentType {
  VALIDATION = 'validation',
  EXTRACTION = 'extraction',
  DECOMPOSITION = 'decomposition',
  ESTIMATION = 'estimation',
  REPORTING = 'reporting',
}

/**
 * Prompt template interface
 */
export interface PromptTemplate {
  /** Agent type */
  agentType: AgentType;

  /** Raw template content */
  content: string;

  /** Compiled template with context */
  compiled?: string;
}
