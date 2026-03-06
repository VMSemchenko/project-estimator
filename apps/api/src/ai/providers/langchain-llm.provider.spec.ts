import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangchainLLMProvider } from './langchain-llm.provider';

describe('LangchainLLMProvider', () => {
  let provider: LangchainLLMProvider;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'zhipuai.apiKey': 'test-api-key',
        'zhipuai.baseUrl': 'https://open.bigmodel.cn/api/paas/v4',
        'zhipuai.llmModel': 'glm-5',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangchainLLMProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<LangchainLLMProvider>(LangchainLLMProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(provider).toBeDefined();
    });

    it('should get chat model', () => {
      const chatModel = provider.getChatModel();
      expect(chatModel).toBeDefined();
    });

    it('should return model name', () => {
      expect(provider.getModelName()).toBe('glm-5');
    });

    it('should call config service with correct keys', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('zhipuai.apiKey', { infer: true });
      expect(mockConfigService.get).toHaveBeenCalledWith('zhipuai.baseUrl', { infer: true });
      expect(mockConfigService.get).toHaveBeenCalledWith('zhipuai.llmModel', { infer: true });
    });
  });

  describe('chat model configuration', () => {
    it('should create chat model with correct configuration', () => {
      const chatModel = provider.getChatModel();
      
      // Verify the model is configured with the right parameters
      expect(chatModel.modelName).toBe('glm-5');
    });
  });
});
