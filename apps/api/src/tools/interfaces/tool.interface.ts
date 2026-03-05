/**
 * Base interface for all tools in the BA Work Estimation system.
 * Tools are used by agents to interact with files, PDFs, and the RAG system.
 */
export interface Tool<TInput = unknown, TOutput = unknown> {
  /** Unique name of the tool */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /**
   * Execute the tool with the given input
   * @param input - The input parameters for the tool
   * @returns Promise resolving to the tool output
   */
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Result type for file reading operations
 */
export interface FileReadResult {
  /** The file path that was read */
  path: string;

  /** The content of the file as a string */
  content: string;

  /** Size of the file in bytes */
  size: number;
}

/**
 * Result type for PDF extraction operations
 */
export interface PdfExtractionResult {
  /** The extracted text content */
  text: string;

  /** Total number of pages in the PDF */
  pageCount: number;

  /** PDF metadata (title, author, etc.) */
  metadata: Record<string, unknown>;

  /** Text content per page (optional) */
  pages?: string[];
}

/**
 * Result type for catalog search operations
 */
export interface CatalogSearchResult {
  /** Matching atomic works */
  atomicWorks: AtomicWorkResult[];

  /** Matching coefficients */
  coefficients: CoefficientResult[];

  /** Matching BA processes */
  baProcesses: BaProcessResult[];
}

/**
 * Atomic work search result
 */
export interface AtomicWorkResult {
  /** Unique identifier */
  id: string;

  /** Name of the atomic work */
  name: string;

  /** Description of the work */
  description: string;

  /** Base hours estimate */
  baseHours: number;

  /** Category of the work */
  category: string;

  /** Similarity score (0-1) */
  score?: number;
}

/**
 * Coefficient search result
 */
export interface CoefficientResult {
  /** Unique identifier */
  id: string;

  /** Name of the coefficient */
  name: string;

  /** Description of when it applies */
  description: string;

  /** Multiplier value */
  multiplier: number;

  /** Trigger phrases */
  triggers: string[];

  /** Similarity score (0-1) */
  score?: number;
}

/**
 * BA Process search result
 */
export interface BaProcessResult {
  /** Unique identifier */
  id: string;

  /** Name of the BA process */
  name: string;

  /** Description of the process */
  description: string;

  /** Category of the process */
  category: string;

  /** Similarity score (0-1) */
  score?: number;
}
