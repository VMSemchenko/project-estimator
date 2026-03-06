import { ValidationNode, createValidationNode } from './validation.node';
import { PromptsService } from '../../prompts/prompts.service';
import { LLMProvider } from '../../ai/interfaces/llm-provider.interface';
import { LangfuseService } from '../../ai/langfuse/langfuse.service';
import { EstimationState } from '../interfaces/agent-state.interface';
import { AgentDependencies } from '../interfaces/agent.interface';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('ValidationNode', () => {
  let node: ValidationNode;
  let promptsService: jest.Mocked<PromptsService>;
  let llmProvider: jest.Mocked<LLMProvider>;
  let langfuseService: jest.Mocked<LangfuseService>;

  const mockPromptsService = {
    compileTemplate: jest.fn().mockReturnValue('Compiled prompt template'),
    getTemplate: jest.fn().mockReturnValue('Template content'),
  } as unknown as jest.Mocked<PromptsService>;

  const mockChatModel = {
    invoke: jest.fn(),
  };

  const mockLLMProvider = {
    getChatModel: jest.fn().mockReturnValue(mockChatModel),
  } as unknown as jest.Mocked<LLMProvider>;

  const mockLangfuseService = {
    createTrace: jest.fn().mockReturnValue({
      update: jest.fn(),
  }),
  } as unknown as jest.Mocked<LangfuseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create node directly with dependencies
    const dependencies: AgentDependencies = {
      promptsService: mockPromptsService,
      llmProvider: mockLLMProvider,
      langfuseService: mockLangfuseService,
    };
    
    node = new ValidationNode(dependencies);
  });

  describe('createValidationNode', () => {
    it('should create a validation node instance', () => {
      const dependencies: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
      };

      const validationNode = createValidationNode(dependencies);

      expect(validationNode).toBeInstanceOf(ValidationNode);
      expect(validationNode.name).toBe('validation');
    });
  });

  describe('execute', () => {
    const mockState: EstimationState = {
      inputFolder: '/test/input',
      artifacts: [],
      validationStatus: 'pending',
      requirements: [],
      atomicWorks: [],
      estimates: [],
      errors: [],
      currentStep: 'init',
      shouldStop: false,
    };

    it('should validate artifacts successfully with all required documents', async () => {
      // Mock file system
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'business-vision.md',
        'stakeholder-requirements.md',
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('business-vision')) {
          return '# Business Vision\n\nThis is a comprehensive business vision document with enough content to pass validation checks.';
        }
        if (filePath.includes('stakeholder-requirements')) {
          return '# Stakeholder Requirements\n\nREQ-001: User Authentication\nREQ-002: Product Catalog';
        }
        return '';
      });
      (path.extname as jest.Mock).mockReturnValue('.md');
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
      (path.basename as jest.Mock).mockReturnValue('test.md');

      // Mock LLM response for quality check
      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          issues: [],
          recommendations: ['Consider adding more detail to success criteria'],
          canProceed: true,
        }),
      });

      const result = await node.execute(mockState);

      expect(result.validationStatus).toBe('valid');
      expect(result.shouldStop).toBe(false);
      expect(result.validationReport).toBeDefined();
      expect(result.validationReport?.canProceed).toBe(true);
      expect(result.artifacts).toHaveLength(2);
    });

    it('should fail validation when required documents are missing', async () => {
      // Mock file system with only one document
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['business-vision.md']);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '# Business Vision\n\nThis is a business vision document.'
      );
      (path.extname as jest.Mock).mockReturnValue('.md');
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      const result = await node.execute(mockState);

      expect(result.validationStatus).toBe('invalid');
      expect(result.shouldStop).toBe(true);
      expect(result.validationReport?.missingArtifacts).toContain('ShRD');
    });

    it('should handle non-existent input folder', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await node.execute(mockState);

      expect(result.shouldStop).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toContain('Input folder does not exist');
    });

    it('should identify document types correctly', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'business-vision.md',
        'stakeholder-requirements.md',
        'high-level-architecture.md',
        'non-functional-requirements.md',
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('business-vision')) {
          return '# Business Vision\n\nContent about business vision.';
        }
        if (filePath.includes('stakeholder-requirements')) {
          return '# Stakeholder Requirements\n\nStakeholder requirements content.';
        }
        if (filePath.includes('architecture')) {
          return '# High Level Architecture\n\nArchitecture content.';
        }
        if (filePath.includes('non-functional')) {
          return '# Non-Functional Requirements\n\nNFR content.';
        }
        return '';
      });
      (path.extname as jest.Mock).mockReturnValue('.md');
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          issues: [],
          recommendations: [],
          canProceed: true,
        }),
      });

      const result = await node.execute(mockState);

      expect(result.artifacts).toBeDefined();
      const artifactTypes = result.artifacts?.map((a) => a.type);
      expect(artifactTypes).toContain('BV');
      expect(artifactTypes).toContain('ShRD');
    });

    it('should handle quality issues that allow proceeding', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'business-vision.md',
        'stakeholder-requirements.md',
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '# Document\n\nThis is a document with sufficient content for validation.'
      );
      (path.extname as jest.Mock).mockReturnValue('.md');
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          issues: ['Document could be more detailed'],
          recommendations: ['Add more specific requirements'],
          canProceed: true,
        }),
      });

      const result = await node.execute(mockState);

      expect(result.validationStatus).toBe('valid');
      expect(result.validationReport?.qualityIssues).toHaveLength(1);
      expect(result.shouldStop).toBe(false);
    });

    it('should handle quality issues that prevent proceeding', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'business-vision.md',
        'stakeholder-requirements.md',
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '# Document\n\nThis is a document with sufficient content for validation.'
      );
      (path.extname as jest.Mock).mockReturnValue('.md');
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          issues: ['Critical: Document is missing essential sections'],
          recommendations: ['Add missing sections'],
          canProceed: false,
        }),
      });

      const result = await node.execute(mockState);

      expect(result.validationStatus).toBe('invalid');
      expect(result.shouldStop).toBe(true);
    });

    it('should handle unsupported file types gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'business-vision.md',
        'stakeholder-requirements.md',
        'image.png',
        'data.xlsx',
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '# Document\n\nContent for validation.'
      );
      (path.extname as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('.md')) return '.md';
        if (filePath.endsWith('.png')) return '.png';
        if (filePath.endsWith('.xlsx')) return '.xlsx';
        return '';
      });
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          issues: [],
          recommendations: [],
          canProceed: true,
        }),
      });

      const result = await node.execute(mockState);

      // Should only process .md files
      expect(result.artifacts).toHaveLength(2);
    });

    it('should fallback to basic validation when LLM fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'business-vision.md',
        'stakeholder-requirements.md',
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '# Document\n\nThis is a document with sufficient content for validation.'
      );
      (path.extname as jest.Mock).mockReturnValue('.md');
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      mockChatModel.invoke.mockRejectedValue(new Error('LLM unavailable'));

      const result = await node.execute(mockState);

      // Should still complete with basic validation
      expect(result.validationStatus).toBe('valid');
      expect(result.validationReport).toBeDefined();
    });

    it('should detect short documents as quality issues', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'business-vision.md',
        'stakeholder-requirements.md',
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue('Short'); // Very short content
      (path.extname as jest.Mock).mockReturnValue('.md');
      (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

      mockChatModel.invoke.mockRejectedValue(new Error('LLM unavailable'));

      const result = await node.execute(mockState);

      // Basic validation should detect short documents
      expect(result.validationReport?.qualityIssues).toBeDefined();
      expect(result.validationReport?.qualityIssues?.length).toBeGreaterThan(0);
    });
  });

  describe('node properties', () => {
    it('should have correct name', () => {
      expect(node.name).toBe('validation');
    });
  });
});
