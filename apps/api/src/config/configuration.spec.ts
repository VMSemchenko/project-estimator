import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration, { Config, ZhipuAIConfig, MongoDBConfig, LangfuseConfig } from './configuration';

describe('Configuration', () => {
  let configService: ConfigService;

  describe('Default Configuration', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
      expect(configService).toBeDefined();
    });

    it('should load app configuration with defaults', () => {
      const appConfig = configService.get('config.app');
      
      expect(appConfig).toBeDefined();
      // NODE_ENV is 'test' when running Jest, so we check for that
      expect(['development', 'test']).toContain(appConfig?.nodeEnv);
      expect(appConfig?.port).toBe(3000);
    });

    it('should load zhipuai configuration with defaults', () => {
      const zhipuaiConfig = configService.get('config.zhipuai');
      
      expect(zhipuaiConfig).toBeDefined();
      expect(zhipuaiConfig?.baseUrl).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(zhipuaiConfig?.llmModel).toBe('glm-5');
      expect(zhipuaiConfig?.embeddingModel).toBe('embedding-3');
    });

    it('should load mongodb configuration with defaults', () => {
      const mongodbConfig = configService.get('config.mongodb');
      
      expect(mongodbConfig).toBeDefined();
      expect(mongodbConfig?.dbName).toBe('estimator');
      expect(mongodbConfig?.vectorSearchIndex).toBe('vector_index');
    });

    it('should load langfuse configuration with defaults', () => {
      const langfuseConfig = configService.get('config.langfuse');
      
      expect(langfuseConfig).toBeDefined();
      expect(langfuseConfig?.host).toBe('https://cloud.langfuse.com');
      expect(langfuseConfig?.enabled).toBe(false);
    });
  });

  describe('Environment Variable Override', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset modules cache to reload configuration
      jest.resetModules();
      
      // Set custom environment variables
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        PORT: '4000',
        ZHIPUAI_API_KEY: 'test-api-key',
        ZHIPUAI_BASE_URL: 'https://custom.api.com',
        LLM_MODEL: 'custom-model',
        EMBEDDING_MODEL: 'custom-embedding',
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.com/mydb?retryWrites=true',
        VECTOR_SEARCH_INDEX: 'custom_index',
        LANGFUSE_PUBLIC_KEY: 'pk-test',
        LANGFUSE_SECRET_KEY: 'sk-test',
        LANGFUSE_HOST: 'https://custom.langfuse.com',
        LANGFUSE_ENABLED: 'true',
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should override app configuration from environment', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const appConfig = configService.get('config.app');

      expect(appConfig?.nodeEnv).toBe('production');
      expect(appConfig?.port).toBe(4000);
    });

    it('should override zhipuai configuration from environment', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const zhipuaiConfig = configService.get('config.zhipuai');

      expect(zhipuaiConfig?.apiKey).toBe('test-api-key');
      expect(zhipuaiConfig?.baseUrl).toBe('https://custom.api.com');
      expect(zhipuaiConfig?.llmModel).toBe('custom-model');
      expect(zhipuaiConfig?.embeddingModel).toBe('custom-embedding');
    });

    it('should extract database name from MongoDB URI', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const mongodbConfig = configService.get('config.mongodb');

      expect(mongodbConfig?.uri).toBe('mongodb+srv://user:pass@cluster.example.com/mydb?retryWrites=true');
      expect(mongodbConfig?.dbName).toBe('mydb');
    });

    it('should override langfuse configuration from environment', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const langfuseConfig = configService.get('config.langfuse');

      expect(langfuseConfig?.publicKey).toBe('pk-test');
      expect(langfuseConfig?.secretKey).toBe('sk-test');
      expect(langfuseConfig?.host).toBe('https://custom.langfuse.com');
      expect(langfuseConfig?.enabled).toBe(true);
    });
  });

  describe('Configuration Types', () => {
    it('should have correct type for AppConfig', () => {
      const appConfig: { nodeEnv: string; port: number } = {
        nodeEnv: 'test',
        port: 3000,
      };
      
      expect(appConfig.nodeEnv).toBe('test');
      expect(appConfig.port).toBe(3000);
    });

    it('should have correct type for ZhipuAIConfig', () => {
      const zhipuaiConfig: ZhipuAIConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://test.com',
        llmModel: 'test-model',
        embeddingModel: 'test-embedding',
      };
      
      expect(zhipuaiConfig.apiKey).toBe('test-key');
    });

    it('should have correct type for MongoDBConfig', () => {
      const mongodbConfig: MongoDBConfig = {
        uri: 'mongodb://localhost:27017/test',
        dbName: 'test',
        vectorSearchIndex: 'test_index',
      };
      
      expect(mongodbConfig.uri).toBe('mongodb://localhost:27017/test');
    });

    it('should have correct type for LangfuseConfig', () => {
      const langfuseConfig: LangfuseConfig = {
        publicKey: 'pk',
        secretKey: 'sk',
        host: 'https://test.com',
        enabled: true,
      };
      
      expect(langfuseConfig.enabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
      jest.resetModules();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should handle empty MONGODB_URI gracefully', async () => {
      process.env = { ...originalEnv };
      delete process.env.MONGODB_URI;

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const mongodbConfig = configService.get('config.mongodb');

      expect(mongodbConfig?.uri).toBe('');
      expect(mongodbConfig?.dbName).toBe('estimator');
    });

    it('should handle PORT as string', async () => {
      process.env = { ...originalEnv, PORT: '8080' };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const appConfig = configService.get('config.app');

      expect(appConfig?.port).toBe(8080);
      expect(typeof appConfig?.port).toBe('number');
    });

    it('should handle LANGFUSE_ENABLED as string "true"', async () => {
      process.env = { ...originalEnv, LANGFUSE_ENABLED: 'true' };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const langfuseConfig = configService.get('config.langfuse');

      expect(langfuseConfig?.enabled).toBe(true);
    });

    it('should handle LANGFUSE_ENABLED as any other string (false)', async () => {
      process.env = { ...originalEnv, LANGFUSE_ENABLED: 'false' };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
            ignoreEnvFile: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      const langfuseConfig = configService.get('config.langfuse');

      expect(langfuseConfig?.enabled).toBe(false);
    });
  });
});
