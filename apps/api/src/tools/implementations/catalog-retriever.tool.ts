import { Injectable, Logger } from '@nestjs/common';
import { CatalogsService } from '../../catalogs/catalogs.service';
import { RagService } from '../../rag/rag.service';
import {
  CatalogSearchResult,
  AtomicWorkResult,
  CoefficientResult,
  BaProcessResult,
} from '../interfaces';
import { AtomicWork, AtomicWorkCategory } from '../../catalogs/interfaces/atomic-work.interface';
import { Coefficient } from '../../catalogs/interfaces/coefficient.interface';
import { BaProcess } from '../../catalogs/interfaces/ba-process.interface';

/**
 * Options for catalog retrieval
 */
export interface RetrievalOptions {
  /** Maximum number of results to return per category (default: 5) */
  limit?: number;

  /** Minimum similarity score threshold (0-1) */
  scoreThreshold?: number;

  /** Whether to use RAG for semantic search (default: true) */
  useRag?: boolean;
}

/**
 * CatalogRetrieverTool
 *
 * Tool for querying the RAG system to retrieve relevant catalog entries.
 * Supports searching atomic works, coefficients, and BA processes.
 *
 * @example
 * const tool = new CatalogRetrieverTool(catalogsService, ragService);
 * const result = await tool.searchAll('user story documentation');
 * console.log(result.atomicWorks);
 */
@Injectable()
export class CatalogRetrieverTool {
  private readonly logger = new Logger(CatalogRetrieverTool.name);

  readonly name = 'catalog_retriever';
  readonly description =
    'Query the RAG system to retrieve relevant catalog entries including atomic works, coefficients, and BA processes.';

  constructor(
    private readonly catalogsService: CatalogsService,
    private readonly ragService: RagService,
  ) {}

  /**
   * Retrieve atomic works relevant to the given context
   * @param context - Search context describing the work needed
   * @param limit - Maximum number of results (default: 5)
   * @returns Array of matching atomic works
   */
  async retrieveAtomicWorks(context: string, limit: number = 5): Promise<AtomicWorkResult[]> {
    this.logger.debug(`Retrieving atomic works for context: ${context.substring(0, 100)}...`);

    try {
      // Use RAG search for semantic matching
      const searchResult = await this.catalogsService.searchAtomicWorksRag(context, limit);

      // Transform results to AtomicWorkResult format
      const atomicWorks: AtomicWorkResult[] = searchResult.documents.map((doc) => {
        // Get full atomic work data from catalog
        const fullWork = this.catalogsService.getAtomicWorkById(doc.metadata.id as string);

        return {
          id: doc.metadata.id as string,
          name: doc.metadata.name as string,
          description: fullWork?.description || doc.content,
          baseHours: fullWork?.baseHours || 0,
          category: fullWork?.category || AtomicWorkCategory.DOCUMENTATION,
          score: doc.score,
        };
      });

      this.logger.debug(`Found ${atomicWorks.length} atomic works`);
      return atomicWorks;
    } catch (error) {
      this.logger.error(`Failed to retrieve atomic works: ${error}`);
      throw new Error(`Failed to retrieve atomic works: ${error}`);
    }
  }

  /**
   * Retrieve coefficients relevant to the given context
   * @param context - Search context describing project complexity factors
   * @param limit - Maximum number of results (default: 5)
   * @returns Array of matching coefficients
   */
  async retrieveCoefficients(context: string, limit: number = 5): Promise<CoefficientResult[]> {
    this.logger.debug(`Retrieving coefficients for context: ${context.substring(0, 100)}...`);

    try {
      // Use RAG search for semantic matching
      const searchResult = await this.catalogsService.searchCoefficientsRag(context, limit);

      // Transform results to CoefficientResult format
      const coefficients: CoefficientResult[] = searchResult.documents.map((doc) => {
        // Get full coefficient data from catalog
        const fullCoeff = this.catalogsService.getCoefficientById(doc.metadata.id as string);

        return {
          id: doc.metadata.id as string,
          name: doc.metadata.name as string,
          description: fullCoeff?.description || doc.content,
          multiplier: fullCoeff?.multiplier || 1.0,
          triggers: fullCoeff?.triggers || [],
          score: doc.score,
        };
      });

      this.logger.debug(`Found ${coefficients.length} coefficients`);
      return coefficients;
    } catch (error) {
      this.logger.error(`Failed to retrieve coefficients: ${error}`);
      throw new Error(`Failed to retrieve coefficients: ${error}`);
    }
  }

  /**
   * Get a specific BA process by ID
   * @param processId - The BA process ID
   * @returns The BA process or undefined if not found
   */
  async getBaProcess(processId: string): Promise<BaProcessResult | undefined> {
    this.logger.debug(`Getting BA process: ${processId}`);

    const process = this.catalogsService.getBaProcessById(processId);

    if (!process) {
      this.logger.warn(`BA process not found: ${processId}`);
      return undefined;
    }

    return {
      id: process.id,
      name: process.name,
      description: process.description,
      category: process.category,
    };
  }

  /**
   * Retrieve BA processes relevant to the given context
   * @param context - Search context describing the process area
   * @param limit - Maximum number of results (default: 5)
   * @returns Array of matching BA processes
   */
  async retrieveBaProcesses(context: string, limit: number = 5): Promise<BaProcessResult[]> {
    this.logger.debug(`Retrieving BA processes for context: ${context.substring(0, 100)}...`);

    try {
      // Use RAG search for semantic matching
      const searchResult = await this.ragService.similaritySearch(context, {
        k: limit,
        filter: { docType: 'ba_process' },
      });

      // Transform results to BaProcessResult format
      const baProcesses: BaProcessResult[] = searchResult.documents.map((doc) => {
        // Get full BA process data from catalog
        const fullProcess = this.catalogsService.getBaProcessById(doc.metadata.id as string);

        return {
          id: doc.metadata.id as string,
          name: doc.metadata.name as string,
          description: fullProcess?.description || doc.content,
          category: fullProcess?.category || '',
          score: doc.score,
        };
      });

      this.logger.debug(`Found ${baProcesses.length} BA processes`);
      return baProcesses;
    } catch (error) {
      this.logger.error(`Failed to retrieve BA processes: ${error}`);
      throw new Error(`Failed to retrieve BA processes: ${error}`);
    }
  }

  /**
   * Search all catalog types for the given context
   * @param context - Search context
   * @param options - Retrieval options
   * @returns Combined search result with all catalog types
   */
  async searchAll(
    context: string,
    options: RetrievalOptions = {},
  ): Promise<CatalogSearchResult> {
    const { limit = 5, useRag = true } = options;

    this.logger.debug(`Searching all catalogs for context: ${context.substring(0, 100)}...`);

    try {
      let atomicWorks: AtomicWorkResult[];
      let coefficients: CoefficientResult[];
      let baProcesses: BaProcessResult[];

      if (useRag) {
        // Use RAG for semantic search across all catalogs
        const [worksResult, coeffResult, processesResult] = await Promise.all([
          this.retrieveAtomicWorks(context, limit),
          this.retrieveCoefficients(context, limit),
          this.retrieveBaProcesses(context, limit),
        ]);

        atomicWorks = worksResult;
        coefficients = coeffResult;
        baProcesses = processesResult;
      } else {
        // Fallback to keyword-based search
        atomicWorks = this.searchAtomicWorksByKeyword(context, limit);
        coefficients = this.searchCoefficientsByKeyword(context, limit);
        baProcesses = this.getAllBaProcesses(limit);
      }

      this.logger.debug(
        `Search completed: ${atomicWorks.length} works, ${coefficients.length} coefficients, ${baProcesses.length} processes`,
      );

      return {
        atomicWorks,
        coefficients,
        baProcesses,
      };
    } catch (error) {
      this.logger.error(`Failed to search all catalogs: ${error}`);
      throw new Error(`Failed to search all catalogs: ${error}`);
    }
  }

  /**
   * Get all atomic works for a specific BA process
   * @param baProcessId - The BA process ID
   * @returns Array of atomic works in the process
   */
  async getAtomicWorksByBaProcess(baProcessId: string): Promise<AtomicWorkResult[]> {
    this.logger.debug(`Getting atomic works for BA process: ${baProcessId}`);

    const works = this.catalogsService.getAtomicWorksByBaProcess(baProcessId);

    return works.map((work) => this.toAtomicWorkResult(work));
  }

  /**
   * Match coefficients against a text description
   * @param text - Text to match against coefficient triggers
   * @returns Array of matched coefficients with confidence scores
   */
  async matchCoefficients(text: string): Promise<CoefficientResult[]> {
    this.logger.debug(`Matching coefficients against text: ${text.substring(0, 100)}...`);

    const appliedCoefficients = this.catalogsService.matchCoefficients(text);

    return appliedCoefficients.matches.map((match) => ({
      id: match.coefficient.id,
      name: match.coefficient.name,
      description: match.coefficient.description,
      multiplier: match.coefficient.multiplier,
      triggers: match.matchedTriggers,
      score: match.confidence,
    }));
  }

  /**
   * Get all available atomic works
   * @param limit - Maximum number of results
   * @returns Array of all atomic works
   */
  async getAllAtomicWorks(limit?: number): Promise<AtomicWorkResult[]> {
    this.logger.debug('Getting all atomic works');

    const works = this.catalogsService.getAllAtomicWorks();
    const limitedWorks = limit ? works.slice(0, limit) : works;

    return limitedWorks.map((work) => this.toAtomicWorkResult(work));
  }

  /**
   * Get all available coefficients
   * @param limit - Maximum number of results
   * @returns Array of all coefficients
   */
  async getAllCoefficients(limit?: number): Promise<CoefficientResult[]> {
    this.logger.debug('Getting all coefficients');

    const coefficients = this.catalogsService.getAllCoefficients();
    const limitedCoeffs = limit ? coefficients.slice(0, limit) : coefficients;

    return limitedCoeffs.map((coeff) => this.toCoefficientResult(coeff));
  }

  /**
   * Search atomic works by keyword (non-RAG fallback)
   */
  private searchAtomicWorksByKeyword(keyword: string, limit: number): AtomicWorkResult[] {
    const works = this.catalogsService.searchAtomicWorksByKeyword(keyword);
    return works.slice(0, limit).map((work) => this.toAtomicWorkResult(work));
  }

  /**
   * Search coefficients by keyword (non-RAG fallback)
   */
  private searchCoefficientsByKeyword(keyword: string, limit: number): CoefficientResult[] {
    const coefficients = this.catalogsService.getAllCoefficients();
    const lowerKeyword = keyword.toLowerCase();

    const filtered = coefficients.filter(
      (coeff) =>
        coeff.name.toLowerCase().includes(lowerKeyword) ||
        coeff.description.toLowerCase().includes(lowerKeyword) ||
        coeff.triggers.some((t) => t.toLowerCase().includes(lowerKeyword)),
    );

    return filtered.slice(0, limit).map((coeff) => this.toCoefficientResult(coeff));
  }

  /**
   * Get all BA processes (non-RAG fallback)
   */
  private getAllBaProcesses(limit: number): BaProcessResult[] {
    const processes = this.catalogsService.getAllBaProcesses();
    return processes.slice(0, limit).map((process) => ({
      id: process.id,
      name: process.name,
      description: process.description,
      category: process.category,
    }));
  }

  /**
   * Convert AtomicWork to AtomicWorkResult
   */
  private toAtomicWorkResult(work: AtomicWork): AtomicWorkResult {
    return {
      id: work.id,
      name: work.name,
      description: work.description,
      baseHours: work.baseHours,
      category: work.category,
    };
  }

  /**
   * Convert Coefficient to CoefficientResult
   */
  private toCoefficientResult(coeff: Coefficient): CoefficientResult {
    return {
      id: coeff.id,
      name: coeff.name,
      description: coeff.description,
      multiplier: coeff.multiplier,
      triggers: coeff.triggers,
    };
  }
}
