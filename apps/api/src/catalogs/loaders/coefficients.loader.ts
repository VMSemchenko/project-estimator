import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import {
  Coefficient,
  CoefficientYaml,
  CoefficientsCatalog,
  CoefficientDocument,
  CoefficientMatch,
  AppliedCoefficients,
} from "../interfaces/coefficient.interface";

/**
 * Loader for Coefficients catalog from YAML file.
 * Reads, parses, validates, and transforms coefficient items.
 * Also provides matching functionality for applying coefficients.
 */
@Injectable()
export class CoefficientsLoader {
  private readonly logger = new Logger(CoefficientsLoader.name);
  private coefficients: Coefficient[] = [];

  /**
   * Load coefficients from the YAML catalog file
   * @param catalogSet - The catalog set to load ('demo' or 'real-world')
   * @param catalogPath - Optional explicit path to the coefficients.yaml file
   */
  async load(
    catalogSet: string = "real-world",
    catalogPath?: string,
  ): Promise<Coefficient[]> {
    const filePath =
      catalogPath ||
      path.join(
        process.cwd(),
        `apps/api/assets/catalogs/${catalogSet}/coefficients.yaml`,
      );

    this.logger.log(`Loading coefficients from: ${filePath}`);

    try {
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const catalog: CoefficientsCatalog = yaml.parse(fileContent);

      if (!catalog || !catalog.coefficients) {
        throw new Error("Invalid coefficients catalog structure");
      }

      this.coefficients = catalog.coefficients.map((item: CoefficientYaml) =>
        this.transformToCoefficient(item),
      );

      this.logger.log(`Loaded ${this.coefficients.length} coefficients`);
      return this.coefficients;
    } catch (error) {
      this.logger.error(`Failed to load coefficients: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all loaded coefficients
   */
  getAll(): Coefficient[] {
    return this.coefficients;
  }

  /**
   * Get coefficient by ID
   * @param id - The coefficient ID
   */
  getById(id: string): Coefficient | undefined {
    return this.coefficients.find((coeff) => coeff.id === id);
  }

  /**
   * Match coefficients against a text description
   * @param text - Text to match against coefficient triggers
   * @returns Applied coefficients with combined multiplier
   */
  matchCoefficients(text: string): AppliedCoefficients {
    const lowerText = text.toLowerCase();
    const matches: CoefficientMatch[] = [];

    for (const coefficient of this.coefficients) {
      const matchedTriggers = coefficient.triggers.filter((trigger) =>
        lowerText.includes(trigger.toLowerCase()),
      );

      if (matchedTriggers.length > 0) {
        // Calculate confidence based on number of matched triggers
        const confidence = Math.min(
          matchedTriggers.length / coefficient.triggers.length,
          1.0,
        );

        matches.push({
          coefficient,
          matchedTriggers,
          confidence,
        });
      }
    }

    // Calculate combined multiplier (product of all multipliers)
    const combinedMultiplier =
      matches.length > 0
        ? matches.reduce(
            (product, match) => product * match.coefficient.multiplier,
            1.0,
          )
        : 1.0;

    return {
      matches,
      combinedMultiplier,
      hasCoefficients: matches.length > 0,
    };
  }

  /**
   * Transform all coefficients to documents for vector store indexing
   */
  toDocuments(): CoefficientDocument[] {
    return this.coefficients.map((coeff) => this.toDocument(coeff));
  }

  /**
   * Transform a single coefficient to a document for vector store indexing
   * @param coefficient - The coefficient to transform
   */
  toDocument(coefficient: Coefficient): CoefficientDocument {
    return {
      ...coefficient,
      searchableText: this.createSearchableText(coefficient),
      docType: "coefficient",
    };
  }

  /**
   * Transform YAML coefficient to typed Coefficient
   * @param yaml - The YAML coefficient object
   */
  private transformToCoefficient(yaml: CoefficientYaml): Coefficient {
    return {
      id: yaml.id,
      name: yaml.name,
      description: yaml.description,
      multiplier: yaml.multiplier,
      triggers: yaml.triggers || [],
    };
  }

  /**
   * Create searchable text for embedding
   * @param coefficient - The coefficient
   */
  private createSearchableText(coefficient: Coefficient): string {
    const parts = [
      coefficient.name,
      coefficient.description,
      ...coefficient.triggers,
    ];
    return parts.join(" ");
  }
}
