/**
 * Error types for classification of estimation failures
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
 * Custom error class for LLM-related failures
 * Used to distinguish LLM API failures from other types of errors
 */
export class LLMError extends Error {
  /** Type of the error for classification */
  public readonly errorType: EstimationErrorType =
    EstimationErrorType.LLM_FAILURE;

  /** Original error that caused the LLM failure */
  public readonly cause?: Error;

  /** Additional context about the LLM operation that failed */
  public readonly context?: {
    /** Node where the error occurred */
    node?: string;
    /** Model being used */
    model?: string;
    /** Operation type (invoke, stream, embed, etc.) */
    operation?: string;
    /** Number of retries attempted */
    retryCount?: number;
    /** Whether this is a retryable error */
    retryable?: boolean;
  };

  constructor(
    message: string,
    options?: {
      cause?: Error;
      context?: LLMError["context"];
    },
  ) {
    super(message);
    this.name = "LLMError";
    this.cause = options?.cause;
    this.context = options?.context;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMError);
    }
  }

  /**
   * Check if an error is an LLMError
   */
  static isLLMError(error: unknown): error is LLMError {
    return error instanceof LLMError;
  }

  /**
   * Create an LLMError from an unknown error
   */
  static fromError(error: unknown, context?: LLMError["context"]): LLMError {
    if (LLMError.isLLMError(error)) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new LLMError(message, {
      cause: error instanceof Error ? error : undefined,
      context,
    });
  }

  /**
   * Check if the error is retryable (e.g., rate limit, timeout)
   */
  isRetryable(): boolean {
    // Check explicit retryable flag
    if (this.context?.retryable !== undefined) {
      return this.context.retryable;
    }

    // Check common retryable error patterns
    const message = this.message.toLowerCase();
    const causeMessage = this.cause?.message?.toLowerCase() || "";

    const retryablePatterns = [
      "rate limit",
      "too many requests",
      "timeout",
      "timed out",
      "connection reset",
      "econnreset",
      "econnrefused",
      "service unavailable",
      "503",
      "429",
      "overloaded",
      "capacity",
    ];

    return retryablePatterns.some(
      (pattern) => message.includes(pattern) || causeMessage.includes(pattern),
    );
  }

  /**
   * Get a serializable representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      errorType: this.errorType,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}
