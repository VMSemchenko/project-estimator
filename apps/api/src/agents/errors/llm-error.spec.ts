import { LLMError, EstimationErrorType } from "./llm-error";

describe("LLMError", () => {
  describe("constructor", () => {
    it("should create an LLMError with message", () => {
      const error = new LLMError("Test error message");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LLMError);
      expect(error.name).toBe("LLMError");
      expect(error.message).toBe("Test error message");
      expect(error.errorType).toBe(EstimationErrorType.LLM_FAILURE);
    });

    it("should create an LLMError with cause and context", () => {
      const cause = new Error("Original error");
      const context = {
        node: "extraction",
        operation: "invoke",
        model: "gpt-4",
        retryCount: 2,
        retryable: true,
      };

      const error = new LLMError("LLM call failed", { cause, context });

      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("isLLMError", () => {
    it("should return true for LLMError instances", () => {
      const error = new LLMError("Test error");
      expect(LLMError.isLLMError(error)).toBe(true);
    });

    it("should return false for regular Error instances", () => {
      const error = new Error("Regular error");
      expect(LLMError.isLLMError(error)).toBe(false);
    });

    it("should return false for non-error values", () => {
      expect(LLMError.isLLMError(null)).toBe(false);
      expect(LLMError.isLLMError(undefined)).toBe(false);
      expect(LLMError.isLLMError("string")).toBe(false);
      expect(LLMError.isLLMError(123)).toBe(false);
    });
  });

  describe("fromError", () => {
    it("should return the same LLMError if already an LLMError", () => {
      const originalError = new LLMError("Original LLM error");
      const convertedError = LLMError.fromError(originalError);

      expect(convertedError).toBe(originalError);
    });

    it("should convert regular Error to LLMError", () => {
      const originalError = new Error("Regular error");
      const context = { node: "validation" };
      const convertedError = LLMError.fromError(originalError, context);

      expect(convertedError).toBeInstanceOf(LLMError);
      expect(convertedError.message).toBe("Regular error");
      expect(convertedError.cause).toBe(originalError);
      expect(convertedError.context).toEqual(context);
    });

    it("should convert string error to LLMError", () => {
      const convertedError = LLMError.fromError("String error message");

      expect(convertedError).toBeInstanceOf(LLMError);
      expect(convertedError.message).toBe("String error message");
      expect(convertedError.cause).toBeUndefined();
    });
  });

  describe("isRetryable", () => {
    it("should return true when context.retryable is true", () => {
      const error = new LLMError("Error", {
        context: { retryable: true },
      });

      expect(error.isRetryable()).toBe(true);
    });

    it("should return false when context.retryable is false", () => {
      const error = new LLMError("Error", {
        context: { retryable: false },
      });

      expect(error.isRetryable()).toBe(false);
    });

    it("should detect rate limit errors as retryable", () => {
      const error = new LLMError("Rate limit exceeded");
      expect(error.isRetryable()).toBe(true);
    });

    it("should detect timeout errors as retryable", () => {
      const error = new LLMError("Request timed out");
      expect(error.isRetryable()).toBe(true);
    });

    it("should detect 429 status as retryable", () => {
      const error = new LLMError("Error 429: Too many requests");
      expect(error.isRetryable()).toBe(true);
    });

    it("should detect 503 status as retryable", () => {
      const error = new LLMError("Service unavailable: 503");
      expect(error.isRetryable()).toBe(true);
    });

    it("should detect connection errors as retryable", () => {
      const error = new LLMError("ECONNRESET");
      expect(error.isRetryable()).toBe(true);
    });

    it("should return false for non-retryable errors", () => {
      const error = new LLMError("Invalid API key");
      expect(error.isRetryable()).toBe(false);
    });

    it("should check cause message for retryable patterns", () => {
      const error = new LLMError("Request failed", {
        cause: new Error("Rate limit exceeded"),
      });
      expect(error.isRetryable()).toBe(true);
    });
  });

  describe("toJSON", () => {
    it("should return serializable object", () => {
      const cause = new Error("Cause error");
      const error = new LLMError("Test error", {
        cause,
        context: { node: "extraction", operation: "invoke" },
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: "LLMError",
        message: "Test error",
        errorType: EstimationErrorType.LLM_FAILURE,
        context: { node: "extraction", operation: "invoke" },
        cause: "Cause error",
        stack: expect.any(String),
      });
    });

    it("should handle error without cause or context", () => {
      const error = new LLMError("Simple error");
      const json = error.toJSON();

      expect(json.name).toBe("LLMError");
      expect(json.message).toBe("Simple error");
      expect(json.errorType).toBe(EstimationErrorType.LLM_FAILURE);
      expect(json.context).toBeUndefined();
      expect(json.cause).toBeUndefined();
    });
  });
});

describe("EstimationErrorType", () => {
  it("should have all expected error types", () => {
    expect(EstimationErrorType.LLM_FAILURE).toBe("llm_failure");
    expect(EstimationErrorType.IO_ERROR).toBe("io_error");
    expect(EstimationErrorType.VALIDATION_ERROR).toBe("validation_error");
    expect(EstimationErrorType.PARSE_ERROR).toBe("parse_error");
    expect(EstimationErrorType.RAG_ERROR).toBe("rag_error");
    expect(EstimationErrorType.UNKNOWN).toBe("unknown");
  });
});
