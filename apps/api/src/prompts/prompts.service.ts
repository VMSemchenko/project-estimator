import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  AgentType,
  PromptContext,
  PromptTemplate,
} from './interfaces/prompt-context.interface';

/**
 * Service for loading and managing prompt templates for LangGraph agents
 */
@Injectable()
export class PromptsService implements OnModuleInit {
  private readonly logger = new Logger(PromptsService.name);
  private templates: Map<AgentType, string> = new Map();
  private readonly templatesDir: string;

  constructor() {
    // Templates directory path relative to dist
    this.templatesDir = path.join(__dirname, 'templates');
  }

  /**
   * Load all templates on module initialization
   */
  async onModuleInit(): Promise<void> {
    await this.loadAllTemplates();
  }

  /**
   * Load all prompt templates from the templates directory
   */
  private async loadAllTemplates(): Promise<void> {
    const templateFiles: Record<AgentType, string> = {
      [AgentType.VALIDATION]: 'validation-agent.md',
      [AgentType.EXTRACTION]: 'extraction-agent.md',
      [AgentType.DECOMPOSITION]: 'decomposition-agent.md',
      [AgentType.ESTIMATION]: 'estimation-agent.md',
      [AgentType.REPORTING]: 'reporting-agent.md',
    };

    for (const [agentType, filename] of Object.entries(templateFiles)) {
      try {
        const templatePath = path.join(this.templatesDir, filename);
        const content = await this.loadTemplateFile(templatePath);
        this.templates.set(agentType as AgentType, content);
        this.logger.log(`Loaded template: ${filename}`);
      } catch (error) {
        this.logger.error(`Failed to load template: ${filename}`, error);
        throw error;
      }
    }
  }

  /**
   * Load a single template file
   */
  private async loadTemplateFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Get a raw template by agent type
   * @param agentType The type of agent
   * @returns The raw template content
   */
  getTemplate(agentType: AgentType): string {
    const template = this.templates.get(agentType);
    if (!template) {
      throw new Error(`Template not found for agent type: ${agentType}`);
    }
    return template;
  }

  /**
   * Get all loaded templates
   * @returns Map of all templates
   */
  getAllTemplates(): Map<AgentType, string> {
    return new Map(this.templates);
  }

  /**
   * Compile a template with context variables
   * @param agentType The type of agent
   * @param context The context object with variables to inject
   * @returns The compiled template with variables replaced
   */
  compileTemplate(agentType: AgentType, context: PromptContext): string {
    const template = this.getTemplate(agentType);
    return this.interpolateTemplate(template, context);
  }

  /**
   * Get a compiled prompt template object
   * @param agentType The type of agent
   * @param context The context object with variables to inject
   * @returns A PromptTemplate object with compiled content
   */
  getCompiledPrompt(
    agentType: AgentType,
    context: PromptContext,
  ): PromptTemplate {
    const content = this.getTemplate(agentType);
    const compiled = this.interpolateTemplate(content, context);

    return {
      agentType,
      content,
      compiled,
    };
  }

  /**
   * Interpolate context variables into template
   * Supports {{variableName}} syntax
   * @param template The template string
   * @param context The context object with variables
   * @returns The interpolated string
   */
  private interpolateTemplate(template: string, context: PromptContext): string {
    let result = template;

    // Replace simple variable placeholders: {{variableName}}
    const variablePattern = /\{\{(\w+)\}\}/g;
    result = result.replace(variablePattern, (match, variableName) => {
      const value = context[variableName];
      if (value === undefined) {
        this.logger.warn(`Template variable not found: ${variableName}`);
        return match; // Keep original placeholder if variable not found
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    });

    return result;
  }

  /**
   * Reload templates from disk (useful for development)
   */
  async reloadTemplates(): Promise<void> {
    this.logger.log('Reloading all templates...');
    this.templates.clear();
    await this.loadAllTemplates();
  }

  /**
   * Get validation agent prompt
   */
  getValidationPrompt(context: PromptContext): string {
    return this.compileTemplate(AgentType.VALIDATION, context);
  }

  /**
   * Get extraction agent prompt
   */
  getExtractionPrompt(context: PromptContext): string {
    return this.compileTemplate(AgentType.EXTRACTION, context);
  }

  /**
   * Get decomposition agent prompt
   */
  getDecompositionPrompt(context: PromptContext): string {
    return this.compileTemplate(AgentType.DECOMPOSITION, context);
  }

  /**
   * Get estimation agent prompt
   */
  getEstimationPrompt(context: PromptContext): string {
    return this.compileTemplate(AgentType.ESTIMATION, context);
  }

  /**
   * Get reporting agent prompt
   */
  getReportingPrompt(context: PromptContext): string {
    return this.compileTemplate(AgentType.REPORTING, context);
  }

  /**
   * Create a context object with discovered files
   */
  createValidationContext(
    inputFolderPath: string,
    discoveredFiles: Array<{ name: string; path: string; content: string; type: string }>,
  ): PromptContext {
    return {
      inputFolderPath,
      discoveredFiles,
    };
  }

  /**
   * Create a context object for extraction
   */
  createExtractionContext(
    stakeholderRequirements: string,
    businessVision?: string,
  ): PromptContext {
    return {
      stakeholderRequirements,
      businessVision,
    };
  }

  /**
   * Create a context object for decomposition
   */
  createDecompositionContext(
    requirements: PromptContext['requirements'],
    atomicWorksCatalog: PromptContext['atomicWorksCatalog'],
    baProcessesCatalog: PromptContext['baProcessesCatalog'],
  ): PromptContext {
    return {
      requirements,
      atomicWorksCatalog,
      baProcessesCatalog,
    };
  }

  /**
   * Create a context object for estimation
   */
  createEstimationContext(
    decompositionResults: PromptContext['decompositionResults'],
    atomicWorksCatalog: PromptContext['atomicWorksCatalog'],
  ): PromptContext {
    return {
      decompositionResults,
      atomicWorksCatalog,
    };
  }

  /**
   * Create a context object for reporting
   */
  createReportingContext(
    validationResults: PromptContext['validationResults'],
    requirements: PromptContext['requirements'],
    decompositionResults: PromptContext['decompositionResults'],
    estimates: PromptContext['estimates'],
    inputFolderPath?: string,
  ): PromptContext {
    return {
      validationResults,
      requirements,
      decompositionResults,
      estimates,
      inputFolderPath,
      timestamp: new Date().toISOString(),
    };
  }
}
