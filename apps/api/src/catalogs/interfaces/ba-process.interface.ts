/**
 * Interface for BA Process categories in the BA Work Estimation catalog.
 * BA processes group related atomic works together.
 */
export interface BaProcess {
  /** Unique identifier for the BA process */
  id: string;
  
  /** Human-readable name of the BA process */
  name: string;
  
  /** Detailed description of the process */
  description: string;
  
  /** Category classification */
  category: BaProcessCategory;
}

/**
 * Categories for BA processes
 */
export enum BaProcessCategory {
  ELICITATION = 'elicitation',
  DOCUMENTATION = 'documentation',
  MODELING = 'modeling',
  ANALYSIS = 'analysis',
  VALIDATION = 'validation',
  COMMUNICATION = 'communication',
  PLANNING = 'planning',
}

/**
 * YAML structure for BA processes catalog file
 */
export interface BaProcessesCatalog {
  ba_processes: BaProcessYaml[];
}

/**
 * Raw YAML structure for BA process (before transformation)
 */
export interface BaProcessYaml {
  id: string;
  name: string;
  description: string;
  category: string;
}

/**
 * Document structure for vector store indexing
 */
export interface BaProcessDocument extends BaProcess {
  /** Text content for embedding (combination of searchable fields) */
  searchableText: string;
  
  /** Document type for filtering */
  docType: 'ba_process';
}
