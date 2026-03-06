import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { MongodbStore } from './vectorstore/mongodb.store';
import { LangchainEmbeddingProvider } from '../ai/providers/langchain-embedding.provider';
import { LangfuseService } from '../ai/langfuse/langfuse.service';
import { RetrievedDocument } from './interfaces/retrieved-document.interface';

describe('RagService', () => {
  let service: RagService;
  let mongodbStore: jest.Mocked<MongodbStore>;
  let embeddingProvider: jest.Mocked<LangchainEmbeddingProvider>;
  let langfuseService: jest.Mocked<LangfuseService>;

  const mockMongodbStore = {
    similaritySearch: jest.fn(),
    similaritySearchVectorWithScore: jest.fn(),
    addDocuments: jest.fn(),
    deleteDocuments: jest.fn(),
    getDocumentCount: jest.fn(),
  };

  const mockEmbeddingProvider = {
    embedText: jest.fn(),
    embedTexts: jest.fn(),
  };

  const mockLangfuseService = {
    createTrace: jest.fn().mockReturnValue({
      update: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: MongodbStore,
          useValue: mockMongodbStore,
        },
        {
          provide: LangchainEmbeddingProvider,
          useValue: mockEmbeddingProvider,
        },
        {
          provide: LangfuseService,
          useValue: mockLangfuseService,
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    mongodbStore = module.get(MongodbStore);
    embeddingProvider = module.get(LangchainEmbeddingProvider);
    langfuseService = module.get(LangfuseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('similaritySearch', () => {
    it('should retrieve relevant documents', async () => {
      const query = 'user authentication requirements';
      const mockResults = [
        { content: 'REQ-001: User Authentication', score: 0.95, metadata: { type: 'requirement' } },
        { content: 'REQ-002: Login with OAuth', score: 0.85, metadata: { type: 'requirement' } },
      ];

      mockMongodbStore.similaritySearch.mockResolvedValue(mockResults);

      const result = await service.similaritySearch(query);

      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].content).toBe('REQ-001: User Authentication');
      expect(result.documents[0].score).toBe(0.95);
      expect(result.query).toBe(query);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mongodbStore.similaritySearch).toHaveBeenCalledWith(query, 4, undefined);
    });

    it('should apply score threshold filter', async () => {
      const query = 'payment processing';
      const mockResults = [
        { content: 'Payment with Stripe', score: 0.95, metadata: {} },
        { content: 'Payment with PayPal', score: 0.65, metadata: {} },
        { content: 'Payment with Apple Pay', score: 0.45, metadata: {} },
      ];

      mockMongodbStore.similaritySearch.mockResolvedValue(mockResults);

      const result = await service.similaritySearch(query, { scoreThreshold: 0.7 });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].score).toBeGreaterThanOrEqual(0.7);
    });

    it('should pass filter options to store', async () => {
      const query = 'requirements';
      const filter = { type: 'functional' };

      mockMongodbStore.similaritySearch.mockResolvedValue([]);

      await service.similaritySearch(query, { filter });

      expect(mongodbStore.similaritySearch).toHaveBeenCalledWith(query, 4, filter);
    });

    it('should use custom k value', async () => {
      const query = 'architecture';

      mockMongodbStore.similaritySearch.mockResolvedValue([]);

      await service.similaritySearch(query, { k: 10 });

      expect(mongodbStore.similaritySearch).toHaveBeenCalledWith(query, 10, undefined);
    });

    it('should handle errors gracefully', async () => {
      const query = 'test query';
      const error = new Error('Database connection failed');

      mockMongodbStore.similaritySearch.mockRejectedValue(error);

      await expect(service.similaritySearch(query)).rejects.toThrow('Database connection failed');
    });
  });

  describe('similaritySearchVector', () => {
    it('should search using pre-computed embedding', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4];
      const mockResults = [
        { content: 'Document 1', score: 0.9, metadata: {} },
        { content: 'Document 2', score: 0.8, metadata: {} },
      ];

      mockMongodbStore.similaritySearchVectorWithScore.mockResolvedValue(mockResults);

      const result = await service.similaritySearchVector(embedding);

      expect(result.documents).toHaveLength(2);
      expect(mongodbStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
        embedding,
        4,
        undefined
      );
    });

    it('should apply score threshold to vector search', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const mockResults = [
        { content: 'High score doc', score: 0.95, metadata: {} },
        { content: 'Low score doc', score: 0.3, metadata: {} },
      ];

      mockMongodbStore.similaritySearchVectorWithScore.mockResolvedValue(mockResults);

      const result = await service.similaritySearchVector(embedding, { scoreThreshold: 0.5 });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].score).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('addDocuments', () => {
    it('should add documents to vector store', async () => {
      const texts = ['Document 1 content', 'Document 2 content'];
      const metadatas = [{ type: 'req' }, { type: 'arch' }];
      const mockIds = ['id1', 'id2'];

      mockMongodbStore.addDocuments.mockResolvedValue(mockIds);

      const result = await service.addDocuments(texts, metadatas);

      expect(result).toEqual(mockIds);
      expect(mongodbStore.addDocuments).toHaveBeenCalledWith(texts, metadatas, undefined);
    });

    it('should add documents with custom ids', async () => {
      const texts = ['Document content'];
      const ids = ['custom-id-1'];

      mockMongodbStore.addDocuments.mockResolvedValue(ids);

      const result = await service.addDocuments(texts, undefined, ids);

      expect(result).toEqual(ids);
      expect(mongodbStore.addDocuments).toHaveBeenCalledWith(texts, undefined, ids);
    });
  });

  describe('deleteDocuments', () => {
    it('should delete documents from vector store', async () => {
      const ids = ['id1', 'id2'];

      mockMongodbStore.deleteDocuments.mockResolvedValue(true);

      const result = await service.deleteDocuments(ids);

      expect(result).toBe(true);
      expect(mongodbStore.deleteDocuments).toHaveBeenCalledWith(ids);
    });
  });

  describe('getEmbedding', () => {
    it('should get embedding for a single text', async () => {
      const text = 'test text';
      const mockEmbedding = [0.1, 0.2, 0.3];

      mockEmbeddingProvider.embedText.mockResolvedValue(mockEmbedding);

      const result = await service.getEmbedding(text);

      expect(result).toEqual(mockEmbedding);
      expect(embeddingProvider.embedText).toHaveBeenCalledWith(text);
    });
  });

  describe('getEmbeddings', () => {
    it('should get embeddings for multiple texts', async () => {
      const texts = ['text 1', 'text 2'];
      const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];

      mockEmbeddingProvider.embedTexts.mockResolvedValue(mockEmbeddings);

      const result = await service.getEmbeddings(texts);

      expect(result).toEqual(mockEmbeddings);
      expect(embeddingProvider.embedTexts).toHaveBeenCalledWith(texts);
    });
  });

  describe('getDocumentCount', () => {
    it('should return document count', async () => {
      mockMongodbStore.getDocumentCount.mockResolvedValue(100);

      const result = await service.getDocumentCount();

      expect(result).toBe(100);
    });
  });

  describe('formatDocumentsForContext', () => {
    it('should format documents with metadata', () => {
      const documents: RetrievedDocument[] = [
        {
          id: 'doc_1',
          content: 'This is the first document content.',
          score: 0.95,
          metadata: { type: 'requirement', priority: 'high' },
        },
        {
          id: 'doc_2',
          content: 'This is the second document content.',
          score: 0.85,
          metadata: { type: 'architecture' },
        },
      ];

      const result = service.formatDocumentsForContext(documents);

      expect(result).toContain('[Document 1]');
      expect(result).toContain('type: requirement, priority: high');
      expect(result).toContain('This is the first document content.');
      expect(result).toContain('[Document 2]');
      expect(result).toContain('type: architecture');
      expect(result).toContain('This is the second document content.');
    });

    it('should return empty string for empty documents array', () => {
      const result = service.formatDocumentsForContext([]);

      expect(result).toBe('');
    });

    it('should handle documents without metadata', () => {
      const documents: RetrievedDocument[] = [
        {
          id: 'doc_1',
          content: 'Simple content',
          score: 0.9,
          metadata: {},
        },
      ];

      const result = service.formatDocumentsForContext(documents);

      expect(result).toContain('[Document 1]');
      expect(result).toContain('Simple content');
      expect(result).not.toContain('()');
    });
  });
});
