/**
 * Interface for Atomic Work items in the BA Work Estimation catalog.
 * Atomic works represent individual, measurable BA activities.
 */
export interface AtomicWork {
  /** Unique identifier for the atomic work */
  id: string;
  
  /** Human-readable name of the atomic work */
  name: string;
  
  /** Detailed description of what this work entails */
  description: string;
  
  /** Base hours estimated for this work item */
  baseHours: number;
  
  /** Category classification (e.g., documentation, modeling, elicitation) */
  category: AtomicWorkCategory;
  
  /** Reference to the BA process this work belongs to */
  baProcess: string;
  
  /** Keywords for RAG search and matching */
  keywords: string[];
}

/**
 * Categories for atomic works
 */
export enum AtomicWorkCategory {
  DOCUMENTATION = 'documentation',
  MODELING = 'modeling',
  ELICITATION = 'elicitation',
  ANALYSIS = 'analysis',
  VALIDATION = 'validation',
  COMMUNICATION = 'communication',
  WORKSHOP = 'workshop',
  RESEARCH = 'research',
}

/**
 * YAML structure for atomic works catalog file
 */
export interface AtomicWorksCatalog {
  atomic_works: AtomicWorkYaml[];
}

/**
 * Raw YAML structure for atomic work (before transformation)
 */
export interface AtomicWorkYaml {
  id: string;
  name: string;
  description: string;
  base_hours: number;
  category: string;
  ba_process: string;
  keywords: string[];
}

/**
 * Document structure for vector store indexing
 */
export interface AtomicWorkDocument extends AtomicWork {
  /** Text content for embedding (combination of searchable fields) */
  searchableText: string;
  
  /** Document type for filtering */
  docType: 'atomic_work';
}
