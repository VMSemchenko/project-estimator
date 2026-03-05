import { GraphState, EdgeNames, NodeNames } from './state';

/**
 * Conditional edge function to determine routing after validation node
 * 
 * Routes to:
 * - CONTINUE: If validation passed and can proceed
 * - END: If validation failed or cannot proceed
 * 
 * @param state - Current graph state
 * @returns Edge name for routing
 */
export function shouldContinueAfterValidation(state: GraphState): string {
  // Check if validation report exists and indicates we can proceed
  if (state.validationReport && !state.validationReport.canProceed) {
    return EdgeNames.END;
  }
  
  // Check validation status
  if (state.validationStatus === 'invalid') {
    return EdgeNames.END;
  }
  
  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return EdgeNames.END;
  }
  
  // Check for critical errors that should halt execution
  const criticalErrors = state.errors.filter(
    (error) => error.node === NodeNames.VALIDATION && 
    (error.message.includes('Input folder does not exist') ||
     error.message.includes('Permission denied'))
  );
  
  if (criticalErrors.length > 0) {
    return EdgeNames.END;
  }
  
  return EdgeNames.CONTINUE;
}

/**
 * Conditional edge function to determine routing after extraction node
 * 
 * Routes to:
 * - CONTINUE: If requirements were extracted successfully
 * - END: If no requirements found or critical error
 * 
 * @param state - Current graph state
 * @returns Edge name for routing
 */
export function shouldContinueAfterExtraction(state: GraphState): string {
  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return EdgeNames.END;
  }
  
  // Check if any requirements were extracted
  if (!state.requirements || state.requirements.length === 0) {
    return EdgeNames.END;
  }
  
  // Check for critical errors in extraction
  const criticalErrors = state.errors.filter(
    (error) => error.node === NodeNames.EXTRACTION
  );
  
  // If there are errors but we have requirements, continue anyway
  // The errors will be reported in the final report
  if (criticalErrors.length > 0 && state.requirements.length === 0) {
    return EdgeNames.END;
  }
  
  return EdgeNames.CONTINUE;
}

/**
 * Conditional edge function to determine routing after decomposition node
 * 
 * Routes to:
 * - CONTINUE: If atomic works were identified
 * - END: If no atomic works found
 * 
 * @param state - Current graph state
 * @returns Edge name for routing
 */
export function shouldContinueAfterDecomposition(state: GraphState): string {
  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return EdgeNames.END;
  }
  
  // Check if any atomic works were identified
  if (!state.atomicWorks || state.atomicWorks.length === 0) {
    return EdgeNames.END;
  }
  
  return EdgeNames.CONTINUE;
}

/**
 * Conditional edge function to determine routing after estimation node
 * 
 * Routes to:
 * - CONTINUE: If estimates were generated
 * - END: If no estimates generated
 * 
 * @param state - Current graph state
 * @returns Edge name for routing
 */
export function shouldContinueAfterEstimation(state: GraphState): string {
  // Check if shouldStop flag is set
  if (state.shouldStop) {
    return EdgeNames.END;
  }
  
  // Check if any estimates were generated
  if (!state.estimates || state.estimates.length === 0) {
    return EdgeNames.END;
  }
  
  return EdgeNames.CONTINUE;
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
    criticalErrorPatterns.some((pattern) => pattern.test(error.message))
  );
}

/**
 * Get error severity level
 * 
 * @param error - Error to evaluate
 * @returns Severity level: 'critical', 'warning', or 'info'
 */
export function getErrorSeverity(error: { message: string; node: string }): 'critical' | 'warning' | 'info' {
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
    return 'critical';
  }
  
  if (warningPatterns.some((pattern) => pattern.test(error.message))) {
    return 'warning';
  }
  
  return 'info';
}

/**
 * Conditional edge map for validation node
 * Maps edge names to target node names
 */
export const validationEdgeMap: Record<string, string> = {
  [EdgeNames.CONTINUE]: NodeNames.EXTRACTION,
  [EdgeNames.END]: '__end__',
};

/**
 * Conditional edge map for extraction node
 */
export const extractionEdgeMap: Record<string, string> = {
  [EdgeNames.CONTINUE]: NodeNames.DECOMPOSITION,
  [EdgeNames.END]: '__end__',
};

/**
 * Conditional edge map for decomposition node
 */
export const decompositionEdgeMap: Record<string, string> = {
  [EdgeNames.CONTINUE]: NodeNames.ESTIMATION,
  [EdgeNames.END]: '__end__',
};

/**
 * Conditional edge map for estimation node
 */
export const estimationEdgeMap: Record<string, string> = {
  [EdgeNames.CONTINUE]: NodeNames.REPORTING,
  [EdgeNames.END]: '__end__',
};
