import { GraphState, NodeNames } from "./state";
import { END } from "@langchain/langgraph";

/**
 * Conditional edge function to determine routing after validation node
 *
 * Routes to:
 * - EXTRACTION: If validation passed and can proceed
 * - END: If validation failed or cannot proceed
 *
 * @param state - Current graph state
 * @returns Node name for routing
 */
export function shouldContinueAfterValidation(state: GraphState): string {
  // Check if validation report exists and indicates we can proceed
  if (state.validationReport && !state.validationReport.canProceed) {
    return END;
  }

  // Check validation status
  if (state.validationStatus === "invalid") {
    return END;
  }

  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return END;
  }

  // Check for critical errors that should halt execution
  const criticalErrors = state.errors.filter(
    (error) =>
      error.node === NodeNames.VALIDATION &&
      (error.message.includes("Input folder does not exist") ||
        error.message.includes("Permission denied")),
  );

  if (criticalErrors.length > 0) {
    return END;
  }

  return NodeNames.EXTRACTION;
}

/**
 * Conditional edge function to determine routing after extraction node
 *
 * Routes to:
 * - DECOMPOSITION: If requirements were extracted successfully
 * - END: If no requirements found or critical error
 *
 * @param state - Current graph state
 * @returns Node name for routing
 */
export function shouldContinueAfterExtraction(state: GraphState): string {
  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return END;
  }

  // Check if any requirements were extracted
  if (!state.requirements || state.requirements.length === 0) {
    return END;
  }

  // Check for critical errors in extraction
  const criticalErrors = state.errors.filter(
    (error) => error.node === NodeNames.EXTRACTION,
  );

  // If there are errors but we have requirements, continue anyway
  // The errors will be reported in the final report
  if (criticalErrors.length > 0 && state.requirements.length === 0) {
    return END;
  }

  return NodeNames.DECOMPOSITION;
}

/**
 * Conditional edge function to determine routing after decomposition node
 *
 * Routes to:
 * - ESTIMATION: If atomic works were identified
 * - END: If no atomic works found
 *
 * @param state - Current graph state
 * @returns Node name for routing
 */
export function shouldContinueAfterDecomposition(state: GraphState): string {
  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return END;
  }

  // Check if any atomic works were identified
  if (!state.atomicWorks || state.atomicWorks.length === 0) {
    return END;
  }

  return NodeNames.ESTIMATION;
}

/**
 * Conditional edge function to determine routing after estimation node
 *
 * Routes to:
 * - REPORTING: If estimates were generated
 * - END: If no estimates generated
 *
 * @param state - Current graph state
 * @returns Node name for routing
 */
export function shouldContinueAfterEstimation(state: GraphState): string {
  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return END;
  }

  // Check if any estimates were generated
  if (!state.estimates || state.estimates.length === 0) {
    return END;
  }

  return NodeNames.REPORTING;
}

/**
 * Check if the pipeline has any critical errors that should halt execution
 *
 * @param state - Current graph state
 * @returns True if there are critical errors
 */
export function hasCriticalErrors(state: GraphState): boolean {
  const criticalErrorPatterns = [
    /Input folder does not exist/i,
    /Permission denied/i,
    /Out of memory/i,
    /API key.*invalid/i,
    /Rate limit exceeded/i,
  ];

  return state.errors.some((error) =>
    criticalErrorPatterns.some((pattern) => pattern.test(error.message)),
  );
}

/**
 * Get error severity level
 *
 * @param error - Error to evaluate
 * @returns Severity level: 'critical', 'warning', or 'info'
 */
export function getErrorSeverity(error: {
  message: string;
  node: string;
}): "critical" | "warning" | "info" {
  const criticalPatterns = [
    /Input folder does not exist/i,
    /Permission denied/i,
    /Out of memory/i,
  ];

  const warningPatterns = [
    /Failed to parse/i,
    /Missing required field/i,
    /Using default value/i,
  ];

  if (criticalPatterns.some((pattern) => pattern.test(error.message))) {
    return "critical";
  }

  if (warningPatterns.some((pattern) => pattern.test(error.message))) {
    return "warning";
  }

  return "info";
}
