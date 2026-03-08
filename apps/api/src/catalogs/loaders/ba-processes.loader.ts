import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import {
  BaProcess,
  BaProcessYaml,
  BaProcessesCatalog,
  BaProcessDocument,
  BaProcessCategory,
} from "../interfaces/ba-process.interface";

/**
 * Loader for BA Processes catalog from YAML file.
 * Reads, parses, validates, and transforms BA process items.
 */
@Injectable()
export class BaProcessesLoader {
  private readonly logger = new Logger(BaProcessesLoader.name);
  private baProcesses: BaProcess[] = [];

  /**
   * Load BA processes from the YAML catalog file
   * @param catalogSet - The catalog set to load ('demo' or 'real-world')
   * @param catalogPath - Optional explicit path to the ba_processes.yaml file
   */
  async load(
    catalogSet: string = "real-world",
    catalogPath?: string,
  ): Promise<BaProcess[]> {
    const filePath =
      catalogPath ||
      path.join(
        process.cwd(),
        `apps/api/assets/catalogs/${catalogSet}/ba_processes.yaml`,
      );

    this.logger.log(`Loading BA processes from: ${filePath}`);

    try {
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const catalog: BaProcessesCatalog = yaml.parse(fileContent);

      if (!catalog || !catalog.ba_processes) {
        throw new Error("Invalid BA processes catalog structure");
      }

      this.baProcesses = catalog.ba_processes.map((item: BaProcessYaml) =>
        this.transformToBaProcess(item),
      );

      this.logger.log(`Loaded ${this.baProcesses.length} BA processes`);
      return this.baProcesses;
    } catch (error) {
      this.logger.error(`Failed to load BA processes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all loaded BA processes
   */
  getAll(): BaProcess[] {
    return this.baProcesses;
  }

  /**
   * Get BA process by ID
   * @param id - The BA process ID
   */
  getById(id: string): BaProcess | undefined {
    return this.baProcesses.find((process) => process.id === id);
  }

  /**
   * Get BA processes by category
   * @param category - The category to filter by
   */
  getByCategory(category: BaProcessCategory): BaProcess[] {
    return this.baProcesses.filter((process) => process.category === category);
  }

  /**
   * Transform all BA processes to documents for vector store indexing
   */
  toDocuments(): BaProcessDocument[] {
    return this.baProcesses.map((process) => this.toDocument(process));
  }

  /**
   * Transform a single BA process to a document for vector store indexing
   * @param process - The BA process to transform
   */
  toDocument(process: BaProcess): BaProcessDocument {
    return {
      ...process,
      searchableText: this.createSearchableText(process),
      docType: "ba_process",
    };
  }

  /**
   * Transform YAML BA process to typed BaProcess
   * @param yaml - The YAML BA process object
   */
  private transformToBaProcess(yaml: BaProcessYaml): BaProcess {
    return {
      id: yaml.id,
      name: yaml.name,
      description: yaml.description,
      category: yaml.category as BaProcessCategory,
    };
  }

  /**
   * Create searchable text for embedding
   * @param process - The BA process
   */
  private createSearchableText(process: BaProcess): string {
    const parts = [process.name, process.description, process.category];
    return parts.join(" ");
  }
}
