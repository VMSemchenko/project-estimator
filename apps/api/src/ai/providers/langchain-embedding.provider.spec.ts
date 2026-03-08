import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { LangchainEmbeddingProvider } from "./langchain-embedding.provider";

describe("LangchainEmbeddingProvider", () => {
  let provider: LangchainEmbeddingProvider;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        "zhipuai.apiKey": "test-api-key",
        "zhipuai.baseUrl": "https://api.z.ai/api/paas/v4",
        "zhipuai.embeddingModel": "embedding-3",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangchainEmbeddingProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<LangchainEmbeddingProvider>(
      LangchainEmbeddingProvider,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should be defined", () => {
      expect(provider).toBeDefined();
    });

    it("should get embeddings instance", () => {
      const embeddings = provider.getEmbeddings();
      expect(embeddings).toBeDefined();
    });

    it("should return model name", () => {
      expect(provider.getModelName()).toBe("embedding-3");
    });

    it("should call config service with correct keys", () => {
      expect(mockConfigService.get).toHaveBeenCalledWith("zhipuai.apiKey", {
        infer: true,
      });
      expect(mockConfigService.get).toHaveBeenCalledWith("zhipuai.baseUrl", {
        infer: true,
      });
      expect(mockConfigService.get).toHaveBeenCalledWith(
        "zhipuai.embeddingModel",
        { infer: true },
      );
    });
  });

  describe("embedText", () => {
    it("should call embedQuery on the embeddings instance", async () => {
      const text = "test query";
      const expectedEmbedding = [0.1, 0.2, 0.3];

      // Mock the embedQuery method
      const embeddings = provider.getEmbeddings();
      jest.spyOn(embeddings, "embedQuery").mockResolvedValue(expectedEmbedding);

      const result = await provider.embedText(text);

      expect(result).toEqual(expectedEmbedding);
      expect(embeddings.embedQuery).toHaveBeenCalledWith(text);
    });
  });

  describe("embedTexts", () => {
    it("should call embedDocuments on the embeddings instance", async () => {
      const texts = ["text 1", "text 2"];
      const expectedEmbeddings = [
        [0.1, 0.2],
        [0.3, 0.4],
      ];

      // Mock the embedDocuments method
      const embeddings = provider.getEmbeddings();
      jest
        .spyOn(embeddings, "embedDocuments")
        .mockResolvedValue(expectedEmbeddings);

      const result = await provider.embedTexts(texts);

      expect(result).toEqual(expectedEmbeddings);
      expect(embeddings.embedDocuments).toHaveBeenCalledWith(texts);
    });
  });
});
