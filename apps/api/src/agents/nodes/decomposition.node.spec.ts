import { Test, TestingModule } from '@nestjs/testing';
import { DecompositionNode, createDecompositionNode } from './decomposition.node';
import { PromptsService } from '../../prompts/prompts.service';
import { LLMProvider } from '../../ai/interfaces/llm-provider.interface';
import { LangfuseService } from '../../ai/langfuse/langfuse.service';
import { TracingService } from '../../observability/tracing.service';
import { RagService } from '../../rag/rag.service';
import { EstimationState, StateUpdate, AtomicWorkMapping } from '../interfaces/agent-state.interface';
import { AgentDependencies } from '../interfaces/agent.interface';
import { NormalizedRequirement } from '../../prompts/interfaces/prompt-context.interface';

describe('DecompositionNode', () => {
  let node: DecompositionNode;
  let promptsService: jest.Mocked<PromptsService>;
  let llmProvider: jest.Mocked<LLMProvider>;
  let langfuseService: jest.Mocked<LangfuseService>;
  let ragService: jest.Mocked<RagService>;

  const mockPromptsService = {
    compileTemplate: jest.fn().mockReturnValue('Compiled decomposition prompt'),
    getTemplate: jest.fn().mockReturnValue('Decomposition template content'),
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

  const mockRagService = {
    similaritySearch: jest.fn(),
    addDocuments: jest.fn(),
    getDocumentCount: jest.fn(),
  } as unknown as jest.Mocked<RagService>;

  const mockRequirements: NormalizedRequirement[] = [
    {
      id: 'REQ-001',
      title: 'User Authentication',
      description: 'Users must be able to register, login, and manage their accounts',
      originalText: 'REQ-001: User Authentication',
      type: 'functional',
      priority: 'high',
      acceptanceCriteria: ['Users can register', 'Users can login'],
      sourceDocument: 'stakeholder-requirements.md',
    },
    {
      id: 'REQ-002',
      title: 'Product Catalog',
      description: 'The system must display products with categories and search',
      originalText: 'REQ-002: Product Catalog',
      type: 'functional',
      priority: 'high',
      acceptanceCriteria: ['Display products', 'Search functionality'],
      sourceDocument: 'stakeholder-requirements.md',
    },
  ];

  const mockState: EstimationState = {
    inputFolder: '/test/input',
    artifacts: [],
    validationStatus: 'valid',
    requirements: mockRequirements,
    atomicWorks: [],
    estimates: [],
    errors: [],
    currentStep: 'extraction',
    shouldStop: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecompositionNode,
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
        {
          provide: RagService,
          useValue: mockRagService,
        },
      ],
    }).compile();

    node = module.get<DecompositionNode>(DecompositionNode);
    promptsService = module.get(PromptsService);
    llmProvider = module.get('LLMProvider');
    langfuseService = module.get(LangfuseService);
    ragService = module.get(RagService);
  });

  describe('createDecompositionNode', () => {
    it('should create a decomposition node instance', () => {
      const dependencies: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
        ragService: mockRagService,
      };

      const decompositionNode = createDecompositionNode(dependencies);

      expect(decompositionNode).toBeInstanceOf(DecompositionNode);
      expect(decompositionNode.name).toBe('decomposition');
    });
  });

  describe('execute', () => {
    it('should decompose requirements into atomic works', async () => {
      // Mock RAG response
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [
          {
            id: 'aw_1',
            content: 'Create user stories for authentication',
            score: 0.95,
            metadata: {
              id: 'AW-001',
              name: 'Create User Stories',
              baProcess: 'Requirements Analysis',
              baseHours: 4,
            },
          },
          {
            id: 'aw_2',
            content: 'Document authentication requirements',
            score: 0.85,
            metadata: {
              id: 'AW-002',
              name: 'Document Requirements',
              baProcess: 'Documentation',
              baseHours: 3,
            },
          },
        ],
        query: 'authentication',
        duration: 50,
      });

      // Mock LLM response
      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          mappings: [
            {
              atomicWorkId: 'AW-001',
              atomicWorkName: 'Create User Stories',
              baProcess: 'Requirements Analysis',
              rationale: 'Authentication requires detailed user stories',
            },
            {
              atomicWorkId: 'AW-002',
              atomicWorkName: 'Document Requirements',
              baProcess: 'Documentation',
              rationale: 'Need to document authentication flows',
            },
          ],
        }),
      });

      const result = await node.execute(mockState);

      expect(result.atomicWorks).toBeDefined();
      expect(result.atomicWorks?.length).toBeGreaterThan(0);
      expect(result.atomicWorks?.[0].requirementId).toBe('REQ-001');
      expect(result.atomicWorks?.[0].id).toBe('AW-001');
    });

    it('should return empty array when no requirements to decompose', async () => {
      const emptyState: EstimationState = {
        ...mockState,
        requirements: [],
      };

      const result = await node.execute(emptyState);

      expect(result.atomicWorks).toEqual([]);
      expect(mockRagService.similaritySearch).not.toHaveBeenCalled();
    });

    it('should work without RAG service', async () => {
      const dependenciesWithoutRag: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
      };

      const nodeWithoutRag = new DecompositionNode(dependenciesWithoutRag);

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          mappings: [
            {
              atomicWorkId: 'AW-001',
              atomicWorkName: 'Create User Stories',
              baProcess: 'Requirements Analysis',
              rationale: 'Test rationale',
            },
          ],
        }),
      });

      const result = await nodeWithoutRag.execute(mockState);

      expect(result.atomicWorks).toBeDefined();
    });

    it('should handle RAG query failure gracefully', async () => {
      mockRagService.similaritySearch.mockRejectedValue(new Error('RAG service unavailable'));

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          mappings: [
            {
              atomicWorkId: 'AW-001',
              atomicWorkName: 'Create User Stories',
              baProcess: 'Requirements Analysis',
              rationale: 'Test rationale',
            },
          ],
        }),
      });

      const result = await node.execute(mockState);

      // Should continue with empty RAG results
      expect(result.atomicWorks).toBeDefined();
    });

    it('should handle LLM mapping failure', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockRejectedValue(new Error('LLM unavailable'));

      const result = await node.execute(mockState);

      expect(result.errors).toBeDefined();
      expect(result.shouldStop).toBe(true);
    });

    it('should process multiple requirements', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [
          {
            id: 'aw_1',
            content: 'Test atomic work',
            score: 0.9,
            metadata: { id: 'AW-001', name: 'Test Work', baProcess: 'Analysis', baseHours: 2 },
          },
        ],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          mappings: [
            {
              atomicWorkId: 'AW-001',
              atomicWorkName: 'Test Work',
              baProcess: 'Analysis',
              rationale: 'Test rationale',
            },
          ],
        }),
      });

      const result = await node.execute(mockState);

      // Should have mappings for both requirements
      expect(result.atomicWorks?.length).toBeGreaterThanOrEqual(2);
      const requirementIds = new Set(result.atomicWorks?.map((aw) => aw.requirementId));
      expect(requirementIds.size).toBe(2);
    });

    it('should apply score threshold in RAG query', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({ mappings: [] }),
      });

      await node.execute(mockState);

      expect(mockRagService.similaritySearch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          scoreThreshold: 0.5,
          k: 10,
        })
      );
    });

    it('should handle malformed LLM response', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: 'Invalid JSON',
      });

      const result = await node.execute(mockState);

      // Should handle gracefully with default value
      expect(result.atomicWorks).toBeDefined();
    });

    it('should include rationale in mappings', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          mappings: [
            {
              atomicWorkId: 'AW-001',
              atomicWorkName: 'Test Work',
              baProcess: 'Analysis',
              rationale: 'This work is needed because authentication is complex',
            },
          ],
        }),
      });

      const result = await node.execute(mockState);

      expect(result.atomicWorks?.[0].rationale).toBe('This work is needed because authentication is complex');
    });
  });

  describe('node properties', () => {
    it('should have correct name', () => {
      expect(node.name).toBe('decomposition');
    });
  });
});
