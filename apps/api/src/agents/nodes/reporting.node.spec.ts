import { Test, TestingModule } from '@nestjs/testing';
import { ReportingNode, createReportingNode } from './reporting.node';
import { PromptsService } from '../../prompts/prompts.service';
import { LLMProvider } from '../../ai/interfaces/llm-provider.interface';
import { LangfuseService } from '../../ai/langfuse/langfuse.service';
import { TracingService } from '../../observability/tracing.service';
import { EstimationState, StateUpdate, Estimate, AtomicWorkMapping, EstimationReport } from '../interfaces/agent-state.interface';
import { AgentDependencies } from '../interfaces/agent.interface';
import { NormalizedRequirement } from '../../prompts/interfaces/prompt-context.interface';

describe('ReportingNode', () => {
  let node: ReportingNode;
  let promptsService: jest.Mocked<PromptsService>;
  let llmProvider: jest.Mocked<LLMProvider>;
  let langfuseService: jest.Mocked<LangfuseService>;

  const mockPromptsService = {
    compileTemplate: jest.fn().mockReturnValue('Compiled reporting prompt'),
    getTemplate: jest.fn().mockReturnValue('Reporting template content'),
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
    {
      id: 'AW-003',
      name: 'Create User Stories',
      baProcess: 'Requirements Analysis',
      rationale: 'Catalog needs user stories',
      requirementId: 'REQ-002',
    },
  ];

  const mockEstimates: Estimate[] = [
    {
      requirementId: 'REQ-001',
      atomicWorkId: 'AW-001',
      baseHours: 4,
      optimistic: 2,
      mostLikely: 4,
      pessimistic: 8,
      expectedHours: 4.33,
      appliedCoefficients: [],
      assumptions: ['Standard authentication flow'],
      confidence: 'high',
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
    {
      requirementId: 'REQ-002',
      atomicWorkId: 'AW-003',
      baseHours: 4,
      optimistic: 3,
      mostLikely: 4,
      pessimistic: 8,
      expectedHours: 4.5,
      appliedCoefficients: [],
      assumptions: [],
      confidence: 'medium',
    },
  ];

  const mockState: EstimationState = {
    inputFolder: '/test/input',
    artifacts: [],
    validationStatus: 'valid',
    requirements: mockRequirements,
    atomicWorks: mockAtomicWorks,
    estimates: mockEstimates,
    errors: [],
    currentStep: 'estimation',
    shouldStop: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingNode,
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

    node = module.get<ReportingNode>(ReportingNode);
    promptsService = module.get(PromptsService);
    llmProvider = module.get('LLMProvider');
    langfuseService = module.get(LangfuseService);
  });

  describe('createReportingNode', () => {
    it('should create a reporting node instance', () => {
      const dependencies: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
      };

      const reportingNode = createReportingNode(dependencies);

      expect(reportingNode).toBeInstanceOf(ReportingNode);
      expect(reportingNode.name).toBe('reporting');
    });
  });

  describe('execute', () => {
    it('should generate a complete estimation report', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: `# BA Work Estimation Report

## Summary
Total Estimated Hours: 12.16

## By Process
- Requirements Analysis: 8.83 hours
- Documentation: 3.33 hours

## By Requirement
- REQ-001: User Authentication: 7.66 hours
- REQ-002: Product Catalog: 4.5 hours`,
      });

      const result = await node.execute(mockState);

      expect(result.report).toBeDefined();
      expect(result.report?.totalHours).toBeCloseTo(12.16, 1);
      expect(result.report?.summaryByProcess).toBeDefined();
      expect(result.report?.summaryByRequirement).toBeDefined();
      expect(result.report?.markdownContent).toContain('BA Work Estimation Report');
      expect(result.report?.csvContent).toBeDefined();
    });

    it('should create empty report when no estimates', async () => {
      const emptyState: EstimationState = {
        ...mockState,
        estimates: [],
      };

      const result = await node.execute(emptyState);

      expect(result.report).toBeDefined();
      expect(result.report?.totalHours).toBe(0);
      expect(result.report?.estimates).toEqual([]);
      expect(result.report?.markdownContent).toContain('No estimates generated');
    });

    it('should aggregate estimates by process correctly', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      const processSummary = result.report?.summaryByProcess;
      expect(processSummary).toBeDefined();
      
      // Requirements Analysis should have 2 works (AW-001 and AW-003)
      const reqAnalysis = processSummary?.find((p) => p.processName === 'Requirements Analysis');
      expect(reqAnalysis?.workCount).toBe(2);
      expect(reqAnalysis?.totalHours).toBeCloseTo(8.83, 1);

      // Documentation should have 1 work (AW-002)
      const documentation = processSummary?.find((p) => p.processName === 'Documentation');
      expect(documentation?.workCount).toBe(1);
      expect(documentation?.totalHours).toBeCloseTo(3.33, 1);
    });

    it('should aggregate estimates by requirement correctly', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      const reqSummary = result.report?.summaryByRequirement;
      expect(reqSummary).toBeDefined();
      
      // REQ-001 should have 2 works
      const req001 = reqSummary?.find((r) => r.requirementId === 'REQ-001');
      expect(req001?.requirementTitle).toBe('User Authentication');
      expect(req001?.workCount).toBe(2);
      expect(req001?.totalHours).toBeCloseTo(7.66, 1);

      // REQ-002 should have 1 work
      const req002 = reqSummary?.find((r) => r.requirementId === 'REQ-002');
      expect(req002?.requirementTitle).toBe('Product Catalog');
      expect(req002?.workCount).toBe(1);
    });

    it('should generate CSV content', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      expect(result.report?.csvContent).toBeDefined();
      expect(result.report?.csvContent).toContain('Requirement ID');
      expect(result.report?.csvContent).toContain('Atomic Work ID');
      expect(result.report?.csvContent).toContain('Expected Hours');
    });

    it('should include timestamp in report', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const beforeTime = new Date().toISOString();
      const result = await node.execute(mockState);
      const afterTime = new Date().toISOString();

      expect(result.report?.timestamp).toBeDefined();
      const reportTime = result.report?.timestamp!;
      expect(reportTime >= beforeTime).toBe(true);
      expect(reportTime <= afterTime).toBe(true);
    });

    it('should include input folder in report', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      expect(result.report?.inputFolder).toBe('/test/input');
    });

    it('should handle LLM failure gracefully', async () => {
      mockChatModel.invoke.mockRejectedValue(new Error('LLM unavailable'));

      const result = await node.execute(mockState);

      // Should still generate a report with basic content
      expect(result.report).toBeDefined();
      expect(result.report?.totalHours).toBeCloseTo(12.16, 1);
    });

    it('should sort process summary by total hours descending', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      const processSummary = result.report?.summaryByProcess;
      if (processSummary && processSummary.length > 1) {
        for (let i = 0; i < processSummary.length - 1; i++) {
          expect(processSummary[i].totalHours).toBeGreaterThanOrEqual(
            processSummary[i + 1].totalHours
          );
        }
      }
    });

    it('should handle unknown requirements gracefully', async () => {
      const stateWithUnknownReq: EstimationState = {
        ...mockState,
        estimates: [
          {
            requirementId: 'REQ-999',
            atomicWorkId: 'AW-999',
            baseHours: 2,
            optimistic: 1,
            mostLikely: 2,
            pessimistic: 4,
            expectedHours: 2.17,
            appliedCoefficients: [],
            assumptions: [],
            confidence: 'low',
          },
        ],
        atomicWorks: [
          {
            id: 'AW-999',
            name: 'Unknown Work',
            baProcess: 'Unknown Process',
            rationale: 'Test',
            requirementId: 'REQ-999',
          },
        ],
      };

      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(stateWithUnknownReq);

      expect(result.report).toBeDefined();
      const reqSummary = result.report?.summaryByRequirement[0];
      expect(reqSummary?.requirementTitle).toBe('Unknown');
    });

    it('should include all estimates in report', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      expect(result.report?.estimates).toHaveLength(3);
      expect(result.report?.estimates).toEqual(mockEstimates);
    });
  });

  describe('calculateTotalHours', () => {
    it('should sum all expected hours correctly', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      // 4.33 + 3.33 + 4.5 = 12.16
      expect(result.report?.totalHours).toBeCloseTo(12.16, 1);
    });
  });

  describe('formatHours', () => {
    it('should format hours with proper precision', async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: 'Report content',
      });

      const result = await node.execute(mockState);

      expect(result.report?.summaryByProcess[0].totalHours).toBeLessThanOrEqual(999.99);
    });
  });

  describe('node properties', () => {
    it('should have correct name', () => {
      expect(node.name).toBe('reporting');
    });
  });
});
