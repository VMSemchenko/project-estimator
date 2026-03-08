# Design Document: BA Work AI Evaluation System

## Overview

The BA Work AI Evaluation System is a multi-agent RAG (Retrieval-Augmented Generation) application that automates Business Analyst work estimation during the Discovery phase. The system analyzes Discovery artifacts (Business Vision, Stakeholder Requirements, and optional supporting documents) and generates detailed effort estimates using a LangGraph state machine with PERT methodology.

### Core Capabilities

- Reads Discovery artifacts from a specified folder (TXT, MD, CSV, PDF formats)
- Validates input sufficiency before estimation
- Extracts and normalizes requirements from Stakeholder Requirements Document
- Decomposes requirements into atomic BA works (concrete actions like writing user stories, creating diagrams, conducting interviews)
- Maps atomic works to 35 standard BA processes from BABOK for classification and reporting
- Applies complexity coefficients based on project context
- Calculates PERT estimates (Optimistic, Most-likely, Pessimistic)
- Generates comprehensive markdown reports with RAID context
- Produces CSV breakdowns for detailed analysis
- Supports descoping through requirement-level breakdown
- Provides full observability of agent execution via Langfuse

### Key Design Principles

1. **Data Sufficiency Over Guessing**: System refuses to estimate when input is insufficient rather than producing unreliable results
2. **Traceability**: All intermediate results are preserved; reports show which inputs influenced the estimate
3. **Modularity**: LangGraph state machine with specialized nodes for each phase
4. **Transparency**: Detailed breakdowns by requirement, atomic work, and BA process
5. **Evolvability**: Reference catalogs (atomic works, coefficients) are external YAML files, updatable without code changes
6. **Observability**: Comprehensive metrics and tracing for all agent operations via Langfuse

### Target Environment

- **Operating System**: Cross-platform (macOS, Linux, Windows)
- **Interface**: Command-line and REST API
- **Language Support**: Ukrainian and English

---

## Technology Stack

### Core Framework and Orchestration

**NestJS** (v10.4+)

- **Purpose**: Application framework with dependency injection
- **Usage**: Module structure, services, controllers, and CLI integration
- **Key Features**:
  - Modular architecture with `@Module` decorators
  - Dependency injection via `@Injectable`
  - Configuration management with `@nestjs/config`
  - CLI integration via NestJS application context

**LangChain.js** (v0.3+)

- **Purpose**: LLM integration and tool abstraction
- **Usage**: Chat models, embeddings, document loaders, and vector stores
- **Key Features**:
  - OpenAI-compatible chat model interface
  - Document loaders for various formats
  - Vector store abstractions
  - Tool and agent primitives

**LangGraph** (v0.2+)

- **Purpose**: Multi-agent orchestration via state machine
- **Usage**: Defines and coordinates 5 specialized agent nodes in a directed graph
- **Key Features**:
  - StateGraph for defining agent workflows
  - Conditional edges for dynamic routing
  - State annotation and management
  - Error handling and recovery

### Language Model Integration

**ZhipuAI GLM-5** (OpenAI-compatible API)

- **Purpose**: Power AI agents for requirements analysis, decomposition, and estimation
- **Usage**: All 5 agent nodes use LLM for natural language understanding and reasoning
- **Configuration**:
  - Requires `ZHIPUAI_API_KEY` environment variable
  - Base URL: `https://api.z.ai/api/paas/v4`
  - Model: `glm-5` for production
  - Embedding Model: `embedding-2` or `embedding-3`
- **Integration**: Via `@langchain/openai` ChatOpenAI class with custom baseURL

### Vector Search and Database

**MongoDB Atlas**

- **Purpose**: Document storage and vector search
- **Usage**: Store and retrieve catalog items via semantic similarity
- **Key Features**:
  - MongoDB Atlas Vector Search
  - Atlas Vector Search Index
  - Similarity search with metadata filtering

**@langchain/mongodb**

- **Purpose**: MongoDB vector store integration for LangChain
- **Usage**: Store and query document embeddings
- **Configuration**:
  - Collection name for vector storage
  - Vector search index name

### Observability and Tracing

**Langfuse** (v3.0+)

- **Purpose**: LLM observability and tracing platform
- **Usage**: Automatic tracking of agent execution, token usage, and performance metrics
- **Key Features**:
  - `@observe()` decorator for automatic function tracing
  - Token usage tracking (input/output per agent)
  - Execution timeline and bottleneck identification
  - Error traces with stack information
  - LangChain integration via `langfuse-langchain`
- **Configuration**: Requires `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` environment variables

### Data Processing

**YAML** (yaml v2.7+)

- **Purpose**: Parse and validate reference catalogs
- **Usage**: Load atomic works, BA processes, and coefficients from YAML files

**pdf-parse** (v1.1+)

- **Purpose**: Extract text from PDF documents
- **Usage**: Read PDF discovery artifacts

**Commander.js** (v12.0+)

- **Purpose**: CLI argument parsing
- **Usage**: Handle command-line options for estimate and catalog commands

### Testing Framework

**Jest** (v29+)

- **Purpose**: Unit and integration testing framework
- **Usage**: Test runner for all test suites
- **Configuration**: Via `jest` key in package.json

**Supertest** (v7+)

- **Purpose**: HTTP assertion testing
- **Usage**: E2E testing of REST API endpoints

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NestJS Application                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        LangGraph State Machine                        │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                       │    │
│  │   ┌────────────┐    ┌────────────┐    ┌────────────┐                │    │
│  │   │ Validation │───▶│ Extraction │───▶│Decompositio│                │    │
│  │   │    Node    │    │    Node    │    │    Node    │                │    │
│  │   └────────────┘    └────────────┘    └─────┬──────┘                │    │
│  │         │                 │                  │                        │    │
│  │         ▼                 ▼                  ▼                        │    │
│  │   ┌─────────────────────────────────────────────────────────────┐    │    │
│  │   │                     Shared RAG Context                       │    │    │
│  │   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │    │
│  │   │   │Atomic Works │  │BA Processes │  │Coefficients │         │    │    │
│  │   │   │   Catalog   │  │   Catalog   │  │   Catalog   │         │    │    │
│  │   │   └─────────────┘  └─────────────┘  └─────────────┘         │    │    │
│  │   └─────────────────────────────────────────────────────────────┘    │    │
│  │                              │                                        │    │
│  │                              ▼                                        │    │
│  │                       ┌────────────┐                                 │    │
│  │                       │ Estimation │                                 │    │
│  │                       │    Node    │                                 │    │
│  │                       └─────┬──────┘                                 │    │
│  │                             │                                         │    │
│  │                             ▼                                         │    │
│  │                       ┌────────────┐                                 │    │
│  │                       │ Reporting  │                                 │    │
│  │                       │    Node    │                                 │    │
│  │                       └────────────┘                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │   REST API       │  │   CLI Commands   │  │   RAG Service    │           │
│  │   Controller     │  │   (Commander)    │  │   (Vector Store) │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │   LLM Provider   │  │   Embedding      │  │   Langfuse       │           │
│  │   (ZhipuAI)      │  │   Provider       │  │   Service        │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────┐
                        │   MongoDB Atlas  │
                        │   (Vector Store) │
                        └──────────────────┘
```

### Multi-Agent Pipeline

The system uses a LangGraph state machine to orchestrate 5 specialized agent nodes:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Validation │────▶│  Extraction │────▶│Decomposition│────▶│  Estimation │────▶│  Reporting  │
│    Agent    │     │    Agent    │     │    Agent    │     │    Agent    │     │    Agent    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Validate   │     │  Extract &  │     │  Decompose  │     │  Calculate  │     │  Generate   │
│  input      │     │  normalize  │     │  into       │     │  PERT       │     │  Markdown   │
│  artifacts  │     │  require-   │     │  atomic     │     │  estimates  │     │  & CSV      │
│  (BV+ShRD)  │     │  ments      │     │  works      │     │  with       │     │  reports    │
│             │     │             │     │             │     │  coeff's    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Agent Node Descriptions

#### 1. Validation Node

- **Purpose**: Verify input data sufficiency
- **Input**: Folder path with discovery artifacts
- **Output**: Validation status and available artifacts list
- **Behavior**: Returns error if required files (BV, ShRD) are missing

#### 2. Extraction Node

- **Purpose**: Extract and normalize requirements from ShRD
- **Input**: Validated discovery artifacts
- **Output**: Structured requirements list with unique IDs
- **Behavior**: Identifies functional and non-functional requirements

#### 3. Decomposition Node

- **Purpose**: Break requirements into atomic BA works
- **Input**: Structured requirements
- **Output**: Atomic works mapped to BA processes
- **Behavior**: Uses RAG to retrieve relevant atomic works from catalog

#### 4. Estimation Node

- **Purpose**: Calculate PERT estimates with coefficients
- **Input**: Atomic works with process mappings
- **Output**: Hours estimates (O, M, P) per atomic work
- **Behavior**: Applies complexity coefficients from catalog

#### 5. Reporting Node

- **Purpose**: Generate final reports
- **Input**: Complete estimation data
- **Output**: Markdown report and CSV breakdown
- **Behavior**: Formats results with RAID context

---

## Project Structure

```
apps/api/src/
├── main.ts                        # NestJS entry point
├── app.module.ts                  # Root module
├── app.controller.ts              # Basic API controller (/, /health, /config)
│
├── agents/                        # Multi-agent system
│   ├── agents.module.ts
│   ├── graph/                     # LangGraph orchestration
│   │   ├── estimation.graph.ts    # Graph definition and factory
│   │   ├── state.ts               # State annotation and types
│   │   └── edges.ts               # Conditional edge functions
│   ├── nodes/                     # Agent node implementations
│   │   ├── validation.node.ts
│   │   ├── extraction.node.ts
│   │   ├── decomposition.node.ts
│   │   ├── estimation.node.ts
│   │   └── reporting.node.ts
│   ├── interfaces/                # Type definitions
│   │   ├── agent.interface.ts
│   │   ├── agent-state.interface.ts
│   │   └── agent-result.interface.ts
│   └── errors/                    # Agent error handling
│       └── llm-error.ts
│
├── ai/                            # AI/LLM integration
│   ├── ai.module.ts
│   ├── providers/                 # LLM and embedding providers
│   │   ├── langchain-llm.provider.ts
│   │   └── langchain-embedding.provider.ts
│   └── langfuse/                  # Observability service
│       └── langfuse.service.ts
│
├── catalogs/                      # Reference catalogs
│   ├── catalogs.module.ts
│   ├── catalogs.service.ts
│   ├── interfaces/
│   │   ├── atomic-work.interface.ts
│   │   ├── ba-process.interface.ts
│   │   └── coefficient.interface.ts
│   └── loaders/                   # YAML catalog loaders
│       ├── atomic-works.loader.ts
│       ├── ba-processes.loader.ts
│       └── coefficients.loader.ts
│
├── cli/                           # CLI commands
│   ├── index.ts                   # Commander entry point
│   ├── commands/
│   │   ├── estimate.command.ts    # estimate <folder>
│   │   └── catalog.command.ts     # catalog index/status
│   └── utils/
│       ├── logger.ts
│       ├── output-writer.ts
│       └── progress.ts
│
├── config/                        # Configuration
│   └── configuration.ts           # Environment-based config
│
├── database/                      # Database module
│   └── database.module.ts         # MongoDB client provider
│
├── estimation/                    # Estimation service & API
│   ├── estimation.module.ts
│   ├── estimation.service.ts
│   ├── estimation.controller.ts
│   ├── dto/
│   │   ├── create-estimation.dto.ts
│   │   └── estimation-response.dto.ts
│   └── interfaces/
│       └── estimation-job.interface.ts
│
├── observability/                 # Metrics and tracing
│   ├── observability.module.ts
│   ├── metrics.service.ts
│   └── tracing.service.ts
│
├── prompts/                       # Agent prompt templates
│   ├── prompts.module.ts
│   ├── prompts.service.ts
│   └── templates/
│       ├── validation-agent.md
│       ├── extraction-agent.md
│       ├── decomposition-agent.md
│       ├── estimation-agent.md
│       └── reporting-agent.md
│
├── rag/                           # RAG pipeline
│   ├── rag.module.ts
│   ├── rag.service.ts
│   ├── interfaces/
│   │   └── retrieved-document.interface.ts
│   └── vectorstore/
│       └── mongodb.store.ts
│
├── tools/                         # Agent tools
│   ├── tools.module.ts
│   ├── interfaces/
│   │   └── tool.interface.ts
│   └── implementations/
│       ├── file-reader.tool.ts
│       ├── pdf-reader.tool.ts
│       └── catalog-retriever.tool.ts
│
└── common/                        # Shared utilities
    └── middleware/
        └── http-exception.filter.ts
```

---

## LangGraph State Machine

### State Definition

```typescript
// state.ts
import { Annotation } from "@langchain/langgraph";

export const EstimationStateAnnotation = Annotation.Root({
  // Input
  inputFolder: Annotation<string>,
  catalogSet: Annotation<string>,

  // Validation results
  validationPassed: Annotation<boolean>,
  availableArtifacts: Annotation<string[]>,

  // Extraction results
  requirements: Annotation<Requirement[]>,

  // Decomposition results
  atomicWorks: Annotation<AtomicWorkAssignment[]>,

  // Estimation results
  estimates: Annotation<Estimate[]>,
  totalHours: Annotation<number>,

  // Reporting results
  estimationReport: Annotation<string>,
  detailedBreakdown: Annotation<string>,

  // Execution tracking
  currentStep: Annotation<string>,
  errors: Annotation<EstimationError[]>,
  shouldStop: Annotation<boolean>,
});
```

### Graph Definition

```typescript
// estimation.graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";

export function createEstimationGraph(dependencies: AgentDependencies) {
  const workflow = new StateGraph(EstimationStateAnnotation);

  // Add nodes
  workflow.addNode(
    "validation",
    wrapNodeExecution(new ValidationNode(dependencies), "validation"),
  );
  workflow.addNode(
    "extraction",
    wrapNodeExecution(new ExtractionNode(dependencies), "extraction"),
  );
  workflow.addNode(
    "decomposition",
    wrapNodeExecution(new DecompositionNode(dependencies), "decomposition"),
  );
  workflow.addNode(
    "estimation",
    wrapNodeExecution(new EstimationNode(dependencies), "estimation"),
  );
  workflow.addNode(
    "reporting",
    wrapNodeExecution(new ReportingNode(dependencies), "reporting"),
  );

  // Add edges
  workflow.addEdge(START, "validation");
  workflow.addConditionalEdges("validation", shouldContinueAfterValidation);
  workflow.addConditionalEdges("extraction", shouldContinueAfterExtraction);
  workflow.addConditionalEdges(
    "decomposition",
    shouldContinueAfterDecomposition,
  );
  workflow.addConditionalEdges("estimation", shouldContinueAfterEstimation);
  workflow.addEdge("reporting", END);

  return workflow.compile();
}
```

### Conditional Edges

```typescript
// edges.ts
export function shouldContinueAfterValidation(state: GraphState): string {
  if (state.shouldStop) return END;
  if (!state.validationPassed) return END;
  return "extraction";
}

export function shouldContinueAfterExtraction(state: GraphState): string {
  if (state.shouldStop) return END;
  if (!state.requirements?.length) return END;
  return "decomposition";
}

export function shouldContinueAfterDecomposition(state: GraphState): string {
  if (state.shouldStop) return END;
  if (!state.atomicWorks?.length) return END;
  return "estimation";
}

export function shouldContinueAfterEstimation(state: GraphState): string {
  if (state.shouldStop) return END;
  return "reporting";
}
```

---

## RAG Pipeline

### Vector Store Configuration

```typescript
// mongodb.store.ts
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";

export async function createVectorStore(
  client: MongoClient,
  embeddings: Embeddings,
  collectionName: string = "catalogs",
  indexName: string = "vector_index",
): Promise<MongoDBAtlasVectorSearch> {
  const db = client.db();
  const collection = db.collection(collectionName);

  return new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName,
    textKey: "text",
    embeddingKey: "embedding",
  });
}
```

### Catalog Indexing

```typescript
// catalogs.service.ts
async indexCatalogs(catalogSet: string): Promise<void> {
  const atomicWorks = await this.loadAtomicWorks(catalogSet);
  const baProcesses = await this.loadBAProcesses(catalogSet);
  const coefficients = await this.loadCoefficients(catalogSet);

  // Create documents with metadata
  const documents = [
    ...atomicWorks.map(aw => ({
      pageContent: `${aw.name}: ${aw.description}`,
      metadata: { docType: 'atomic_work', catalogSet, id: aw.id, name: aw.name }
    })),
    ...baProcesses.map(bp => ({
      pageContent: `${bp.name}: ${bp.description}`,
      metadata: { docType: 'ba_process', catalogSet, id: bp.id, name: bp.name }
    })),
    ...coefficients.map(c => ({
      pageContent: `${c.name}: ${c.description}`,
      metadata: { docType: 'coefficient', catalogSet, id: c.id, name: c.name, value: c.value }
    })),
  ];

  // Add to vector store
  await this.vectorStore.addDocuments(documents);
}
```

### Similarity Search

```typescript
// rag.service.ts
async retrieveRelevantDocuments(query: string, catalogSet: string, k: number = 5): Promise<RetrievedDocument[]> {
  const results = await this.vectorStore.similaritySearch(query, k, {
    preFilter: { catalogSet }
  });

  return results.map(doc => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    score: doc.metadata.score
  }));
}
```

---

## REST API

### Endpoints

| Method   | Endpoint               | Description                       |
| -------- | ---------------------- | --------------------------------- |
| `GET`    | `/`                    | API info and version              |
| `GET`    | `/health`              | Health check with service status  |
| `GET`    | `/config`              | Current configuration             |
| `POST`   | `/estimate`            | Create new estimation job         |
| `GET`    | `/estimate`            | List all estimation jobs          |
| `GET`    | `/estimate/:id`        | Get estimation status and results |
| `GET`    | `/estimate/:id/report` | Get estimation report             |
| `DELETE` | `/estimate/:id`        | Delete estimation job             |

### Request/Response Examples

**POST /estimate**

```json
// Request
{
  "inputFolder": "./discovery/project-alpha",
  "outputFolder": "./reports/project-alpha",
  "catalogSet": "demo"
}

// Response (202 Accepted)
{
  "id": "est-20260308-abc123",
  "status": "processing",
  "createdAt": "2026-03-08T20:00:00Z",
  "links": {
    "self": "/estimate/est-20260308-abc123",
    "report": "/estimate/est-20260308-abc123/report"
  }
}
```

**GET /estimate/:id**

```json
// Response
{
  "id": "est-20260308-abc123",
  "status": "completed",
  "createdAt": "2026-03-08T20:00:00Z",
  "completedAt": "2026-03-08T20:05:00Z",
  "summary": {
    "totalHours": 42.5,
    "requirementsCount": 12,
    "confidenceLevel": "medium"
  },
  "artifacts": {
    "estimationReport": "# Estimation Report...",
    "detailedBreakdown": "requirement,hours,..."
  }
}
```

---

## CLI Commands

### estimate

```bash
npm run estimate -- <input-folder> [options]

Options:
  -o, --output <path>     Output directory for reports
  -v, --verbose           Enable verbose logging
  -t, --test-mode         Use cheaper model for testing
  -r, --reindex           Force catalog re-indexing
  -c, --catalog <name>    Catalog set to use (demo or real-world)
  -l, --log-file <path>   Log file path
```

### catalog

```bash
npm run catalog:index    # Index catalogs to vector store
npm run catalog:status   # Check catalog indexing status
```

---

## Environment Configuration

### Required Variables

```env
# ZhipuAI (Required)
ZHIPUAI_API_KEY=your_api_key
LLM_MODEL=glm-5
EMBEDDING_MODEL=embedding-2

# MongoDB Atlas (Required)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/estimator
VECTOR_SEARCH_INDEX=vector_index
```

### Optional Variables

```env
# Application
NODE_ENV=development
PORT=3000

# Langfuse (Optional)
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com

# Catalog
CATALOG_SET=demo
```

---

## Reference Catalogs

### Atomic Works Catalog

```yaml
# atomic_works.yaml
atomic_works:
  - id: aw-001
    name: "Write User Story"
    description: "Create a user story with acceptance criteria"
    category: "documentation"
    ba_process: "4.2"
    base_hours:
      optimistic: 0.5
      most_likely: 1.0
      pessimistic: 2.0
```

### BA Processes Catalog

```yaml
# ba_processes.yaml
ba_processes:
  - id: bp-001
    code: "4.2"
    name: "Analyze Requirements"
    description: "Analyze and structure stakeholder requirements"
    category: "needs_assessment"
```

### Coefficients Catalog

```yaml
# coefficients.yaml
coefficients:
  - id: coef-001
    name: "Legacy System Integration"
    description: "Additional effort for legacy system reverse engineering"
    value: 1.5
    triggers:
      - "legacy"
      - "reverse engineering"
      - "existing system"
```

---

## Testing Strategy

### Unit Tests

- Agent node tests with mocked LLM responses
- Catalog loader tests
- RAG service tests with mocked vector store
- Tool tests

### Integration Tests

- LangGraph execution tests
- REST API endpoint tests
- CLI command tests

### E2E Tests

- Full estimation pipeline with real LLM calls
- Sample project estimations
- Error handling scenarios

---

## Security Considerations

### API Key Management

- Store API keys in `.env` file (excluded from version control)
- Use environment variables for sensitive configuration
- Never commit API keys to repository

### Data Privacy

- All processing happens locally except LLM API calls
- Input artifacts are not stored on external servers
- Observability data can be self-hosted (Langfuse supports self-hosting)

---

## Deployment

### Development

```bash
npm install
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Docker (Future)

```bash
docker build -t ba-estimator .
docker run -p 3000:3000 --env-file .env ba-estimator
```
