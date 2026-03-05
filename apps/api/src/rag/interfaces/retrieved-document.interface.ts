/**
 * Interface for a retrieved document from vector search
 */
export interface RetrievedDocument {
  /** Unique identifier of the document */
  id: string;

  /** The text content of the document */
  content: string;

  /** Similarity score (0-1, higher is more similar) */
  score: number;

  /** Metadata associated with the document */
  metadata: DocumentMetadata;
}

/**
 * Metadata associated with a document
 */
export interface DocumentMetadata {
  /** Source of the document (e.g., file name, URL) */
  source?: string;

  /** Type of content (e.g., "requirement", "specification", "guideline") */
  type?: string;

  /** Project or context identifier */
  projectId?: string;

  /** Timestamp when document was created/ingested */
  createdAt?: Date;

  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Options for similarity search
 */
export interface SimilaritySearchOptions {
  /** Number of documents to retrieve */
  k?: number;

  /** Minimum similarity score threshold (0-1) */
  scoreThreshold?: number;

  /** Filter by metadata fields */
  filter?: Record<string, unknown>;

  /** Include metadata in results */
  includeMetadata?: boolean;
}

/**
 * Result of a similarity search operation
 */
export interface SimilaritySearchResult {
  /** Retrieved documents */
  documents: RetrievedDocument[];

  /** Query that was executed */
  query: string;

  /** Time taken for the search in milliseconds */
  duration: number;
}
