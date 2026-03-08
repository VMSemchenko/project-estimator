/**
 * LangGraph Orchestration Module
 *
 * This module provides the state machine orchestration for the BA Work Estimation System.
 * It wires together all agent nodes using LangGraph's StateGraph.
 *
 * Graph Flow:
 * ┌───────────┐    ┌───────────┐    ┌───────────┐
 * │ Validation│───▶│ Extraction│───▶│Decompositi│
 * │   Node    │    │   Node    │    │   Node    │
 * └───────────┘    └───────────┘    └─────┬─────┘
 *       │                                 │
 *       │ (invalid)                       ▼
 *       ▼                          ┌───────────┐
 *      END                         │ Estimation │
 *                                   │   Node    │
 *                                   └─────┬─────┘
 *                                         │
 *                                         ▼
 *                                   ┌───────────┐
 *                                   │ Reporting │
 *                                   │   Node    │
 *                                   └─────┬─────┘
 *                                         │
 *                                         ▼
 *                                        END
 *
 * @module agents/graph
 */

// State management
export {
  EstimationStateAnnotation,
  createGraphInitialState,
  NodeNames,
  EdgeNames,
  type GraphState,
  type GraphStateUpdate,
  type NodeName,
  type EdgeName,
} from "./state";

// Conditional edges
export {
  shouldContinueAfterValidation,
  shouldContinueAfterExtraction,
  shouldContinueAfterDecomposition,
  shouldContinueAfterEstimation,
  hasCriticalErrors,
  getErrorSeverity,
} from "./edges";

// Graph creation and execution
export {
  createEstimationGraph,
  executeEstimationGraph,
  streamEstimationGraph,
  type EstimationGraph,
  type GraphExecutionOptions,
} from "./estimation.graph";
