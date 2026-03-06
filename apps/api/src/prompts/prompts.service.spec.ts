import { Test, TestingModule } from "@nestjs/testing";
import { PromptsService } from "./prompts.service";
import {
  AgentType,
  PromptContext,
} from "./interfaces/prompt-context.interface";

// Mock the fs module to avoid actual file system access
jest.mock("fs", () => ({
  readFile: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ isFile: () => true }),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
  dirname: jest.fn((p) => p),
}));

describe("PromptsService", () => {
  let service: PromptsService;

  const mockTemplateContents: Record<string, string> = {
    "validation-agent.md":
      "# Validation Agent\n\nInput folder: {{inputFolderPath}}\nDiscovered files: {{discoveredFiles}}",
    "extraction-agent.md":
      "# Extraction Agent\n\nDocument: {{documentContent}}\nStakeholder requirements: {{stakeholderRequirements}}",
    "decomposition-agent.md":
      "# Decomposition Agent\n\nRequirements: {{requirements}}\nAtomic works catalog: {{atomicWorksCatalog}}",
    "estimation-agent.md":
      "# Estimation Agent\n\nAtomic Works: {{atomicWorksCatalog}}\nDecomposition results: {{decompositionResults}}",
    "reporting-agent.md":
      "# Reporting Agent\n\nEstimates: {{estimates}}\nRequirements: {{requirements}}",
  };

  beforeEach(async () => {
    const fs = require("fs");

    // Setup mock for readFile to return appropriate content based on filename
    (fs.readFile as jest.Mock).mockImplementation(
      (
        filePath: string,
        encoding: string,
        callback: (err: Error | null, data: string) => void,
      ) => {
        const filename = filePath.split("/").pop();
        const content = filename
          ? mockTemplateContents[filename] || "template content"
          : "template content";
        callback(null, content);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptsService],
    }).compile();

    service = module.get<PromptsService>(PromptsService);

    // Wait for async initialization
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should load all templates on initialization", async () => {
      expect(service).toBeDefined();
    });

    it("should have 5 templates loaded", async () => {
      const templates = service.getAllTemplates();
      expect(templates.size).toBe(5);
    });
  });

  describe("getTemplate", () => {
    it("should return template for valid agent type", () => {
      const template = service.getTemplate(AgentType.VALIDATION);
      expect(template).toBeDefined();
      expect(typeof template).toBe("string");
    });

    it("should throw error for invalid agent type", () => {
      expect(() => service.getTemplate("INVALID" as AgentType)).toThrow();
    });
  });

  describe("compileTemplate", () => {
    it("should compile template with string variable", () => {
      const context: PromptContext = {
        inputFolderPath: "/test/project",
      };

      const compiled = service.compileTemplate(AgentType.VALIDATION, context);

      expect(compiled).toContain("/test/project");
    });

    it("should compile template with object variable", () => {
      const context: PromptContext = {
        documentContent: JSON.stringify({ test: "value" }, null, 2),
      };

      const compiled = service.compileTemplate(AgentType.EXTRACTION, context);

      expect(compiled).toContain("test");
    });

    it("should keep placeholder if variable not found in context", () => {
      const context: PromptContext = {};

      const compiled = service.compileTemplate(AgentType.VALIDATION, context);

      // Should keep the placeholder since inputFolderPath is not provided
      expect(compiled).toContain("{{inputFolderPath}}");
    });

    it("should handle array variables", () => {
      const context: PromptContext = {
        requirements: [
          {
            id: "REQ-001",
            title: "Test Requirement",
            description: "Test requirement",
            originalText: "Test requirement",
            type: "functional" as const,
            acceptanceCriteria: [],
            priority: "medium" as const,
            sourceDocument: "test.md",
          },
        ],
      };

      const compiled = service.compileTemplate(
        AgentType.DECOMPOSITION,
        context,
      );

      expect(compiled).toContain("REQ-001");
    });
  });

  describe("getCompiledPrompt", () => {
    it("should return compiled prompt string", () => {
      const context: PromptContext = {
        inputFolderPath: "/test/path",
      };

      const compiled = service.compileTemplate(AgentType.VALIDATION, context);

      expect(compiled).toContain("/test/path");
    });
  });

  describe("Convenience Methods", () => {
    it("should return compiled validation prompt", () => {
      const context: PromptContext = {
        inputFolderPath: "/test/path",
      };

      const prompt = service.compileTemplate(AgentType.VALIDATION, context);

      expect(prompt).toContain("/test/path");
    });

    it("should return compiled extraction prompt", () => {
      const context: PromptContext = {
        stakeholderRequirements: "Test requirements",
      };

      const prompt = service.compileTemplate(AgentType.EXTRACTION, context);

      expect(prompt).toContain("Test requirements");
    });

    it("should return compiled decomposition prompt", () => {
      const context: PromptContext = {
        requirements: [],
        atomicWorksCatalog: [],
      };

      const prompt = service.compileTemplate(AgentType.DECOMPOSITION, context);

      expect(prompt).toBeDefined();
    });

    it("should return compiled estimation prompt", () => {
      const context: PromptContext = {
        decompositionResults: [],
        atomicWorksCatalog: [],
      };

      const prompt = service.compileTemplate(AgentType.ESTIMATION, context);

      expect(prompt).toBeDefined();
    });

    it("should return compiled reporting prompt", () => {
      const context: PromptContext = {
        estimates: [],
      };

      const prompt = service.compileTemplate(AgentType.REPORTING, context);

      expect(prompt).toBeDefined();
    });
  });

  describe("Context Creation Methods", () => {
    describe("createValidationContext", () => {
      it("should create validation context with all fields", () => {
        const discoveredFiles = [
          {
            name: "test.md",
            path: "/test/test.md",
            content: "content",
            type: "markdown",
          },
        ];

        const context = service.createValidationContext(
          "/test/project",
          discoveredFiles,
        );

        expect(context.inputFolderPath).toBe("/test/project");
        expect(context.discoveredFiles).toEqual(discoveredFiles);
      });
    });

    describe("createExtractionContext", () => {
      it("should create extraction context with stakeholder requirements", () => {
        const context = service.createExtractionContext("Test requirements");

        expect(context.stakeholderRequirements).toBe("Test requirements");
      });

      it("should create extraction context with business vision", () => {
        const context = service.createExtractionContext(
          "Test requirements",
          "Vision",
        );

        expect(context.stakeholderRequirements).toBe("Test requirements");
        expect(context.businessVision).toBe("Vision");
      });
    });

    describe("createDecompositionContext", () => {
      it("should create decomposition context with all fields", () => {
        const requirements = [
          {
            id: "REQ-001",
            title: "Test",
            description: "Test",
            originalText: "Test",
            type: "functional" as const,
            acceptanceCriteria: [],
            priority: "medium" as const,
            sourceDocument: "test.md",
          },
        ];
        const atomicWorksCatalog = [
          { id: "AW-001", name: "Work", baProcess: "test", baseHours: 1 },
        ];
        const baProcessesCatalog = [
          {
            id: "BP-001",
            name: "Process",
            category: "Analysis",
            description: "Test",
          },
        ];

        const context = service.createDecompositionContext(
          requirements,
          atomicWorksCatalog,
          baProcessesCatalog,
        );

        expect(context.requirements).toEqual(requirements);
        expect(context.atomicWorksCatalog).toEqual(atomicWorksCatalog);
        expect(context.baProcessesCatalog).toEqual(baProcessesCatalog);
      });
    });

    describe("createEstimationContext", () => {
      it("should create estimation context with all fields", () => {
        const decompositionResults = [
          {
            requirementId: "REQ-001",
            requirementTitle: "Test",
            atomicWorks: [],
          },
        ];
        const atomicWorksCatalog = [
          { id: "AW-001", name: "Work", baProcess: "test", baseHours: 1 },
        ];

        const context = service.createEstimationContext(
          decompositionResults,
          atomicWorksCatalog,
        );

        expect(context.decompositionResults).toEqual(decompositionResults);
        expect(context.atomicWorksCatalog).toEqual(atomicWorksCatalog);
      });
    });

    describe("createReportingContext", () => {
      it("should create reporting context with all fields", () => {
        const validationResults = {
          status: "valid" as const,
          missingArtifacts: [],
          qualityIssues: [],
          recommendations: [],
          canProceed: true,
        };
        const requirements = [
          {
            id: "REQ-001",
            title: "Test",
            description: "Test",
            originalText: "Test",
            type: "functional" as const,
            acceptanceCriteria: [],
            priority: "medium" as const,
            sourceDocument: "test.md",
          },
        ];
        const decompositionResults = [
          {
            requirementId: "REQ-001",
            requirementTitle: "Test",
            atomicWorks: [],
          },
        ];
        const estimates = [
          {
            requirementId: "REQ-001",
            atomicWorkId: "AW-001",
            baseHours: 1,
            optimistic: 0.5,
            mostLikely: 1,
            pessimistic: 2,
            expectedHours: 1.08,
            appliedCoefficients: [],
            assumptions: [],
            confidence: "medium" as const,
          },
        ];

        const context = service.createReportingContext(
          validationResults,
          requirements,
          decompositionResults,
          estimates,
          "/input/path",
        );

        expect(context.validationResults).toEqual(validationResults);
        expect(context.requirements).toEqual(requirements);
        expect(context.decompositionResults).toEqual(decompositionResults);
        expect(context.estimates).toEqual(estimates);
        expect(context.inputFolderPath).toBe("/input/path");
        expect(context.timestamp).toBeDefined();
      });

      it("should create reporting context without input folder path", () => {
        const context = service.createReportingContext(undefined, [], [], []);

        expect(context.inputFolderPath).toBeUndefined();
        expect(context.timestamp).toBeDefined();
      });
    });
  });

  describe("reloadTemplates", () => {
    it("should clear and reload all templates", async () => {
      // First load
      const templatesBefore = service.getAllTemplates();
      expect(templatesBefore.size).toBe(5);

      // Reload
      await service.reloadTemplates();

      const templatesAfter = service.getAllTemplates();
      expect(templatesAfter.size).toBe(5);
    });
  });

  describe("Template Interpolation", () => {
    it("should handle nested object variables", () => {
      const context: PromptContext = {
        requirements: [
          {
            id: "REQ-001",
            title: "Test",
            description: "Test description",
            originalText: "Original",
            type: "functional",
            acceptanceCriteria: ["AC1", "AC2"],
            priority: "high",
            sourceDocument: "test.md",
          },
        ],
      };

      const compiled = service.compileTemplate(
        AgentType.DECOMPOSITION,
        context,
      );

      expect(compiled).toContain("REQ-001");
    });

    it("should convert arrays to JSON strings", () => {
      const context: PromptContext = {
        estimates: [
          {
            requirementId: "REQ-001",
            atomicWorkId: "AW-001",
            baseHours: 1,
            optimistic: 0.5,
            mostLikely: 1,
            pessimistic: 2,
            expectedHours: 1.08,
            appliedCoefficients: [],
            assumptions: [],
            confidence: "medium",
          },
        ],
      };

      const compiled = service.compileTemplate(AgentType.REPORTING, context);

      expect(compiled).toContain("REQ-001");
    });

    it("should handle empty context", () => {
      const context: PromptContext = {};

      const compiled = service.compileTemplate(AgentType.VALIDATION, context);

      // Should contain placeholders for missing variables
      expect(compiled).toContain("{{");
    });

    it("should handle null values in context", () => {
      const context: PromptContext = {
        inputFolderPath: null as any,
      };

      const compiled = service.compileTemplate(AgentType.VALIDATION, context);

      expect(compiled).toBeDefined();
    });
  });
});
