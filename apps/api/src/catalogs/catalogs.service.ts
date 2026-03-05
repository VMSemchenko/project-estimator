import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { AtomicWorksLoader } from './loaders/atomic-works.loader';
import { BaProcessesLoader } from './loaders/ba-processes.loader';
import { CoefficientsLoader } from './loaders/coefficients.loader';
import {
  AtomicWork,
  AtomicWorkDocument,
  AtomicWorkCategory,
} from './interfaces/atomic-work.interface';
import {
  BaProcess,
  BaProcessDocument,
} from './interfaces/ba-process.interface';
import {
  Coefficient,
  CoefficientDocument,
  AppliedCoefficients,
} from './interfaces/coefficient.interface';

/**
 * Catalogs Service
 * Manages loading, caching, and indexing of reference catalogs
 * for the BA Work Estimation system.
 */
@Injectable()
export class CatalogsService implements OnModuleInit {
  private readonly logger = new Logger(CatalogsService.name);
  private isIndexed = false;

  constructor(
    private readonly atomicWorksLoader: AtomicWorksLoader,
    private readonly baProcessesLoader: BaProcessesLoader,
    private readonly coefficientsLoader: CoefficientsLoader,
    private readonly ragService: RagService,
  ) {}

  /**
   * Initialize catalogs on module initialization
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing catalogs...');
    
    try {
      // Load all catalogs from YAML files
      await this.loadAllCatalogs();
      
      // Index catalogs into vector store
      await this.indexCatalogs();
      
      this.logger.log('Catalogs initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize catalogs: ${error.message}`);
      // Don't throw - allow app to start even if catalogs fail
    }
  }

  /**
   * Load all catalogs from YAML files
   */
  async loadAllCatalogs(): Promise<void> {
    this.logger.log('Loading catalogs from YAML files...');
    
    await Promise.all([
      this.atomicWorksLoader.load(),
      this.baProcessesLoader.load(),
      this.coefficientsLoader.load(),
    ]);
    
    this.logger.log('All catalogs loaded successfully');
  }

  /**
   * Index all catalogs into the vector store for RAG
   */
  async indexCatalogs(): Promise<void> {
    if (this.isIndexed) {
      this.logger.warn('Catalogs already indexed, skipping...');
      return;
    }

    this.logger.log('Indexing catalogs into vector store...');

    try {
      // Index atomic works
      const atomicWorkDocs = this.atomicWorksLoader.toDocuments();
      await this.indexDocuments(atomicWorkDocs, 'atomic_work');
      this.logger.log(`Indexed ${atomicWorkDocs.length} atomic works`);

      // Index BA processes
      const baProcessDocs = this.baProcessesLoader.toDocuments();
      await this.indexDocuments(baProcessDocs, 'ba_process');
      this.logger.log(`Indexed ${baProcessDocs.length} BA processes`);

      // Index coefficients
      const coefficientDocs = this.coefficientsLoader.toDocuments();
      await this.indexDocuments(coefficientDocs, 'coefficient');
      this.logger.log(`Indexed ${coefficientDocs.length} coefficients`);

      this.isIndexed = true;
      this.logger.log('All catalogs indexed successfully');
    } catch (error) {
      this.logger.error(`Failed to index catalogs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Index documents into the vector store
   * @param documents - Documents to index
   * @param docType - Document type for metadata filtering
   */
  private async indexDocuments(
    documents: (AtomicWorkDocument | BaProcessDocument | CoefficientDocument)[],
    docType: string,
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    const texts = documents.map((doc) => doc.searchableText);
    const metadatas = documents.map((doc) => ({
      docType,
      id: doc.id,
      name: doc.name,
    }));
    const ids = documents.map((doc) => `${docType}_${doc.id}`);

    await this.ragService.addDocuments(texts, metadatas, ids);
  }

  // ===========================================
  // Atomic Works Methods
  // ===========================================

  /**
   * Get all atomic works
   */
  getAllAtomicWorks(): AtomicWork[] {
    return this.atomicWorksLoader.getAll();
  }

  /**
   * Get atomic work by ID
   * @param id - The atomic work ID
   */
  getAtomicWorkById(id: string): AtomicWork | undefined {
    return this.atomicWorksLoader.getById(id);
  }

  /**
   * Get atomic works by category
   * @param category - The category to filter by
   */
  getAtomicWorksByCategory(category: AtomicWorkCategory): AtomicWork[] {
    return this.atomicWorksLoader.getByCategory(category);
  }

  /**
   * Get atomic works by BA process
   * @param baProcess - The BA process ID
   */
  getAtomicWorksByBaProcess(baProcess: string): AtomicWork[] {
    return this.atomicWorksLoader.getByBaProcess(baProcess);
  }

  /**
   * Search atomic works by keyword
   * @param keyword - Keyword to search for
   */
  searchAtomicWorksByKeyword(keyword: string): AtomicWork[] {
    return this.atomicWorksLoader.searchByKeyword(keyword);
  }

  // ===========================================
  // BA Processes Methods
  // ===========================================

  /**
   * Get all BA processes
   */
  getAllBaProcesses(): BaProcess[] {
    return this.baProcessesLoader.getAll();
  }

  /**
   * Get BA process by ID
   * @param id - The BA process ID
   */
  getBaProcessById(id: string): BaProcess | undefined {
    return this.baProcessesLoader.getById(id);
  }

  // ===========================================
  // Coefficients Methods
  // ===========================================

  /**
   * Get all coefficients
   */
  getAllCoefficients(): Coefficient[] {
    return this.coefficientsLoader.getAll();
  }

  /**
   * Get coefficient by ID
   * @param id - The coefficient ID
   */
  getCoefficientById(id: string): Coefficient | undefined {
    return this.coefficientsLoader.getById(id);
  }

  /**
   * Match coefficients against a text description
   * @param text - Text to match against coefficient triggers
   * @returns Applied coefficients with combined multiplier
   */
  matchCoefficients(text: string): AppliedCoefficients {
    return this.coefficientsLoader.matchCoefficients(text);
  }

  // ===========================================
  // RAG Search Methods
  // ===========================================

  /**
   * Search catalogs using RAG similarity search
   * @param query - Search query
   * @param docType - Optional document type filter
   * @param k - Number of results to return
   */
  async searchCatalogs(
    query: string,
    docType?: 'atomic_work' | 'ba_process' | 'coefficient',
    k: number = 5,
  ) {
    const filter = docType ? { docType } : undefined;
    return this.ragService.similaritySearch(query, {
      k,
      filter,
    });
  }

  /**
   * Search for atomic works using RAG
   * @param query - Search query describing the work needed
   * @param k - Number of results to return
   */
  async searchAtomicWorksRag(query: string, k: number = 5) {
    return this.searchCatalogs(query, 'atomic_work', k);
  }

  /**
   * Search for coefficients using RAG
   * @param query - Search query describing project complexity factors
   * @param k - Number of results to return
   */
  async searchCoefficientsRag(query: string, k: number = 5) {
    return this.searchCatalogs(query, 'coefficient', k);
  }

  /**
   * Check if catalogs are indexed
   */
  isCatalogsIndexed(): boolean {
    return this.isIndexed;
  }

  /**
   * Force re-indexing of catalogs
   */
  async reindexCatalogs(): Promise<void> {
    this.isIndexed = false;
    await this.indexCatalogs();
  }
}
