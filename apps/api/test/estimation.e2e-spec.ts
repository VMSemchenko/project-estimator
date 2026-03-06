import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EstimationController } from '../src/estimation/estimation.controller';
import { EstimationService } from '../src/estimation/estimation.service';
import { EstimationReport } from '../src/agents/interfaces/agent-state.interface';

describe('Estimation Pipeline (e2e)', () => {
  let app: INestApplication;
  let estimationService: jest.Mocked<EstimationService>;

  const mockEstimationService = {
    createEstimation: jest.fn(),
    getEstimation: jest.fn(),
    getAllEstimations: jest.fn(),
    deleteEstimation: jest.fn(),
    runEstimationPipeline: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EstimationController],
      providers: [
        {
          provide: EstimationService,
          useValue: mockEstimationService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    estimationService = moduleFixture.get(EstimationService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /estimate', () => {
    it('should create a new estimation job', () => {
      const createDto = {
        inputFolder: '/test/input',
      };

      const mockResponse = {
        jobId: 'job-123',
        status: 'pending' as const,
        message: 'Estimation job created',
        createdAt: new Date().toISOString(),
      };

      mockEstimationService.createEstimation.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .post('/estimate')
        .send(createDto)
        .expect(202)
        .expect((res) => {
          expect(res.body.jobId).toBe('job-123');
          expect(res.body.status).toBe('pending');
        });
    });

    it('should accept request without input folder (uses default)', () => {
      return request(app.getHttpServer())
        .post('/estimate')
        .send({})
        .expect(202);
    });

    it('should accept empty input folder (uses default)', () => {
      const createDto = {
        inputFolder: '',
      };

      return request(app.getHttpServer())
        .post('/estimate')
        .send(createDto)
        .expect(202);
    });
  });

  describe('GET /estimate/:id', () => {
    it('should return estimation status and results', () => {
      const mockReport: EstimationReport = {
        timestamp: new Date().toISOString(),
        inputFolder: '/test/input',
        totalHours: 25.5,
        summaryByProcess: [
          {
            processId: 'requirements-analysis',
            processName: 'Requirements Analysis',
            totalHours: 15,
            workCount: 5,
          },
        ],
        summaryByRequirement: [
          {
            requirementId: 'REQ-001',
            requirementTitle: 'User Authentication',
            totalHours: 10,
            workCount: 3,
          },
        ],
        estimates: [],
        markdownContent: '# Report',
        csvContent: 'csv,data',
      };

      const mockResponse = {
        jobId: 'job-123',
        status: 'completed' as const,
        report: mockReport,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      mockEstimationService.getEstimation.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .get('/estimate/job-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.jobId).toBe('job-123');
          expect(res.body.status).toBe('completed');
          expect(res.body.report).toBeDefined();
          expect(res.body.report.totalHours).toBe(25.5);
        });
    });

    it('should return pending status for running job', () => {
      const mockResponse = {
        jobId: 'job-456',
        status: 'processing' as const,
        currentStep: 'extraction',
        createdAt: new Date().toISOString(),
      };

      mockEstimationService.getEstimation.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .get('/estimate/job-456')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('processing');
          expect(res.body.currentStep).toBe('extraction');
        });
    });

    it('should return empty object for non-existent job', () => {
      mockEstimationService.getEstimation.mockResolvedValue(null as any);

      return request(app.getHttpServer())
        .get('/estimate/non-existent')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({});
        });
    });

    it('should return error status for failed job', () => {
      const mockResponse = {
        jobId: 'job-789',
        status: 'failed' as const,
        error: 'Validation failed: Missing required documents',
        createdAt: new Date().toISOString(),
      };

      mockEstimationService.getEstimation.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .get('/estimate/job-789')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('failed');
          expect(res.body.error).toContain('Validation failed');
        });
    });
  });

  describe('GET /estimate', () => {
    it('should return all estimation jobs', () => {
      const mockResponse = [
        {
          jobId: 'job-1',
          status: 'completed' as const,
          createdAt: new Date().toISOString(),
        },
        {
          jobId: 'job-2',
          status: 'processing' as const,
          createdAt: new Date().toISOString(),
        },
      ];

      mockEstimationService.getAllEstimations.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .get('/estimate')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
        });
    });

    it('should return empty array when no jobs exist', () => {
      mockEstimationService.getAllEstimations.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/estimate')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(0);
        });
    });
  });

  describe('DELETE /estimate/:id', () => {
    it('should return 404 (DELETE endpoint not implemented)', () => {
      mockEstimationService.deleteEstimation.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete('/estimate/job-123')
        .expect(404);
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should run complete estimation pipeline', async () => {
      // This test simulates the full pipeline flow
      const createDto = {
        inputFolder: '/test/input/sample-project',
      };

      const createResponse = {
        jobId: 'pipeline-test',
        status: 'pending' as const,
        message: 'Estimation job created',
        createdAt: new Date().toISOString(),
      };

      mockEstimationService.createEstimation.mockResolvedValue(createResponse);

      // Step 1: Create estimation
      const createResult = await request(app.getHttpServer())
        .post('/estimate')
        .send(createDto)
        .expect(202);

      expect(createResult.body.jobId).toBe('pipeline-test');

      // Step 2: Poll for completion (simulated)
      const completedResponse = {
        jobId: 'pipeline-test',
        status: 'completed' as const,
        report: {
          timestamp: new Date().toISOString(),
          inputFolder: '/test/input/sample-project',
          totalHours: 45.5,
          summaryByProcess: [
            {
              processId: 'requirements-analysis',
              processName: 'Requirements Analysis',
              totalHours: 20,
              workCount: 8,
            },
            {
              processId: 'documentation',
              processName: 'Documentation',
              totalHours: 15,
              workCount: 5,
            },
            {
              processId: 'stakeholder-management',
              processName: 'Stakeholder Management',
              totalHours: 10.5,
              workCount: 3,
            },
          ],
          summaryByRequirement: [
            {
              requirementId: 'REQ-001',
              requirementTitle: 'User Authentication',
              totalHours: 15,
              workCount: 5,
            },
            {
              requirementId: 'REQ-002',
              requirementTitle: 'Product Catalog',
              totalHours: 12,
              workCount: 4,
            },
            {
              requirementId: 'REQ-003',
              requirementTitle: 'Shopping Cart',
              totalHours: 10,
              workCount: 3,
            },
            {
              requirementId: 'REQ-004',
              requirementTitle: 'Payment Processing',
              totalHours: 8.5,
              workCount: 4,
            },
          ],
          estimates: [],
          markdownContent: '# BA Work Estimation Report\n\n## Summary\nTotal: 45.5 hours',
          csvContent: 'requirement,hours\nREQ-001,15\nREQ-002,12',
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      mockEstimationService.getEstimation.mockResolvedValue(completedResponse);

      // Step 3: Get results
      const getResult = await request(app.getHttpServer())
        .get('/estimate/pipeline-test')
        .expect(200);

      expect(getResult.body.status).toBe('completed');
      expect(getResult.body.report.totalHours).toBe(45.5);
      expect(getResult.body.report.summaryByProcess).toHaveLength(3);
      expect(getResult.body.report.summaryByRequirement).toHaveLength(4);
    });

    it('should handle pipeline validation failure', async () => {
      const createDto = {
        inputFolder: '/test/input/invalid-project',
      };

      const createResponse = {
        jobId: 'validation-fail',
        status: 'pending' as const,
        message: 'Estimation job created',
        createdAt: new Date().toISOString(),
      };

      mockEstimationService.createEstimation.mockResolvedValue(createResponse);

      await request(app.getHttpServer())
        .post('/estimate')
        .send(createDto)
        .expect(202);

      // Simulate validation failure
      const failedResponse = {
        jobId: 'validation-fail',
        status: 'failed' as const,
        error: 'Validation failed: Missing required documents (ShRD)',
        createdAt: new Date().toISOString(),
      };

      mockEstimationService.getEstimation.mockResolvedValue(failedResponse);

      const result = await request(app.getHttpServer())
        .get('/estimate/validation-fail')
        .expect(200);

      expect(result.body.status).toBe('failed');
      expect(result.body.error).toContain('Missing required documents');
    });
  });
});
