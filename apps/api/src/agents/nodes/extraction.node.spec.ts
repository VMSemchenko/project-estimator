import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionNode, createExtractionNode } from './extraction.node';
import { PromptsService } from '../../prompts/prompts.service';
import { LLMProvider } from '../../ai/interfaces/llm-provider.interface';
import { LangfuseService } from '../../ai/langfuse/langfuse.service';
import { TracingService } from '../../observability/tracing.service';
import { EstimationState, StateUpdate } from '../interfaces/agent-state.interface';
import { AgentDependencies } from '../interfaces/agent.interface';
import { NormalizedRequirement } from '../../prompts/interfaces/prompt-context.interface';

describe('ExtractionNode', () => {
  let node: ExtractionNode;
  let promptsService: jest.Mocked<PromptsService>;
  let llmProvider: jest.Mocked<LLMProvider>;
  let langfuseService: jest.Mocked<LangfuseService>;

  const mockPromptsService = {
    compileTemplate: jest.fn().mockReturnValue('Compiled extraction prompt'),
    getTemplate: jest.fn().mockReturnValue('Extraction template content'),
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

  const mockTracingService = {
    startSpan: jest.fn().mockReturnValue({
      endSpan: jest.fn(),
      addEvent: jest.fn(),
    }),
  } as unknown as jest.Mocked<TracingService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionNode,
        {
          provide: PromptsService,
          useValue: mockPromptsService,
        },
        {
          provide: 'LLMProvider',
          useValue: mockLLMProvider,
        },
        {
          provide: LangfuseService,
          useValue: mockLangfuseService,
        },
        {
          provide: TracingService,
          useValue: mockTracingService,
        },
      ],
    }).compile();

    node = module.get<ExtractionNode>(ExtractionNode);
    promptsService = module.get(PromptsService);
    llmProvider = module.get('LLMProvider');
    langfuseService = module.get(LangfuseService);
  });

  describe('createExtractionNode', () => {
    it('should create an extraction node instance', () => {
      const dependencies: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
      };

      const extractionNode = createExtractionNode(dependencies);

      expect(extractionNode).toBeInstanceOf(ExtractionNode);
      expect(extractionNode.name).toBe('extraction');
    });
  });

  describe('execute', () => {
    const mockState: EstimationState = {
      inputFolder: '/test/input',
      artifacts: [
        {
          name: 'business-vision.md',
          path: '/test/input/business-vision.md',
          content: '# Business Vision\n\nE-Commerce Platform',
          type: 'BV',
        },
        {
          name: 'stakeholder-requirements.md',
          path: '/test/input/stakeholder-requirements.md',
          content: `# Stakeholder Requirements
          
## REQ-001: User Authentication
Users must be able to register, login, and manage their accounts.

### Acceptance Criteria
- Users can register with email and password
- Users can login with email/password or OAuth

### Priority: High

## REQ-002: Product Catalog
The system must display products with categories, search, and filtering.

### Priority: High`,
          type: 'ShRD',
        },
      ],
      validationStatus: 'valid',
      requirements: [],
      atomicWorks: [],
      estimates: [],
      errors: [],
      currentStep: 'validation',
      shouldStop: false,
    };

    it('should extract requirements from ShRD document', async () => {
      const mockRequirements = {
        requirements: [
          {
            title: 'User Authentication',
            description: 'Users must be able to register, login, and manage their accounts',
            originalText: 'REQ-001: User Authentication',
            type: 'functional',
            priority: 'high',
            acceptanceCriteria: [
              'Users can register with email and password',
              'Users can login with email/password or OAuth',
            ],
          },
          {
            title: 'Product Catalog',
            description: 'The system must display products with categories, search, and filtering',
            originalText: 'REQ-002: Product Catalog',
            type: 'functional',
            priority: 'high',
            acceptanceCriteria: [],
          },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify(mockRequirements),
      });

      const result = await node.execute(mockState);

      expect(result.requirements).toBeDefined();
      expect(result.requirements?.length).toBe(2);
      expect(result.requirements?.[0].id).toBe('REQ-001');
      expect(result.requirements?.[0].title).toBe('User Authentication');
      expect(result.requirements?.[1].id).toBe('REQ-002');
    });

    it('should skip extraction when validation failed', async () => {
      const invalidState: EstimationState = {
        ...mockState,
        validationStatus: 'invalid',
      };

      const result = await node.execute(invalidState);

      expect(result.requirements).toEqual([]);
      expect(mockChatModel.invoke).not.toHaveBeenCalled();
    });

    it('should throw error when ShRD document is not found', async () => {
      const stateWithoutShRD: EstimationState = {
        ...mockState,
        artifacts: [
          {
            name: 'business-vision.md',
            path: '/test/input/business-vision.md',
            content: '# Business Vision',
            type: 'BV',
          },
        ],
      };

      const result = await node.execute(stateWithoutShRD);

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0]?.message).toContain('ShRD document not found');
    });

    it('should find ShRD by filename patterns', async () => {
      const stateWithPatternNamedFile: EstimationState = {
        ...mockState,
        artifacts: [
          {
            name: 'business-vision.md',
            path: '/test/input/business-vision.md',
            content: '# Business Vision',
            type: 'BV',
          },
          {
            name: 'requirements.md',
            path: '/test/input/requirements.md',
            content: '# Requirements\n\nREQ-001: Test requirement',
            type: 'unknown',
          },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({ requirements: [] }),
      });

      const result = await node.execute(stateWithPatternNamedFile);

      // Should not throw error - found by pattern
      expect(result.errors).toBeUndefined();
    });

    it('should normalize requirement types correctly', async () => {
      const mockRequirements = {
        requirements: [
          {
            title: 'Functional Requirement',
            type: 'Functional',
            priority: 'High',
          },
          {
            title: 'Non-Functional Requirement',
            type: 'Non-Functional',
            priority: 'medium',
          },
          {
            title: 'Constraint',
            type: 'Technical Constraint',
            priority: 'low',
          },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify(mockRequirements),
      });

      const result = await node.execute(mockState);

      expect(result.requirements?.[0].type).toBe('functional');
      expect(result.requirements?.[1].type).toBe('non-functional');
      expect(result.requirements?.[2].type).toBe('constraint');
    });

    it('should normalize priorities correctly', async () => {
      const mockRequirements = {
        requirements: [
          { title: 'High Priority', priority: 'Critical' },
          { title: 'Medium Priority', priority: 'Normal' },
          { title: 'Low Priority', priority: 'Nice to have' },
          { title: 'Unknown Priority', priority: 'unknown' },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify(mockRequirements),
      });

      const result = await node.execute(mockState);

      expect(result.requirements?.[0].priority).toBe('high');
      expect(result.requirements?.[1].priority).toBe('medium');
      expect(result.requirements?.[2].priority).toBe('low');
      expect(result.requirements?.[3].priority).toBe('medium'); // Default
    });

    it('should handle LLM extraction failure', async () => {
      mockChatModel.invoke.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await node.execute(mockState);

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.shouldStop).toBe(true);
    });

    it('should handle malformed LLM response', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Invalid JSON response',
      });

      const result = await node.execute(mockState);

      // Should handle gracefully with default value
      expect(result.requirements).toBeDefined();
    });

    it('should assign sequential IDs to requirements', async () => {
      const mockRequirements = {
        requirements: [
          { title: 'First Requirement' },
          { title: 'Second Requirement' },
          { title: 'Third Requirement' },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify(mockRequirements),
      });

      const result = await node.execute(mockState);

      expect(result.requirements?.[0].id).toBe('REQ-001');
      expect(result.requirements?.[1].id).toBe('REQ-002');
      expect(result.requirements?.[2].id).toBe('REQ-003');
    });

    it('should include source document in normalized requirements', async () => {
      const mockRequirements = {
        requirements: [
          { title: 'Test Requirement' },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify(mockRequirements),
      });

      const result = await node.execute(mockState);

      expect(result.requirements?.[0].sourceDocument).toBe('stakeholder-requirements.md');
    });

    it('should handle empty requirements array', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({ requirements: [] }),
      });

      const result = await node.execute(mockState);

      expect(result.requirements).toEqual([]);
    });

    it('should handle requirements with missing fields', async () => {
      const mockRequirements = {
        requirements: [
          { }, // Empty requirement
          { title: 'Only title' },
          { description: 'Only description' },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify(mockRequirements),
      });

      const result = await node.execute(mockState);

      expect(result.requirements).toHaveLength(3);
      expect(result.requirements?.[0].title).toBe('Requirement 1'); // Generated
      expect(result.requirements?.[1].description).toBe(''); // Default
    });
  });

  describe('node properties', () => {
    it('should have correct name', () => {
      expect(node.name).toBe('extraction');
    });
  });
});
