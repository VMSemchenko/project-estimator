import { Test, TestingModule } from "@nestjs/testing";
import { PromptsService } from "./prompts.service";
import {
  AgentType,
  PromptContext,
} from "./interfaces/prompt-context.interface";
import * as fs from "fs";
import * as path from "path";

// Mock fs and path modules
jest.mock("fs");
jest.mock("path");

describe("PromptsService", () => {
  let service: PromptsService;

  const mockTemplates = {
    [AgentType.VALIDATION]:
      "# Validation Agent\n\nInput folder: {{inputFolderPath}}",
    [AgentType.EXTRACTION]:
      "# Extraction Agent\n\nDocument: {{documentContent}}",
    [AgentType.DECOMPOSITION]:
      "# Decomposition Agent\n\nRequirements: {{requirements}}",
    [AgentType.ESTIMATION]:
      "# Estimation Agent\n\nAtomic Works: {{atomicWorksCatalog}}",
    [AgentType.REPORTING]: "# Reporting Agent\n\nEstimates: {{estimates}}",
  };

  beforeEach(async () => {
    // Setup mocks
    (fs.readFile as unknown as jest.Mock).mockImplementation(
      (_filePath, _encoding, callback) => {
        callback(null, "template content");
      },
    );
    (fs.readdirSync as unknown as jest.Mock).mockImplementation(
      (_dir, callback) => {
        callback(null, ["template1.md", "template2.md"]);
      },
    );
    (fs.existsSync as unknown as jest.Mock).mockReturnValue(true);
    (fs.statSync as unknown as jest.Mock).mockReturnValue({
      isFile: () => true,
    });
    (path.join as unknown as jest.Mock).mockImplementation((...args) =>
      args.join("/"),
    );
    (path.dirname as unknown as jest.Mock).mockImplementation(
      (...args) => args[0],
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptsService],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should load all templates on initialization", async () => {
      // Service initializes in beforeEach
      expect(service).toBeDefined();
    });

    it("should have 5 templates loaded", () => {
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
      expect(compiled).not.toContain("{{inputFolderPath}}");
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
    it("should return PromptTemplate object with all fields", () => {
      const context: PromptContext = {
        inputFolderPath: "/test/path",
      };

      const promptTemplate = service.getCompiledPrompt(
        AgentType.VALIDATION,
        context,
      );

      expect(promptTemplate).toHaveProperty("agentType", AgentType.VALIDATION);
      expect(promptTemplate).toHaveProperty("content");
      expect(promptTemplate).toHaveProperty("compiled");
      expect(promptTemplate.content).toContain("Validation Agent");
      expect(promptTemplate.compiled).toContain("/test/path");
    });
  });

  describe("Convenience Methods", () => {
    describe("getValidationPrompt", () => {
      it("should return compiled validation prompt", () => {
        const context: PromptContext = {
          inputFolderPath: "/validation/path",
        };

        const prompt = service.getValidationPrompt(context);

        expect(prompt).toContain("/validation/path");
      });
    });

    describe("getExtractionPrompt", () => {
      it("should return compiled extraction prompt", () => {
        const context: PromptContext = {
          documentContent: "Test document content",
        };

        const prompt = service.getExtractionPrompt(context);

        expect(prompt).toContain("Test document content");
      });
    });

    describe("getDecompositionPrompt", () => {
      it("should return compiled decomposition prompt", () => {
        const context: PromptContext = {
          requirements: [
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
          ],
        };

        const prompt = service.getDecompositionPrompt(context);

        expect(prompt).toContain("REQ-001");
      });
    });

    describe("getEstimationPrompt", () => {
      it("should return compiled estimation prompt", () => {
        const context: PromptContext = {
          atomicWorksCatalog: [
            {
              id: "AW-001",
              name: "Test Work",
              baProcess: "test",
              baseHours: 1,
            },
          ],
        };

        const prompt = service.getEstimationPrompt(context);

        expect(prompt).toContain("AW-001");
      });
    });

    describe("getReportingPrompt", () => {
      it("should return compiled reporting prompt", () => {
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
              confidence: "medium" as const,
            },
          ],
        };

        const prompt = service.getReportingPrompt(context);

        expect(prompt).toContain("REQ-001");
      });
    });
  });

  describe("Context Factory Methods", () => {
    describe("createValidationContext", () => {
      it("should create validation context with all fields", () => {
        const discoveredFiles = [
          {
            name: "test.md",
            path: "/test/test.md",
            content: "content",
            type: "md",
          },
        ];

        const context = service.createValidationContext(
          "/input/path",
          discoveredFiles,
        );

        expect(context.inputFolderPath).toBe("/input/path");
        expect(context.discoveredFiles).toEqual(discoveredFiles);
      });
    });

    describe("createExtractionContext", () => {
      it("should create extraction context with stakeholder requirements", () => {
        const context = service.createExtractionContext(
          "Stakeholder requirements content",
        );

        expect(context.stakeholderRequirements).toBe(
          "Stakeholder requirements content",
        );
        expect(context.businessVision).toBeUndefined();
      });

      it("should create extraction context with business vision", () => {
        const context = service.createExtractionContext(
          "Stakeholder requirements content",
          "Business vision content",
        );

        expect(context.stakeholderRequirements).toBe(
          "Stakeholder requirements content",
        );
        expect(context.businessVision).toBe("Business vision content");
      });
    });

    describe("createDecompositionContext", () => {
      it("should create decomposition context with all catalogs", () => {
        const requirements = [
          {
            id: "REQ-001",
            title: "Test Requirement",
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
          { id: "BP-001", name: "Process", category: "test" },
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
        const coefficientsCatalog = [
          { id: "COEF-001", name: "Coefficient", multiplier: 1.5 },
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
        validationResults: {
          status: "valid",
          missingArtifacts: [],
          qualityIssues: [],
          recommendations: [],
          canProceed: true,
        },
      };

      // Use a template that has {{validationResults}}
      const compiled = service.compileTemplate(AgentType.REPORTING, context);

      expect(compiled).toContain("valid");
    });

    it("should convert arrays to JSON strings", () => {
      const context: PromptContext = {
        requirements: [
          {
            id: "REQ-001",
            title: "First",
            description: "First",
            originalText: "First",
            type: "functional" as const,
            acceptanceCriteria: [],
            priority: "medium" as const,
            sourceDocument: "test.md",
          },
          {
            id: "REQ-002",
            title: "Second",
            description: "Second",
            originalText: "Second",
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
      expect(compiled).toContain("REQ-002");
    });

    it("should handle empty context", () => {
      const context: PromptContext = {};

      // Should not throw
      const compiled = service.compileTemplate(AgentType.VALIDATION, context);
      expect(compiled).toBeDefined();
    });

    it("should handle null values in context", () => {
      const context: PromptContext = {
        businessVision: null as unknown as string,
      };

      // Should not throw
      const compiled = service.compileTemplate(AgentType.EXTRACTION, context);
      expect(compiled).toBeDefined();
    });
  });
});
