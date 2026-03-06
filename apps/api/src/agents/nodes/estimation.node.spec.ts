import { Test, TestingModule } from '@nestjs/testing';
import { EstimationNode, createEstimationNode } from './estimation.node';
import { PromptsService } from '../../prompts/prompts.service';
import { LLMProvider } from '../../ai/interfaces/llm-provider.interface';
import { LangfuseService } from '../../ai/langfuse/langfuse.service';
import { TracingService } from '../../observability/tracing.service';
import { RagService } from '../../rag/rag.service';
import { EstimationState, StateUpdate, Estimate, AtomicWorkMapping } from '../interfaces/agent-state.interface';
import { AgentDependencies } from '../interfaces/agent.interface';
import { NormalizedRequirement } from '../../prompts/interfaces/prompt-context.interface';

describe('EstimationNode', () => {
  let node: EstimationNode;
  let promptsService: jest.Mocked<PromptsService>;
  let llmProvider: jest.Mocked<LLMProvider>;
  let langfuseService: jest.Mocked<LangfuseService>;
  let ragService: jest.Mocked<RagService>;

  const mockPromptsService = {
    compileTemplate: jest.fn().mockReturnValue('Compiled estimation prompt'),
    getTemplate: jest.fn().mockReturnValue('Estimation template content'),
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
  ];

  const mockAtomicWorks: AtomicWorkMapping[] = [
    {
      id: 'AW-001',
      name: 'Create User Stories',
      baProcess: 'Requirements Analysis',
      rationale: 'Authentication requires detailed user stories',
      requirementId: 'REQ-001',
    },
    {
      id: 'AW-002',
      name: 'Document Requirements',
      baProcess: 'Documentation',
      rationale: 'Need to document authentication flows',
      requirementId: 'REQ-001',
    },
  ];

  const mockState: EstimationState = {
    inputFolder: '/test/input',
    artifacts: [],
    validationStatus: 'valid',
    requirements: mockRequirements,
    atomicWorks: mockAtomicWorks,
    estimates: [],
    errors: [],
    currentStep: 'decomposition',
    shouldStop: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimationNode,
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

    node = module.get<EstimationNode>(EstimationNode);
    promptsService = module.get(PromptsService);
    llmProvider = module.get('LLMProvider');
    langfuseService = module.get(LangfuseService);
    ragService = module.get(RagService);
  });

  describe('createEstimationNode', () => {
    it('should create an estimation node instance', () => {
      const dependencies: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
        ragService: mockRagService,
      };

      const estimationNode = createEstimationNode(dependencies);

      expect(estimationNode).toBeInstanceOf(EstimationNode);
      expect(estimationNode.name).toBe('estimation');
    });
  });

  describe('execute', () => {
    it('should calculate PERT estimates for atomic works', async () => {
      // Mock coefficient query
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [
          {
            id: 'coef_1',
            content: 'High complexity coefficient for authentication',
            score: 0.9,
            metadata: { id: 'COEF-001', name: 'High Complexity', multiplier: 1.5 },
          },
        ],
        query: 'test',
        duration: 20,
      });

      // Mock LLM response for PERT calculation
      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 2,
          mostLikely: 4,
          pessimistic: 8,
          appliedCoefficients: [
            { id: 'COEF-001', name: 'High Complexity', multiplier: 1.5, reason: 'Authentication is complex' },
          ],
          assumptions: ['OAuth integration adds complexity'],
          confidence: 'medium',
        }),
      });

      const result = await node.execute(mockState);

      expect(result.estimates).toBeDefined();
      expect(result.estimates?.length).toBe(2);
      expect(result.estimates?.[0].requirementId).toBe('REQ-001');
      expect(result.estimates?.[0].expectedHours).toBeGreaterThan(0);
    });

    it('should return empty array when no atomic works to estimate', async () => {
      const emptyState: EstimationState = {
        ...mockState,
        atomicWorks: [],
      };

      const result = await node.execute(emptyState);

      expect(result.estimates).toEqual([]);
      expect(mockRagService.similaritySearch).not.toHaveBeenCalled();
    });

    it('should work without RAG service using default values', async () => {
      const dependenciesWithoutRag: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
      };

      const nodeWithoutRag = new EstimationNode(dependenciesWithoutRag);

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 2,
          mostLikely: 4,
          pessimistic: 8,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'medium',
        }),
      });

      const result = await nodeWithoutRag.execute(mockState);

      expect(result.estimates).toBeDefined();
      expect(result.estimates?.[0].baseHours).toBe(4); // Default base hours
    });

    it('should handle RAG query failure gracefully', async () => {
      mockRagService.similaritySearch.mockRejectedValue(new Error('RAG service unavailable'));

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 2,
          mostLikely: 4,
          pessimistic: 8,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'low',
        }),
      });

      const result = await node.execute(mockState);

      // Should continue with default values
      expect(result.estimates).toBeDefined();
    });

    it('should calculate PERT formula correctly', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 2,
          mostLikely: 4,
          pessimistic: 10,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'medium',
        }),
      });

      const result = await node.execute(mockState);

      // PERT formula: (O + 4M + P) / 6 = (2 + 16 + 10) / 6 = 4.67
      const expectedHours = (2 + 4 * 4 + 10) / 6;
      expect(result.estimates?.[0].expectedHours).toBeCloseTo(expectedHours, 1);
    });

    it('should apply coefficients to estimates', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [
          {
            id: 'coef_1',
            content: 'Complex integration coefficient',
            score: 0.9,
            metadata: { id: 'COEF-001', name: 'Complex Integration', multiplier: 1.3 },
          },
        ],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 3,
          mostLikely: 5,
          pessimistic: 10,
          appliedCoefficients: [
            { id: 'COEF-001', name: 'Complex Integration', multiplier: 1.3, reason: 'OAuth integration' },
          ],
          assumptions: ['Third-party OAuth provider'],
          confidence: 'medium',
        }),
      });

      const result = await node.execute(mockState);

      expect(result.estimates?.[0].appliedCoefficients).toHaveLength(1);
      expect(result.estimates?.[0].appliedCoefficients[0].multiplier).toBe(1.3);
    });

    it('should handle LLM failure with fallback calculation', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockRejectedValue(new Error('LLM unavailable'));

      const result = await node.execute(mockState);

      // Should use fallback calculation
      expect(result.estimates).toBeDefined();
      expect(result.estimates?.[0].confidence).toBe('low');
      expect(result.estimates?.[0].assumptions).toContain('Fallback estimate due to LLM error');
    });

    it('should retrieve base hours from RAG', async () => {
      mockRagService.similaritySearch
        .mockResolvedValueOnce({
          documents: [], // Coefficients query
          query: 'test',
          duration: 10,
        })
        .mockResolvedValueOnce({
          documents: [
            {
              id: 'aw_1',
              content: 'Create user stories',
              score: 0.95,
              metadata: { id: 'AW-001', name: 'Create User Stories', baseHours: 6 },
            },
          ],
          query: 'AW-001',
          duration: 10,
        });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 3,
          mostLikely: 6,
          pessimistic: 12,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'high',
        }),
      });

      const result = await node.execute(mockState);

      expect(result.estimates?.[0].baseHours).toBe(6);
    });

    it('should use default base hours when RAG returns no results', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 2,
          mostLikely: 4,
          pessimistic: 8,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'medium',
        }),
      });

      const result = await node.execute(mockState);

      expect(result.estimates?.[0].baseHours).toBe(4); // Default
    });

    it('should handle malformed LLM response', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: 'Invalid JSON response',
      });

      const result = await node.execute(mockState);

      // Should use fallback calculation
      expect(result.estimates).toBeDefined();
      expect(result.estimates?.[0].confidence).toBe('low');
    });

    it('should set confidence level from LLM response', async () => {
      mockRagService.similaritySearch.mockResolvedValue({
        documents: [],
        query: 'test',
        duration: 10,
      });

      mockChatModel.invoke.mockResolvedValue({
        content: JSON.stringify({
          optimistic: 2,
          mostLikely: 4,
          pessimistic: 6,
          appliedCoefficients: [],
          assumptions: ['Well-defined requirement'],
          confidence: 'high',
        }),
      });

      const result = await node.execute(mockState);

      expect(result.estimates?.[0].confidence).toBe('high');
    });
  });

  describe('calculateTotalHours', () => {
    it('should sum all expected hours', () => {
      const estimates: Estimate[] = [
        {
          requirementId: 'REQ-001',
          atomicWorkId: 'AW-001',
          baseHours: 4,
          optimistic: 2,
          mostLikely: 4,
          pessimistic: 8,
          expectedHours: 4.33,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'medium',
        },
        {
          requirementId: 'REQ-001',
          atomicWorkId: 'AW-002',
          baseHours: 3,
          optimistic: 2,
          mostLikely: 3,
          pessimistic: 6,
          expectedHours: 3.33,
          appliedCoefficients: [],
          assumptions: [],
          confidence: 'medium',
        },
      ];

      const total = node.calculateTotalHours(estimates);

      expect(total).toBeCloseTo(7.66, 1);
    });

    it('should return 0 for empty estimates', () => {
      const total = node.calculateTotalHours([]);
      expect(total).toBe(0);
    });
  });

  describe('groupByRequirement', () => {
    it('should group estimates by requirement ID', () => {
      const estimates: Estimate[] = [
        { requirementId: 'REQ-001', atomicWorkId: 'AW-001', baseHours: 4, optimistic: 2, mostLikely: 4, pessimistic: 8, expectedHours: 4, appliedCoefficients: [], assumptions: [], confidence: 'medium' },
        { requirementId: 'REQ-001', atomicWorkId: 'AW-002', baseHours: 3, optimistic: 2, mostLikely: 3, pessimistic: 6, expectedHours: 3, appliedCoefficients: [], assumptions: [], confidence: 'medium' },
        { requirementId: 'REQ-002', atomicWorkId: 'AW-003', baseHours: 5, optimistic: 3, mostLikely: 5, pessimistic: 10, expectedHours: 5.5, appliedCoefficients: [], assumptions: [], confidence: 'high' },
      ];

      const grouped = node.groupByRequirement(estimates);

      expect(grouped.size).toBe(2);
      expect(grouped.get('REQ-001')?.length).toBe(2);
      expect(grouped.get('REQ-002')?.length).toBe(1);
    });
  });

  describe('groupByProcess', () => {
    it('should group estimates by BA process', () => {
      const estimates: Estimate[] = [
        { requirementId: 'REQ-001', atomicWorkId: 'AW-001', baseHours: 4, optimistic: 2, mostLikely: 4, pessimistic: 8, expectedHours: 4, appliedCoefficients: [], assumptions: [], confidence: 'medium' },
        { requirementId: 'REQ-001', atomicWorkId: 'AW-002', baseHours: 3, optimistic: 2, mostLikely: 3, pessimistic: 6, expectedHours: 3, appliedCoefficients: [], assumptions: [], confidence: 'medium' },
      ];

      const grouped = node.groupByProcess(estimates, mockAtomicWorks);

      expect(grouped.size).toBe(2);
      expect(grouped.get('Requirements Analysis')?.length).toBe(1);
      expect(grouped.get('Documentation')?.length).toBe(1);
    });
  });

  describe('node properties', () => {
    it('should have correct name', () => {
      expect(node.name).toBe('estimation');
    });
  });
});
