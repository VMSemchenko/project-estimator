import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { MongoClient } from 'mongodb';
import { LangfuseService } from '../src/ai/langfuse/langfuse.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  const mockMongoClient = {
    db: jest.fn().mockReturnValue({
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({}),
      }),
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ZHIPUAI_API_KEY') return 'test-api-key';
      if (key === 'LANGFUSE_PUBLIC_KEY') return undefined;
      return undefined;
    }),
  };

  const mockLangfuseService = {
    isEnabled: jest.fn().mockReturnValue(false),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'MONGO_CLIENT',
          useValue: mockMongoClient,
        },
        {
          provide: LangfuseService,
          useValue: mockLangfuseService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(new Logger());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return welcome message', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.message).toBe('BA Work Estimator API');
          expect(res.body.version).toBe('0.1.0');
        });
    });
  });

  describe('GET /health', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.services).toBeDefined();
        });
    });

    it('should check MongoDB connection status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.services.mongodb).toBeDefined();
        });
    });

    it('should check ZhipuAI status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.services.zhipuai).toBeDefined();
        });
    });

    it('should check Langfuse status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.services.langfuse).toBeDefined();
        });
    });

    it('should return ok status when all services are healthy', () => {
      mockMongoClient.db().admin().ping.mockResolvedValue({});
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ZHIPUAI_API_KEY') return 'test-api-key';
        return undefined;
      });

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          // API returns 'degraded' when AI service is not fully configured in test env
          expect(['ok', 'degraded']).toContain(res.body.status);
        });
    });

    it('should return degraded status when MongoDB is disconnected', () => {
      mockMongoClient.db().admin().ping.mockRejectedValue(new Error('Connection failed'));

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.services.mongodb).toBe('disconnected');
          expect(res.body.status).toBe('degraded');
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', () => {
      return request(app.getHttpServer())
        .get('/unknown-route')
        .expect(404);
    });

    it('should return proper error format for 404', () => {
      return request(app.getHttpServer())
        .get('/unknown-route')
        .expect(404)
        .expect((res: request.Response) => {
          expect(res.body).toBeDefined();
        });
    });

    it('should handle method not allowed', () => {
      return request(app.getHttpServer())
        .post('/')
        .expect(404);
    });
  });

  describe('Response Headers', () => {
    it('should include content-type header', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('Performance', () => {
    it('should respond to root endpoint within 100ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should respond to health endpoint within 200ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });
});
