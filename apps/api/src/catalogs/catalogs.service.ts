import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RagService } from "../rag/rag.service";
import { AtomicWorksLoader } from "./loaders/atomic-works.loader";
import { BaProcessesLoader } from "./loaders/ba-processes.loader";
import { CoefficientsLoader } from "./loaders/coefficients.loader";
import {
  AtomicWork,
  AtomicWorkDocument,
  AtomicWorkCategory,
} from "./interfaces/atomic-work.interface";
import {
  BaProcess,
  BaProcessDocument,
} from "./interfaces/ba-process.interface";
import {
  Coefficient,
  CoefficientDocument,
  AppliedCoefficients,
} from "./interfaces/coefficient.interface";

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

  private currentCatalogSet: string = "real-world";

  /**
   * Available catalog sets
   */
  private readonly availableCatalogSets = ["demo", "real-world"];

  /**
   * Initialize catalogs on module initialization
   * Indexes ALL catalog sets at once for instant switching
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("Initializing catalogs...");

    try {
      // Check if catalogs are already indexed
      const existingCount = await this.ragService.getDocumentCount();
      if (existingCount > 0) {
        this.logger.log(
          `Vector store already contains ${existingCount} documents, skipping indexing`,
        );
        this.isIndexed = true;
        // Load default catalog set for direct access methods
        await this.loadAllCatalogs(this.currentCatalogSet);
        this.logger.log("Catalogs initialized successfully");
        return;
      }

      // Index ALL catalog sets at once
      this.logger.log("Indexing all catalog sets...");
      for (const catalogSet of this.availableCatalogSets) {
        await this.loadAndIndexCatalogSet(catalogSet);
      }
      this.isIndexed = true;

      // Load default catalog set for direct access methods
      await this.loadAllCatalogs(this.currentCatalogSet);

      this.logger.log("All catalogs initialized successfully");
    } catch (error) {
      this.logger.error(`Failed to initialize catalogs: ${error.message}`);
      // Don't throw - allow app to start even if catalogs fail
    }
  }

  /**
   * Load and index a single catalog set
   * @param catalogSet - The catalog set to load and index
   */
  private async loadAndIndexCatalogSet(catalogSet: string): Promise<void> {
    this.logger.log(`Loading and indexing catalog set: ${catalogSet}`);

    // Load catalogs from YAML
    await Promise.all([
      this.atomicWorksLoader.load(catalogSet),
      this.baProcessesLoader.load(catalogSet),
      this.coefficientsLoader.load(catalogSet),
    ]);

    // Index atomic works with catalogSet metadata
    const atomicWorkDocs = this.atomicWorksLoader.toDocuments();
    await this.indexDocuments(atomicWorkDocs, "atomic_work", catalogSet);
    this.logger.log(
      `Indexed ${atomicWorkDocs.length} atomic works for ${catalogSet}`,
    );

    // Index BA processes with catalogSet metadata
    const baProcessDocs = this.baProcessesLoader.toDocuments();
    await this.indexDocuments(baProcessDocs, "ba_process", catalogSet);
    this.logger.log(
      `Indexed ${baProcessDocs.length} BA processes for ${catalogSet}`,
    );

    // Index coefficients with catalogSet metadata
    const coefficientDocs = this.coefficientsLoader.toDocuments();
    await this.indexDocuments(coefficientDocs, "coefficient", catalogSet);
    this.logger.log(
      `Indexed ${coefficientDocs.length} coefficients for ${catalogSet}`,
    );
  }

  /**
   * Get the current catalog set
   */
  getCurrentCatalogSet(): string {
    return this.currentCatalogSet;
  }

  /**
   * Switch to a different catalog set instantly
   * No re-indexing required - all catalogs are already indexed
   * @param catalogSet - The catalog set to use ('demo' or 'real-world')
   */
  async switchCatalogSet(catalogSet: string): Promise<void> {
    if (catalogSet === this.currentCatalogSet) {
      this.logger.log(`Already using catalog set: ${catalogSet}`);
      return;
    }

    this.logger.log(
      `Switching catalog set from ${this.currentCatalogSet} to ${catalogSet}`,
    );

    // Just update the current catalog set - no re-indexing needed!
    // All catalogs are already indexed with catalogSet metadata
    this.currentCatalogSet = catalogSet;

    // Load the catalog data for direct access (non-RAG methods)
    await this.loadAllCatalogs(catalogSet);

    this.logger.log(
      `Instantly switched to catalog set: ${catalogSet} (no re-indexing required)`,
    );
  }

  /**
   * Load all catalogs from YAML files
   * @param catalogSet - The catalog set to load ('demo' or 'real-world')
   */
  async loadAllCatalogs(catalogSet: string = "real-world"): Promise<void> {
    this.logger.log(`Loading ${catalogSet} catalogs from YAML files...`);

    await Promise.all([
      this.atomicWorksLoader.load(catalogSet),
      this.baProcessesLoader.load(catalogSet),
      this.coefficientsLoader.load(catalogSet),
    ]);

    this.currentCatalogSet = catalogSet;
    this.logger.log("All catalogs loaded successfully");
  }

  /**
   * Index all catalogs into the vector store for RAG
   * @deprecated Use onModuleInit which indexes all catalog sets
   */
  async indexCatalogs(): Promise<void> {
    if (this.isIndexed) {
      this.logger.warn("Catalogs already indexed, skipping...");
      return;
    }

    this.logger.log("Indexing catalogs into vector store...");

    try {
      // Check if catalogs are already indexed by counting existing documents
      const existingCount = await this.ragService.getDocumentCount();
      if (existingCount > 0) {
        this.logger.log(
          `Vector store already contains ${existingCount} documents, skipping indexing`,
        );
        this.isIndexed = true;
        return;
      }

      // Index current catalog set with catalogSet metadata
      const atomicWorkDocs = this.atomicWorksLoader.toDocuments();
      await this.indexDocuments(
        atomicWorkDocs,
        "atomic_work",
        this.currentCatalogSet,
      );
      this.logger.log(`Indexed ${atomicWorkDocs.length} atomic works`);

      const baProcessDocs = this.baProcessesLoader.toDocuments();
      await this.indexDocuments(
        baProcessDocs,
        "ba_process",
        this.currentCatalogSet,
      );
      this.logger.log(`Indexed ${baProcessDocs.length} BA processes`);

      const coefficientDocs = this.coefficientsLoader.toDocuments();
      await this.indexDocuments(
        coefficientDocs,
        "coefficient",
        this.currentCatalogSet,
      );
      this.logger.log(`Indexed ${coefficientDocs.length} coefficients`);

      this.isIndexed = true;
      this.logger.log("All catalogs indexed successfully");
    } catch (error) {
      this.logger.error(`Failed to index catalogs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Index documents into the vector store
   * @param documents - Documents to index
   * @param docType - Document type for metadata filtering
   * @param catalogSet - Catalog set for multi-catalog filtering
   */
  private async indexDocuments(
    documents: (AtomicWorkDocument | BaProcessDocument | CoefficientDocument)[],
    docType: string,
    catalogSet: string,
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    const texts = documents.map((doc) => doc.searchableText);
    const metadatas = documents.map((doc) => {
      const metadata: Record<string, unknown> = {
        docType,
        catalogSet, // Add catalogSet for filtering
        id: doc.id,
        name: doc.name,
      };
      // Include baseHours for atomic works
      if ("baseHours" in doc) {
        metadata.baseHours = doc.baseHours;
      }
      // Include multiplier for coefficients
      if ("multiplier" in doc) {
        metadata.multiplier = doc.multiplier;
      }
      return metadata;
    });
    // Include catalogSet in document ID to prevent collisions
    const ids = documents.map((doc) => `${catalogSet}_${docType}_${doc.id}`);

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
   * @param catalogSet - Optional catalog set filter (defaults to current)
   */
  async searchCatalogs(
    query: string,
    docType?: "atomic_work" | "ba_process" | "coefficient",
    k: number = 5,
    catalogSet?: string,
  ) {
    const filter: Record<string, unknown> = {
      catalogSet: catalogSet || this.currentCatalogSet,
    };
    if (docType) {
      filter.docType = docType;
    }
    return this.ragService.similaritySearch(query, {
      k,
      filter,
    });
  }

  /**
   * Search for atomic works using RAG
   * @param query - Search query describing the work needed
   * @param k - Number of results to return
   * @param catalogSet - Optional catalog set filter (defaults to current)
   */
  async searchAtomicWorksRag(
    query: string,
    k: number = 5,
    catalogSet?: string,
  ) {
    return this.searchCatalogs(query, "atomic_work", k, catalogSet);
  }

  /**
   * Search for coefficients using RAG
   * @param query - Search query describing project complexity factors
   * @param k - Number of results to return
   * @param catalogSet - Optional catalog set filter (defaults to current)
   */
  async searchCoefficientsRag(
    query: string,
    k: number = 5,
    catalogSet?: string,
  ) {
    return this.searchCatalogs(query, "coefficient", k, catalogSet);
  }

  /**
   * Check if catalogs are indexed
   */
  isCatalogsIndexed(): boolean {
    return this.isIndexed;
  }

  /**
   * Force re-indexing of ALL catalogs
   * This will clear the vector store and re-index all catalog sets
   */
  async reindexCatalogs(): Promise<void> {
    this.logger.log("Force re-indexing all catalogs...");
    await this.ragService.clearCollection();
    this.isIndexed = false;

    // Re-index all catalog sets
    for (const catalogSet of this.availableCatalogSets) {
      await this.loadAndIndexCatalogSet(catalogSet);
    }
    this.isIndexed = true;

    // Reload current catalog set for direct access
    await this.loadAllCatalogs(this.currentCatalogSet);
    this.logger.log("All catalogs re-indexed successfully");
  }
}
