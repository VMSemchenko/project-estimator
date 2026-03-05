import { Annotation } from '@langchain/langgraph';
import {
  EstimationState,
  Artifact,
  ValidationStatus,
  ValidationReport,
  AtomicWorkMapping,
  Estimate,
  EstimationReport,
  EstimationError,
} from '../interfaces/agent-state.interface';
import { NormalizedRequirement } from '../../prompts/interfaces/prompt-context.interface';

/**
 * State channels for the LangGraph estimation pipeline
 * Uses LangGraph's Annotation.Root pattern for defining state with reducers
 * 
 * Each channel specifies:
 * - default: Factory function to create initial value
 * - reducer: Function to merge incoming value with existing state
 * 
 * Reducer patterns:
 * - Replace reducer: (_, y) => y - replaces entire value
 * - Append reducer: (left, right) => [...left, ...right] - appends arrays
 */
export const EstimationStateAnnotation = Annotation.Root({
  // === Input ===
  /** Input folder path containing artifacts */
  inputFolder: Annotation<string>({
    default: () => '',
    reducer: (_, y) => y ?? '',
  }),

  /** Discovered and loaded artifacts - replace on update */
  artifacts: Annotation<Artifact[]>({
    default: () => [],
    reducer: (_, y) => y ?? [],
  }),

  // === Validation Stage ===
  /** Current validation status */
  validationStatus: Annotation<ValidationStatus>({
    default: () => 'pending',
    reducer: (_, y) => y ?? 'pending',
  }),

  /** Detailed validation report */
  validationReport: Annotation<ValidationReport | undefined>({
    default: () => undefined,
    reducer: (_, y) => y,
  }),

  // === Extraction Stage ===
  /** Extracted and normalized requirements - replace on update */
  requirements: Annotation<NormalizedRequirement[]>({
    default: () => [],
    reducer: (_, y) => y ?? [],
  }),

  // === Decomposition Stage ===
  /** Mappings of requirements to atomic works - replace on update */
  atomicWorks: Annotation<AtomicWorkMapping[]>({
    default: () => [],
    reducer: (_, y) => y ?? [],
  }),

  // === Estimation Stage ===
  /** PERT estimates for each atomic work - replace on update */
  estimates: Annotation<Estimate[]>({
    default: () => [],
    reducer: (_, y) => y ?? [],
  }),

  // === Reporting Stage ===
  /** Final estimation report */
  report: Annotation<EstimationReport | undefined>({
    default: () => undefined,
    reducer: (_, y) => y,
  }),

  // === Error Handling ===
  /** Accumulated errors - append new errors to existing */
  errors: Annotation<EstimationError[]>({
    default: () => [],
    reducer: (left, right) => [...(left ?? []), ...(right ?? [])],
  }),

  // === Pipeline Control ===
  /** Current step name */
  currentStep: Annotation<string>({
    default: () => 'init',
    reducer: (_, y) => y ?? 'init',
  }),

  /** Whether the pipeline should stop */
  shouldStop: Annotation<boolean>({
    default: () => false,
    reducer: (_, y) => y ?? false,
  }),
});

/**
 * Type for the graph state (input state type)
 */
export type GraphState = typeof EstimationStateAnnotation.State;

/**
 * Type for graph state updates (output state type)
 */
export type GraphStateUpdate = typeof EstimationStateAnnotation.Update;

/**
 * Create initial state for the graph
 * @param inputFolder - Path to the input folder containing artifacts
 * @returns Initial state object
 */
export function createGraphInitialState(inputFolder: string): GraphState {
  return {
    inputFolder,
    artifacts: [],
    validationStatus: 'pending',
    validationReport: undefined,
    requirements: [],
    atomicWorks: [],
    estimates: [],
    report: undefined,
    errors: [],
    currentStep: 'init',
    shouldStop: false,
  };
}

/**
 * Node names in the estimation pipeline
 */
export const NodeNames = {
  VALIDATION: 'validation',
  EXTRACTION: 'extraction',
  DECOMPOSITION: 'decomposition',
  ESTIMATION: 'estimation',
  REPORTING: 'reporting',
} as const;

export type NodeName = (typeof NodeNames)[keyof typeof NodeNames];

/**
 * Edge names for conditional routing
 */
export const EdgeNames = {
  CONTINUE: 'continue',
  END: 'end',
  ERROR: 'error',
} as const;

export type EdgeName = (typeof EdgeNames)[keyof typeof EdgeNames];
