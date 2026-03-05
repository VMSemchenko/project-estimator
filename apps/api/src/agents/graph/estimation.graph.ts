import { StateGraph, END, START } from '@langchain/langgraph';
import { Logger } from '@nestjs/common';
import {
  EstimationStateAnnotation,
  GraphState,
  GraphStateUpdate,
  NodeNames,
  createGraphInitialState,
} from './state';
import {
  shouldContinueAfterValidation,
  shouldContinueAfterExtraction,
  shouldContinueAfterDecomposition,
  shouldContinueAfterEstimation,
} from './edges';
import {
  ValidationNode,
  ExtractionNode,
  DecompositionNode,
  EstimationNode,
  ReportingNode,
} from '../nodes';
import { AgentDependencies } from '../interfaces/agent.interface';
import { EstimationError } from '../interfaces/agent-state.interface';

/**
 * Factory function type for creating node instances
 */
type NodeFactory<T> = (dependencies: AgentDependencies) => T;

/**
 * Graph node wrapper that handles errors and state updates
 */
function wrapNodeExecution<TNode extends { execute: (state: GraphState) => Promise<GraphStateUpdate> }>(
  node: TNode,
  nodeName: string
): (state: GraphState) => Promise<GraphStateUpdate> {
  const logger = new Logger(`GraphNode:${nodeName}`);
  
  return async (state: GraphState): Promise<GraphStateUpdate> => {
    const startTime = Date.now();
    logger.log(`Starting node execution: ${nodeName}`);
    
    try {
      const result = await node.execute(state);
      
      const duration = Date.now() - startTime;
      logger.log(`Node ${nodeName} completed in ${duration}ms`);
      
      // Always update currentStep
      return {
        ...result,
        currentStep: nodeName,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(`Node ${nodeName} failed after ${duration}ms: ${errorMessage}`);
      
      // Create error entry
      const estimationError: EstimationError = {
        timestamp: new Date().toISOString(),
        node: nodeName,
        message: errorMessage,
        stack: errorStack,
      };
      
      return {
        errors: [estimationError],
        currentStep: nodeName,
        shouldStop: true,
      };
    }
  };
}

/**
 * Creates the estimation pipeline graph
 * 
 * Graph flow:
 * START → Validation → Extraction → Decomposition → Estimation → Reporting → END
 *              │
 *              └─→ END (if validation fails)
 * 
 * @param dependencies - Agent dependencies (LLM, RAG, etc.)
 * @returns Compiled StateGraph
 */
export function createEstimationGraph(dependencies: AgentDependencies) {
  const logger = new Logger('EstimationGraph');
  logger.log('Creating estimation graph...');
  
  // Create node instances
  const validationNode = new ValidationNode(dependencies);
  const extractionNode = new ExtractionNode(dependencies);
  const decompositionNode = new DecompositionNode(dependencies);
  const estimationNode = new EstimationNode(dependencies);
  const reportingNode = new ReportingNode(dependencies);
  
  // Wrap nodes with error handling
  const wrappedValidation = wrapNodeExecution(validationNode, NodeNames.VALIDATION);
  const wrappedExtraction = wrapNodeExecution(extractionNode, NodeNames.EXTRACTION);
  const wrappedDecomposition = wrapNodeExecution(decompositionNode, NodeNames.DECOMPOSITION);
  const wrappedEstimation = wrapNodeExecution(estimationNode, NodeNames.ESTIMATION);
  const wrappedReporting = wrapNodeExecution(reportingNode, NodeNames.REPORTING);
  
  // Create the state graph
  const workflow = new StateGraph(EstimationStateAnnotation)
    // Add nodes
    .addNode(NodeNames.VALIDATION, wrappedValidation)
    .addNode(NodeNames.EXTRACTION, wrappedExtraction)
    .addNode(NodeNames.DECOMPOSITION, wrappedDecomposition)
    .addNode(NodeNames.ESTIMATION, wrappedEstimation)
    .addNode(NodeNames.REPORTING, wrappedReporting)
    
    // Set entry point
    .addEdge(START, NodeNames.VALIDATION)
    
    // Add conditional edges for validation
    .addConditionalEdges(
      NodeNames.VALIDATION,
      shouldContinueAfterValidation,
      {
        [NodeNames.EXTRACTION]: NodeNames.EXTRACTION,
        [END]: END,
      }
    )
    
    // Add conditional edges for extraction
    .addConditionalEdges(
      NodeNames.EXTRACTION,
      shouldContinueAfterExtraction,
      {
        [NodeNames.DECOMPOSITION]: NodeNames.DECOMPOSITION,
        [END]: END,
      }
    )
    
    // Add conditional edges for decomposition
    .addConditionalEdges(
      NodeNames.DECOMPOSITION,
      shouldContinueAfterDecomposition,
      {
        [NodeNames.ESTIMATION]: NodeNames.ESTIMATION,
        [END]: END,
      }
    )
    
    // Add conditional edges for estimation
    .addConditionalEdges(
      NodeNames.ESTIMATION,
      shouldContinueAfterEstimation,
      {
        [NodeNames.REPORTING]: NodeNames.REPORTING,
        [END]: END,
      }
    )
    
    // Reporting always goes to END
    .addEdge(NodeNames.REPORTING, END);
  
  // Compile the graph
  const graph = workflow.compile();
  
  logger.log('Estimation graph created successfully');
  
  return graph;
}

/**
 * Type for the compiled estimation graph
 */
export type EstimationGraph = ReturnType<typeof createEstimationGraph>;

/**
 * Graph execution options
 */
export interface GraphExecutionOptions {
  /** Maximum number of steps to execute */
  maxSteps?: number;
  /** Callback for progress updates */
  onProgress?: (step: string, state: GraphState) => void;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Default execution options
 */
const DEFAULT_OPTIONS: GraphExecutionOptions = {
  maxSteps: 10,
  timeout: 300000, // 5 minutes
};

/**
 * Executes the estimation graph with the given input folder
 * 
 * @param graph - Compiled estimation graph
 * @param inputFolder - Path to input folder containing artifacts
 * @param options - Execution options
 * @returns Final graph state
 */
export async function executeEstimationGraph(
  graph: EstimationGraph,
  inputFolder: string,
  options: GraphExecutionOptions = {}
): Promise<GraphState> {
  const logger = new Logger('GraphExecution');
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  logger.log(`Starting graph execution for: ${inputFolder}`);
  
  const initialState = createGraphInitialState(inputFolder);
  
  try {
    // Execute the graph
    const result = await graph.invoke(initialState, {
      recursionLimit: opts.maxSteps,
    });
    
    logger.log('Graph execution completed successfully');
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Graph execution failed: ${errorMessage}`);
    
    // Return state with error
    return {
      ...initialState,
      errors: [
        {
          timestamp: new Date().toISOString(),
          node: 'graph',
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      ],
      shouldStop: true,
    };
  }
}

/**
 * Stream execution results from the graph
 * 
 * @param graph - Compiled estimation graph
 * @param inputFolder - Path to input folder containing artifacts
 * @param options - Execution options
 * @returns Async generator yielding state updates
 */
export async function* streamEstimationGraph(
  graph: EstimationGraph,
  inputFolder: string,
  options: GraphExecutionOptions = {}
): AsyncGenerator<{ node: string; state: GraphState }> {
  const logger = new Logger('GraphStreamExecution');
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  logger.log(`Starting graph stream execution for: ${inputFolder}`);
  
  const initialState = createGraphInitialState(inputFolder);
  
  try {
    // Stream the graph execution
    const stream = await graph.stream(initialState, {
      recursionLimit: opts.maxSteps,
    });
    
    for await (const update of stream) {
      // Extract node name and state from the update
      const nodeName = Object.keys(update)[0];
      const state = update[nodeName] as GraphState;
      
      logger.log(`Node completed: ${nodeName}`);
      
      // Call progress callback if provided
      if (opts.onProgress) {
        opts.onProgress(nodeName, state);
      }
      
      yield { node: nodeName, state };
    }
    
    logger.log('Graph stream execution completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Graph stream execution failed: ${errorMessage}`);
    
    yield {
      node: 'error',
      state: {
        ...initialState,
        errors: [
          {
            timestamp: new Date().toISOString(),
            node: 'graph',
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        ],
        shouldStop: true,
      },
    };
  }
}
