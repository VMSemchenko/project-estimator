# BA Work Estimation System - Implementation Plan

## Overview

Multi-Agent RAG system for BA Work Estimation using NestJS and LangChain ecosystem. Five specialized agents orchestrated via LangGraph state machine with RAG access to reference catalogs.

## Technology Stack

| Component       | Technology                   | Purpose                   |
| --------------- | ---------------------------- | ------------------------- |
| Runtime         | Node.js 20+                  | Execution environment     |
| Framework       | NestJS                       | Application structure     |
| Agent Framework | LangChain.js + LangGraph     | Multi-agent orchestration |
| LLM             | ZhipuAI GLM-5                | Agent intelligence        |
| Vector Store    | MongoDB Atlas Vector Search  | RAG catalog storage       |
| Database        | MongoDB Atlas (M0 Free Tier) | Managed document storage  |
| Embeddings      | ZhipuAI embedding-3          | Document embeddings       |
| Observability   | Langfuse                     | Tracing & debugging       |
| CLI             | Commander.js / NestJS CLI    | Command interface         |

## Architecture

### Multi-Agent RAG with LangGraph

```
┌─────────────────────────────────────────────────────────────────┐
│                     LangGraph State Machine                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐               │
│  │ Validation│───▶│ Extraction│───▶│Decompositi│               │
│  │   Agent   │    │   Agent   │    │   Agent   │               │
│  └───────────┘    └───────────┘    └─────┬─────┘               │
│        │                │                 │                      │
│        ▼                ▼                 ▼                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Shared RAG Context                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │Atomic Works │  │BA Processes │  │Coefficients │      │   │
│  │  │   Catalog   │  │   Catalog   │  │   Catalog   │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                            │                     │
│                                            ▼                     │
│                                     ┌───────────┐               │
│                                     │Estimation │               │
│                                     │   Agent   │               │
│                                     └─────┬─────┘               │
│                                           │                      │
│                                           ▼                      │
│                                     ┌───────────┐               │
│                                     │ Reporting │               │
│                                     │   Agent   │               │
│                                     └───────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
estimator/
├── apps/
│   └── api/
│       ├── src/
│       │   ├── main.ts                        # NestJS entry point
│       │   ├── app.module.ts                  # Root module
│       │   ├── config/
│       │   │   ├── config.module.ts
│       │   │   └── configuration.ts
│       │   ├── agents/
│       │   │   ├── agents.module.ts
│       │   │   ├── interfaces/
│       │   │   │   ├── agent.interface.ts
│       │   │   │   ├── agent-state.interface.ts
│       │   │   │   └── agent-result.interface.ts
│       │   │   ├── nodes/                     # LangGraph nodes
│       │   │   │   ├── validation.node.ts
│       │   │   │   ├── extraction.node.ts
│       │   │   │   ├── decomposition.node.ts
│       │   │   │   ├── estimation.node.ts
│       │   │   │   └── reporting.node.ts
│       │   │   ├── graph/                     # LangGraph orchestration
│       │   │   │   ├── estimation.graph.ts
│       │   │   │   └── state.ts
│       │   │   └── tools/
│       │   │       ├── file-reader.tool.ts
│       │   │       ├── pdf-reader.tool.ts
│       │   │       └── catalog-retriever.tool.ts
│       │   ├── rag/
│       │   │   ├── rag.module.ts
│       │   │   ├── rag.service.ts
│       │   │   ├── embeddings/
│       │   │   │   └── openai-embedding.provider.ts
│       │   │   └── vectorstore/
│       │   │       └── mongodb.store.ts
│       │   ├── catalogs/
│       │   │   ├── catalogs.module.ts
│       │   │   ├── catalogs.service.ts
│       │   │   └── loaders/
│       │   │       ├── atomic-works.loader.ts
│       │   │       ├── ba-processes.loader.ts
│       │   │       └── coefficients.loader.ts
│       │   ├── estimation/
│       │   │   ├── estimation.module.ts
│       │   │   ├── estimation.service.ts
│       │   │   └── estimation.controller.ts
│       │   └── reports/
│       │       ├── reports.module.ts
│       │       ├── reports.service.ts
│       │       └── templates/
│       │           ├── markdown.template.ts
│       │           └── csv.template.ts
│       └── assets/
│           └── catalogs/
│               ├── atomic_works.yaml
│               ├── ba_processes.yaml
│               └── coefficients.yaml
├── docs/
│   ├── architecture/
│   │   └── implementation-plan.md
│   ├── specifications/
│   │   ├── business-vision.md
│   │   ├── design.md
│   │   └── requirements.md
│   └── tech-knowledge/
├── prompts/
│   ├── validation-agent.md
│   ├── extraction-agent.md
│   ├── decomposition-agent.md
│   ├── estimation-agent.md
│   └── reporting-agent.md
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
└── README.md
```

## Core Components

### 0. LLM Provider Configuration (ZhipuAI GLM-5)

```typescript
// llm.provider.ts
import { ChatOpenAI } from "@langchain/openai";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LlmProvider {
  private readonly llm: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {
    this.llm = new ChatOpenAI({
      modelName: configService.get("LLM_MODEL", "glm-5"),
      openAIApiKey: configService.get("ZHIPUAI_API_KEY"),
      configuration: {
        baseURL: "https://api.z.ai/api/paas/v4/",
      },
      temperature: 0.1, // Low temperature for consistent estimation
    });
  }

  getLlm(): ChatOpenAI {
    return this.llm;
  }
}
```

### 1. LangGraph State Machine

```typescript
// state.ts
interface EstimationState {
  // Input
  inputFolder: string;
  artifacts: Artifact[];

  // Validation stage
  validationStatus: "pending" | "valid" | "invalid";
  validationReport?: ValidationReport;

  // Extraction stage
  requirements: Requirement[];

  // Decomposition stage
  atomicWorks: AtomicWorkMapping[];

  // Estimation stage
  estimates: Estimate[];

  // Reporting stage
  report?: EstimationReport;

  // Error handling
  errors: Error[];
  currentStep: string;
}
```

### 2. Five LangGraph Nodes (Agents)

#### Node 1: Validation Agent

```typescript
// validation.node.ts
const validationNode = async (state: EstimationState) => {
  // 1. Read input folder artifacts
  // 2. Validate required documents exist (BV, ShRD, etc.)
  // 3. Check document quality/sufficiency
  // 4. Return validation status
};
```

**Role:** Validate input sufficiency
**Tools:** `file-reader.tool`, `pdf-reader.tool`
**Output:** Validation report with missing items

#### Node 2: Extraction Agent

```typescript
// extraction.node.ts
const extractionNode = async (state: EstimationState) => {
  // 1. Read ShRD document
  // 2. Extract and normalize requirements
  // 3. Assign unique IDs (REQ-001, REQ-002, etc.)
  // 4. Return structured requirements list
};
```

**Role:** Extract and normalize requirements from ShRD
**Tools:** `file-reader.tool`
**Output:** List of normalized requirements with IDs

#### Node 3: Decomposition Agent

```typescript
// decomposition.node.ts
const decompositionNode = async (state: EstimationState) => {
  // 1. For each requirement, query RAG for relevant atomic works
  // 2. Map requirements to atomic BA works
  // 3. Associate with BA processes
  // 4. Return work breakdown structure
};
```

**Role:** Decompose requirements into atomic BA works
**Tools:** `catalog-retriever.tool` (RAG)
**Output:** Atomic works mapped to requirements and BA processes

#### Node 4: Estimation Agent

```typescript
// estimation.node.ts
const estimationNode = async (state: EstimationState) => {
  // 1. For each atomic work, query RAG for coefficients
  // 2. Apply PERT formula: (O + 4M + P) / 6
  // 3. Apply complexity coefficients
  // 4. Return PERT estimates
};
```

**Role:** Calculate PERT estimates
**Tools:** `catalog-retriever.tool` (RAG)
**Output:** PERT estimates (O, M, P, Expected) per work

#### Node 5: Reporting Agent

```typescript
// reporting.node.ts
const reportingNode = async (state: EstimationState) => {
  // 1. Aggregate all estimates
  // 2. Generate markdown report
  // 3. Generate CSV breakdown
  // 4. Return final report
};
```

**Role:** Generate final reports
**Tools:** Internal templates
**Output:** Markdown report + CSV breakdown

### 3. RAG Service

```typescript
// rag.service.ts
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoClient } from "mongodb";

@Injectable()
export class RagService {
  private readonly client: MongoClient;
  private readonly vectorStore: MongoDBAtlasVectorSearch;
  private readonly embeddings: OpenAIEmbeddings;

  constructor(private readonly configService: ConfigService) {
    // ZhipuAI embeddings (OpenAI-compatible API)
    this.embeddings = new OpenAIEmbeddings({
      modelName: "embedding-3",
      openAIApiKey: configService.get("ZHIPUAI_API_KEY"),
      configuration: {
        baseURL: "https://api.z.ai/api/paas/v4/",
      },
    });

    this.client = new MongoClient(configService.get("MONGODB_URI"));
    this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
      collection: this.client.db("estimator").collection("catalogs"),
      indexName: "vector_index",
    });
  }

  async indexCatalogs(): Promise<void> {
    // Load YAML catalogs and index into MongoDB Atlas Vector Search
  }

  async retrieveRelevantWorks(context: string): Promise<AtomicWork[]> {
    // Semantic search for relevant atomic works
    return this.vectorStore.similaritySearch(context, 5);
  }

  async retrieveCoefficients(context: string): Promise<Coefficient[]> {
    // Semantic search for applicable coefficients
    return this.vectorStore.similaritySearch(context, 3);
  }
}
```

### 4. Reference Catalogs

#### atomic_works.yaml

```yaml
atomic_works:
  - id: write_user_story
    name: Write User Story
    description: Create user story with acceptance criteria
    base_hours: 1.5
    category: documentation
    ba_process: requirements_documentation
    keywords:
      - user story
      - acceptance criteria
      - requirement documentation

  - id: create_process_diagram
    name: Create Process Diagram
    description: Model business process visually using BPMN or flowchart
    base_hours: 2.0
    category: modeling
    ba_process: process_modeling
    keywords:
      - process flow
      - BPMN
      - workflow
      - business process

  - id: conduct_interview
    name: Conduct Stakeholder Interview
    description: Interview stakeholder for requirements gathering
    base_hours: 1.0
    category: elicitation
    ba_process: requirements_elicitation
    keywords:
      - interview
      - stakeholder
      - gathering
```

#### coefficients.yaml

```yaml
coefficients:
  - id: legacy_integration
    name: Legacy System Integration
    description: Work involves legacy systems with limited documentation
    multiplier: 1.5
    triggers:
      - "legacy"
      - "old system"
      - "migration"
      - "mainframe"

  - id: reverse_engineering
    name: Reverse Engineering Required
    description: No documentation available, requires reverse engineering
    multiplier: 2.0
    triggers:
      - "no documentation"
      - "undocumented"
      - "reverse engineer"
      - "no specs"

  - id: multiple_stakeholders
    name: Multiple Stakeholders
    description: Coordination between multiple stakeholder groups
    multiplier: 1.3
    triggers:
      - "multiple teams"
      - "cross-functional"
      - "several stakeholders"
```

### 5. LangGraph Flow Definition

```typescript
// estimation.graph.ts
import { StateGraph, END } from "@langchain/langgraph";

const workflow = new StateGraph<EstimationState>({
  channels: stateChannels,
});

// Add nodes
workflow.addNode("validation", validationNode);
workflow.addNode("extraction", extractionNode);
workflow.addNode("decomposition", decompositionNode);
workflow.addNode("estimation", estimationNode);
workflow.addNode("reporting", reportingNode);

// Define edges
workflow.setEntryPoint("validation");
workflow.addConditionalEdges("validation", shouldContinue, {
  continue: "extraction",
  end: END,
});
workflow.addEdge("extraction", "decomposition");
workflow.addEdge("decomposition", "estimation");
workflow.addEdge("estimation", "reporting");
workflow.addEdge("reporting", END);

const app = workflow.compile();
```

### 6. CLI Interface

```bash
# Basic usage
npm run estimate -- ./input-folder

# With options
npm run estimate -- ./input-folder --output ./reports --verbose

# Test mode (cheaper model)
npm run estimate -- ./input-folder --test-mode

# Re-index catalogs
npm run catalog:index
```

**Arguments:**

- `input_folder` - Path to folder with Discovery artifacts
- `--output` - Output directory (default: input_folder)
- `--verbose` - Show detailed progress
- `--test-mode` - Use gpt-4o-mini instead of gpt-4o
- `--reindex` - Force catalog re-indexing

## Data Flow

```mermaid
flowchart LR
    subgraph Input
        BV[business-vision.md]
        ShRD[stakeholder-requirements.md]
        HLA[high-level-architecture.md]
        NFR[non-functional-requirements.md]
        RAID[raid.md]
    end

    subgraph LangGraph Pipeline
        A1[Validation Node]
        A2[Extraction Node]
        A3[Decomposition Node]
        A4[Estimation Node]
        A5[Reporting Node]
    end

    subgraph RAG
        VS[(MongoDB Atlas)]
        AW[Atomic Works]
        BP[BA Processes]
        CF[Coefficients]
    end

    subgraph Output
        MD[estimation-report.md]
        CSV[estimation-breakdown.csv]
    end

    Input --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> Output

    A3 <--> VS
    A4 <--> VS
    VS <-- AW
    VS <-- BP
    VS <-- CF
```

## Output Files

### estimation-report.md

```markdown
# BA Work Estimation Report

**Date:** 2026-03-05
**Initiative:** [Name from BV]

## Summary

- **Total BA Hours:** 42.5
- **Requirements Count:** 12
- **Confidence Level:** Medium

## Input Artifacts

- business-vision.md (2026-03-01)
- stakeholder-requirements.md (2026-03-02)

## Breakdown by BA Process

| Process                  | Hours | %   |
| ------------------------ | ----- | --- |
| Requirements Elicitation | 12.5  | 29% |
| Documentation            | 18.0  | 42% |
| ...                      | ...   | ... |

## Breakdown by Requirement

| Requirement                  | Hours | %   |
| ---------------------------- | ----- | --- |
| REQ-001: User authentication | 8.5   | 20% |
| ...                          | ...   | ... |

## RAID Context

### Risks

- Legacy integration may require additional discovery

### Assumptions

- Middle BA skill level
- Stakeholders available for interviews
```

### estimation-breakdown.csv

```csv
requirement_id,requirement_text,atomic_work,ba_process,coefficient,O,M,P,expected_hours
REQ-001,User authentication,write_user_story,Documentation,1.0,1.0,1.5,2.0,1.5
REQ-001,User authentication,conduct_interview,Elicitation,1.5,0.5,1.0,1.5,1.0
```

## Implementation Phases

### Phase 1: Project Setup

- [ ] Initialize NestJS project
- [ ] Configure TypeScript
- [ ] Set up environment variables
- [ ] Configure MongoDB Atlas connection

### Phase 2: RAG Infrastructure

- [ ] Implement OpenAI embeddings provider
- [ ] Set up MongoDB Atlas Vector Search
- [ ] Create RAG service
- [ ] Implement catalog indexing

### Phase 3: Reference Catalogs

- [ ] Create atomic_works.yaml
- [ ] Create ba_processes.yaml
- [ ] Create coefficients.yaml
- [ ] Implement catalog loaders

### Phase 4: Agent Prompts

- [ ] Write validation-agent.md
- [ ] Write extraction-agent.md
- [ ] Write decomposition-agent.md
- [ ] Write estimation-agent.md
- [ ] Write reporting-agent.md

### Phase 5: LangGraph Nodes

- [ ] Implement validation.node.ts
- [ ] Implement extraction.node.ts
- [ ] Implement decomposition.node.ts
- [ ] Implement estimation.node.ts
- [ ] Implement reporting.node.ts

### Phase 6: LangGraph Orchestration

- [ ] Define state interface
- [ ] Create graph definition
- [ ] Wire up conditional edges
- [ ] Implement error handling

### Phase 7: Tools

- [ ] Implement file-reader.tool.ts
- [ ] Implement pdf-reader.tool.ts
- [ ] Implement catalog-retriever.tool.ts

### Phase 8: CLI & Integration

- [ ] Implement CLI commands
- [ ] Wire up end-to-end flow
- [ ] Add progress output
- [ ] Generate output files

### Phase 9: REST API

- [ ] Implement POST /estimate endpoint
- [ ] Implement GET /estimate/:id endpoint
- [ ] Implement GET /health endpoint
- [ ] Add request validation (DTOs)
- [ ] Add error handling middleware

### Phase 10: Observability

- [ ] Integrate Langfuse SDK
- [ ] Add tracing to all agent nodes
- [ ] Track token usage per estimation
- [ ] Set up error logging

### Phase 11: Testing

- [ ] Create sample input folder
- [ ] Test RAG retrieval
- [ ] Test end-to-end flow
- [ ] Test REST API endpoints
- [ ] Verify output formats

## Dependencies (package.json)

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@langchain/core": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/community": "^0.3.0",
    "@langchain/langgraph": "^0.2.0",
    "@langchain/mongodb": "^0.1.0",
    "langfuse": "^3.0.0",
    "langfuse-langchain": "^3.0.0",
    "mongodb": "^6.0.0",
    "yaml": "^2.3.0",
    "commander": "^12.0.0",
    "pdf-parse": "^1.1.1",
    "dotenv": "^16.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0"
  }
}
```

> **Note:** We use `@langchain/openai` for both LLM and embeddings because ZhipuAI provides an OpenAI-compatible API. Just configure the `baseURL` to point to ZhipuAI's endpoint.

## Environment Variables (.env)

```env
# ZhipuAI (GLM)
ZHIPUAI_API_KEY=your_zhipuai_api_key
LLM_MODEL=glm-5
EMBEDDING_MODEL=embedding-3

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/estimator?retryWrites=true&w=majority

# Langfuse
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
```

## REST API Endpoints

### POST /estimate

Trigger a new estimation from input folder.

```typescript
// estimation.controller.ts
@Controller("estimate")
export class EstimationController {
  @Post()
  async createEstimation(
    @Body() dto: CreateEstimationDto,
  ): Promise<EstimationResponse> {
    // dto.inputFolder - path to discovery artifacts
    // dto.outputFolder - optional output path
    return this.estimationService.runEstimation(dto);
  }
}
```

**Request:**

```json
{
  "inputFolder": "./discovery/project-alpha",
  "outputFolder": "./reports/project-alpha"
}
```

**Response:**

```json
{
  "id": "est-20260305-abc123",
  "status": "processing",
  "createdAt": "2026-03-05T22:00:00Z",
  "links": {
    "self": "/estimate/est-20260305-abc123",
    "report": "/estimate/est-20260305-abc123/report"
  }
}
```

### GET /estimate/:id

Get estimation status and results.

**Response:**

```json
{
  "id": "est-20260305-abc123",
  "status": "completed",
  "createdAt": "2026-03-05T22:00:00Z",
  "completedAt": "2026-03-05T22:05:00Z",
  "summary": {
    "totalHours": 42.5,
    "requirementsCount": 12,
    "confidenceLevel": "medium"
  },
  "artifacts": {
    "report": "/reports/project-alpha/estimation-report.md",
    "csv": "/reports/project-alpha/estimation-breakdown.csv"
  }
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-05T22:00:00Z",
  "services": {
    "mongodb": "connected",
    "zhipuai": "available",
    "langfuse": "connected"
  }
}
```

## Scope Decisions

**Included:**

- NestJS application structure
- 5 LangGraph nodes (agents)
- RAG with MongoDB Atlas Vector Search
- LangGraph state machine orchestration
- Markdown and CSV output
- Reference catalogs in YAML
- PERT estimation
- CLI interface
- REST API endpoints (POST /estimate, GET /estimate/:id, GET /health)
- Langfuse observability

**Excluded (for minimal implementation):**

- Authentication/Authorization
- Frontend/UI
- File watching
- Incremental updates
- Multi-tenancy
