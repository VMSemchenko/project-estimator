import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import {
  AtomicWork,
  AtomicWorkYaml,
  AtomicWorksCatalog,
  AtomicWorkDocument,
  AtomicWorkCategory,
} from "../interfaces/atomic-work.interface";

/**
 * Loader for Atomic Works catalog from YAML file.
 * Reads, parses, validates, and transforms atomic work items.
 */
@Injectable()
export class AtomicWorksLoader {
  private readonly logger = new Logger(AtomicWorksLoader.name);
  private atomicWorks: AtomicWork[] = [];

  /**
   * Load atomic works from the YAML catalog file
   * @param catalogSet - The catalog set to load ('demo' or 'real-world')
   * @param catalogPath - Optional explicit path to the atomic_works.yaml file
   */
  async load(
    catalogSet: string = "real-world",
    catalogPath?: string,
  ): Promise<AtomicWork[]> {
    const filePath =
      catalogPath ||
      path.join(
        process.cwd(),
        `apps/api/assets/catalogs/${catalogSet}/atomic_works.yaml`,
      );

    this.logger.log(`Loading atomic works from: ${filePath}`);

    try {
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const catalog: AtomicWorksCatalog = yaml.parse(fileContent);

      if (!catalog || !catalog.atomic_works) {
        throw new Error("Invalid atomic works catalog structure");
      }

      this.atomicWorks = catalog.atomic_works.map((item: AtomicWorkYaml) =>
        this.transformToAtomicWork(item),
      );

      this.logger.log(`Loaded ${this.atomicWorks.length} atomic works`);
      return this.atomicWorks;
    } catch (error) {
      this.logger.error(`Failed to load atomic works: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all loaded atomic works
   */
  getAll(): AtomicWork[] {
    return this.atomicWorks;
  }

  /**
   * Get atomic work by ID
   * @param id - The atomic work ID
   */
  getById(id: string): AtomicWork | undefined {
    return this.atomicWorks.find((work) => work.id === id);
  }

  /**
   * Get atomic works by category
   * @param category - The category to filter by
   */
  getByCategory(category: AtomicWorkCategory): AtomicWork[] {
    return this.atomicWorks.filter((work) => work.category === category);
  }

  /**
   * Get atomic works by BA process
   * @param baProcess - The BA process ID to filter by
   */
  getByBaProcess(baProcess: string): AtomicWork[] {
    return this.atomicWorks.filter((work) => work.baProcess === baProcess);
  }

  /**
   * Search atomic works by keyword
   * @param keyword - Keyword to search for
   */
  searchByKeyword(keyword: string): AtomicWork[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.atomicWorks.filter((work) =>
      work.keywords.some((k) => k.toLowerCase().includes(lowerKeyword)),
    );
  }

  /**
   * Transform all atomic works to documents for vector store indexing
   */
  toDocuments(): AtomicWorkDocument[] {
    return this.atomicWorks.map((work) => this.toDocument(work));
  }

  /**
   * Transform a single atomic work to a document for vector store indexing
   * @param work - The atomic work to transform
   */
  toDocument(work: AtomicWork): AtomicWorkDocument {
    return {
      ...work,
      searchableText: this.createSearchableText(work),
      docType: "atomic_work",
    };
  }

  /**
   * Transform YAML atomic work to typed AtomicWork
   * @param yaml - The YAML atomic work object
   */
  private transformToAtomicWork(yaml: AtomicWorkYaml): AtomicWork {
    return {
      id: yaml.id,
      name: yaml.name,
      description: yaml.description,
      baseHours: yaml.base_hours,
      category: yaml.category as AtomicWorkCategory,
      baProcess: yaml.ba_process,
      keywords: yaml.keywords || [],
    };
  }

  /**
   * Create searchable text for embedding
   * @param work - The atomic work
   */
  private createSearchableText(work: AtomicWork): string {
    const parts = [
      work.name,
      work.description,
      work.category,
      work.baProcess,
      ...work.keywords,
    ];
    return parts.join(" ");
  }
}
