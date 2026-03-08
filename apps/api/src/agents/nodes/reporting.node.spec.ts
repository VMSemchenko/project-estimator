import { Test, TestingModule } from "@nestjs/testing";
import { ReportingNode, createReportingNode } from "./reporting.node";
import { PromptsService } from "../../prompts/prompts.service";
import { LLMProvider } from "../../ai/interfaces/llm-provider.interface";
import { LangfuseService } from "../../ai/langfuse/langfuse.service";
import { TracingService } from "../../observability/tracing.service";
import {
  EstimationState,
  StateUpdate,
  Estimate,
  AtomicWorkMapping,
  EstimationReport,
} from "../interfaces/agent-state.interface";
import { AgentDependencies } from "../interfaces/agent.interface";
import { NormalizedRequirement } from "../../prompts/interfaces/prompt-context.interface";

describe("ReportingNode", () => {
  let node: ReportingNode;
  let promptsService: jest.Mocked<PromptsService>;
  let llmProvider: jest.Mocked<LLMProvider>;
  let langfuseService: jest.Mocked<LangfuseService>;

  const mockPromptsService = {
    compileTemplate: jest.fn().mockReturnValue("Compiled reporting prompt"),
    getTemplate: jest.fn().mockReturnValue("Reporting template content"),
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
      id: "REQ-001",
      title: "User Authentication",
      description:
        "Users must be able to register, login, and manage their accounts",
      originalText: "REQ-001: User Authentication",
      type: "functional",
      priority: "high",
      acceptanceCriteria: ["Users can register", "Users can login"],
      sourceDocument: "stakeholder-requirements.md",
    },
    {
      id: "REQ-002",
      title: "Product Catalog",
      description:
        "The system must display products with categories and search",
      originalText: "REQ-002: Product Catalog",
      type: "functional",
      priority: "high",
      acceptanceCriteria: ["Display products", "Search functionality"],
      sourceDocument: "stakeholder-requirements.md",
    },
  ];

  const mockAtomicWorks: AtomicWorkMapping[] = [
    {
      id: "AW-001",
      name: "Create User Stories",
      baProcess: "Requirements Analysis",
      rationale: "Authentication requires detailed user stories",
      requirementId: "REQ-001",
    },
    {
      id: "AW-002",
      name: "Document Requirements",
      baProcess: "Documentation",
      rationale: "Need to document authentication flows",
      requirementId: "REQ-001",
    },
    {
      id: "AW-003",
      name: "Create User Stories",
      baProcess: "Requirements Analysis",
      rationale: "Catalog needs user stories",
      requirementId: "REQ-002",
    },
  ];

  const mockEstimates: Estimate[] = [
    {
      requirementId: "REQ-001",
      atomicWorkId: "AW-001",
      baseHours: 4,
      optimistic: 2,
      mostLikely: 4,
      pessimistic: 8,
      expectedHours: 4.33,
      appliedCoefficients: [],
      assumptions: ["Standard authentication flow"],
      confidence: "high",
    },
    {
      requirementId: "REQ-001",
      atomicWorkId: "AW-002",
      baseHours: 3,
      optimistic: 2,
      mostLikely: 3,
      pessimistic: 6,
      expectedHours: 3.33,
      appliedCoefficients: [],
      assumptions: [],
      confidence: "medium",
    },
    {
      requirementId: "REQ-002",
      atomicWorkId: "AW-003",
      baseHours: 4,
      optimistic: 3,
      mostLikely: 4,
      pessimistic: 8,
      expectedHours: 4.5,
      appliedCoefficients: [],
      assumptions: [],
      confidence: "medium",
    },
  ];

  const mockState: EstimationState = {
    inputFolder: "/test/input",
    artifacts: [],
    validationStatus: "valid",
    requirements: mockRequirements,
    atomicWorks: mockAtomicWorks,
    estimates: mockEstimates,
    errors: [],
    currentStep: "estimation",
    shouldStop: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create node directly with mock dependencies
    node = new ReportingNode({
      promptsService: mockPromptsService,
      llmProvider: mockLLMProvider,
      langfuseService: mockLangfuseService,
    });

    promptsService = mockPromptsService;
    llmProvider = mockLLMProvider;
    langfuseService = mockLangfuseService;
  });

  describe("createReportingNode", () => {
    it("should create a reporting node instance", () => {
      const dependencies: AgentDependencies = {
        promptsService: mockPromptsService,
        llmProvider: mockLLMProvider,
        langfuseService: mockLangfuseService,
      };

      const reportingNode = createReportingNode(dependencies);

      expect(reportingNode).toBeInstanceOf(ReportingNode);
      expect(reportingNode.name).toBe("reporting");
    });
  });

  describe("execute", () => {
    it("should generate a complete estimation report", async () => {
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
      expect(result.report?.markdownContent).toContain(
        "BA Work Estimation Report",
      );
      expect(result.report?.csvContent).toBeDefined();
    });

    it("should create empty report when no estimates", async () => {
      const emptyState: EstimationState = {
        ...mockState,
        estimates: [],
      };

      const result = await node.execute(emptyState);

      expect(result.report).toBeDefined();
      expect(result.report?.totalHours).toBe(0);
      expect(result.report?.estimates).toEqual([]);
      expect(result.report?.markdownContent).toContain(
        "No estimates generated",
      );
    });

    it("should aggregate estimates by process correctly", async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: "Report content",
      });

      const result = await node.execute(mockState);

      const processSummary = result.report?.summaryByProcess;
      expect(processSummary).toBeDefined();

      // Requirements Analysis should have 2 works (AW-001 and AW-003)
      const reqAnalysis = processSummary?.find(
        (p) => p.processName === "Requirements Analysis",
      );
      expect(reqAnalysis?.workCount).toBe(2);
      expect(reqAnalysis?.totalHours).toBeCloseTo(8.83, 1);

      // Documentation should have 1 work (AW-002)
      const documentation = processSummary?.find(
        (p) => p.processName === "Documentation",
      );
      expect(documentation?.workCount).toBe(1);
      expect(documentation?.totalHours).toBeCloseTo(3.33, 1);
    });

    it("should aggregate estimates by requirement correctly", async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: "Report content",
      });

      const result = await node.execute(mockState);

      const reqSummary = result.report?.summaryByRequirement;
      expect(reqSummary).toBeDefined();

      // REQ-001 should have 2 works
      const req001 = reqSummary?.find((r) => r.requirementId === "REQ-001");
      expect(req001?.workCount).toBe(2);
      expect(req001?.totalHours).toBeCloseTo(7.66, 1);

      // REQ-002 should have 1 work
      const req002 = reqSummary?.find((r) => r.requirementId === "REQ-002");
      expect(req002?.workCount).toBe(1);
      expect(req002?.totalHours).toBeCloseTo(4.5, 1);
    });

    it("should generate CSV content correctly", async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: "Report content",
      });

      const result = await node.execute(mockState);

      expect(result.report?.csvContent).toBeDefined();
      expect(result.report?.csvContent).toContain("Requirement ID");
      expect(result.report?.csvContent).toContain("Atomic Work ID");
      expect(result.report?.csvContent).toContain("Expected Hours");
    });

    it("should handle LLM failure gracefully", async () => {
      mockChatModel.invoke.mockRejectedValue(new Error("LLM unavailable"));

      const result = await node.execute(mockState);

      // Should still generate report with basic content
      expect(result.report).toBeDefined();
      expect(result.report?.totalHours).toBeCloseTo(12.16, 1);
    });

    it("should include all estimates in report", async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: "Report content",
      });

      const result = await node.execute(mockState);

      expect(result.report?.estimates).toHaveLength(3);
      expect(result.report?.estimates?.map((e) => e.atomicWorkId)).toContain(
        "AW-001",
      );
      expect(result.report?.estimates?.map((e) => e.atomicWorkId)).toContain(
        "AW-002",
      );
      expect(result.report?.estimates?.map((e) => e.atomicWorkId)).toContain(
        "AW-003",
      );
    });
  });

  describe("calculateTotalHours", () => {
    it("should sum all expected hours correctly", async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: "Report content",
      });

      const result = await node.execute(mockState);

      // 4.33 + 3.33 + 4.5 = 12.16
      expect(result.report?.totalHours).toBeCloseTo(12.16, 1);
    });

    it("should return 0 for empty estimates", async () => {
      const emptyState: EstimationState = {
        ...mockState,
        estimates: [],
      };

      const result = await node.execute(emptyState);

      expect(result.report?.totalHours).toBe(0);
    });
  });

  describe("aggregateByProcess", () => {
    it("should group estimates by BA process", async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: "Report content",
      });

      const result = await node.execute(mockState);

      const processSummary = result.report?.summaryByProcess || [];

      // Should have 2 processes
      expect(processSummary.length).toBe(2);

      // Check process names
      const processNames = processSummary.map((p) => p.processName);
      expect(processNames).toContain("Requirements Analysis");
      expect(processNames).toContain("Documentation");
    });
  });

  describe("aggregateByRequirement", () => {
    it("should group estimates by requirement", async () => {
      mockChatModel.invoke.mockResolvedValue({
        content: "Report content",
      });

      const result = await node.execute(mockState);

      const reqSummary = result.report?.summaryByRequirement || [];

      // Should have 2 requirements
      expect(reqSummary.length).toBe(2);

      // Check requirement IDs
      const reqIds = reqSummary.map((r) => r.requirementId);
      expect(reqIds).toContain("REQ-001");
      expect(reqIds).toContain("REQ-002");
    });
  });

  describe("node properties", () => {
    it("should have correct name", () => {
      expect(node.name).toBe("reporting");
    });
  });
});
