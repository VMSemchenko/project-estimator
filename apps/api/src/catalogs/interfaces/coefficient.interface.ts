/**
 * Interface for Complexity Coefficients in the BA Work Estimation catalog.
 * Coefficients modify base hours based on project complexity factors.
 */
export interface Coefficient {
  /** Unique identifier for the coefficient */
  id: string;
  
  /** Human-readable name of the coefficient */
  name: string;
  
  /** Detailed description of when this coefficient applies */
  description: string;
  
  /** Multiplier to apply to base hours (e.g., 1.5 = 50% increase) */
  multiplier: number;
  
  /** Trigger phrases/keywords that indicate this coefficient applies */
  triggers: string[];
}

/**
 * YAML structure for coefficients catalog file
 */
export interface CoefficientsCatalog {
  coefficients: CoefficientYaml[];
}

/**
 * Raw YAML structure for coefficient (before transformation)
 */
export interface CoefficientYaml {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  triggers: string[];
}

/**
 * Document structure for vector store indexing
 */
export interface CoefficientDocument extends Coefficient {
  /** Text content for embedding (combination of searchable fields) */
  searchableText: string;
  
  /** Document type for filtering */
  docType: 'coefficient';
}

/**
 * Result of coefficient matching against project description
 */
export interface CoefficientMatch {
  /** The matched coefficient */
  coefficient: Coefficient;
  
  /** Matched trigger phrases found in the description */
  matchedTriggers: string[];
  
  /** Confidence score of the match (0-1) */
  confidence: number;
}

/**
 * Combined coefficients result for estimation
 */
export interface AppliedCoefficients {
  /** List of matched coefficients with details */
  matches: CoefficientMatch[];
  
  /** Combined multiplier (product of all coefficient multipliers) */
  combinedMultiplier: number;
  
  /** Whether any coefficients were applied */
  hasCoefficients: boolean;
}
