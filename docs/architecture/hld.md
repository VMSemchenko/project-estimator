# High-Level Design (HLD)

## BA Work Estimation System

**Version:** 1.0  
**Last Updated:** 2024-03-08  
**Status:** Approved

---

## 1. Executive Summary

The BA Work Estimation System is an AI-powered tool that automates Business Analyst work estimation during the Discovery phase of software projects. The system analyzes Discovery artifacts (Business Vision, Stakeholder Requirements, and optional supporting documents) and generates detailed effort estimates using a multi-agent architecture with PERT methodology.

### Key Capabilities

- Automated requirements extraction and normalization
- Decomposition into atomic BA works mapped to BABOK processes
- PERT-based effort estimation with complexity coefficients
- Comprehensive markdown reports and CSV breakdowns
- Full observability and traceability

---

## 2. System Architecture

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │  CLI Tool    │    │  REST API    │    │  Future: Web UI / IDE Plugin │  │
│  │  (Primary)   │    │  (Optional)  │    │                              │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Estimation Service                                 │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │              Agent Graph (LangGraph StateGraph)                 │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │   │
│  │  │  │Validation│─▶│Extraction│─▶│Decompos. │─▶│Estimation│       │  │   │
│  │  │  │   Node   │  │   Node   │  │   Node   │  │   Node   │       │  │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │  │   │
│  │  │                                         │                      │  │   │
│  │  │                                         ▼                      │  │   │
│  │  │                                  ┌──────────┐                  │  │   │
│  │  │                                  │Reporting │                  │  │   │
│  │  │                                  │   Node   │                  │  │   │
│  │  │                                  └──────────┘                  │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │    RAG     │ │  Catalogs  │ │  Prompts   │ │   Tools    │ │Observabil.│ │
│  │  Service   │ │  Service   │ │  Service   │ │  Module    │ │  Module   │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │  ZhipuAI   │ │  MongoDB   │ │  Langfuse  │ │  File      │               │
│  │  LLM API   │ │  Atlas     │ │  Cloud     │ │  System    │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture

#### 2.2.1 NestJS Modules

| Module                  | Purpose                              | Key Files                                                                       |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| **AppModule**           | Root module, application bootstrap   | [`app.module.ts`](apps/api/src/app.module.ts)                                   |
| **AgentsModule**        | Agent graph and node implementations | [`agents.module.ts`](apps/api/src/agents/agents.module.ts)                      |
| **AiModule**            | LLM and embedding providers          | [`ai.module.ts`](apps/api/src/ai/ai.module.ts)                                  |
| **CatalogsModule**      | Reference data loaders               | [`catalogs.module.ts`](apps/api/src/catalogs/catalogs.module.ts)                |
| **RagModule**           | RAG service and vector store         | [`rag.module.ts`](apps/api/src/rag/rag.module.ts)                               |
| **ToolsModule**         | Tool implementations                 | [`tools.module.ts`](apps/api/src/tools/tools.module.ts)                         |
| **PromptsModule**       | Prompt template management           | [`prompts.module.ts`](apps/api/src/prompts/prompts.module.ts)                   |
| **ObservabilityModule** | Metrics and tracing                  | [`observability.module.ts`](apps/api/src/observability/observability.module.ts) |
| **EstimationModule**    | API controller and service           | [`estimation.module.ts`](apps/api/src/estimation/estimation.module.ts)          |
| **DatabaseModule**      | MongoDB connection                   | [`database.module.ts`](apps/api/src/database/database.module.ts)                |

---

## 3. Agent Graph Design

### 3.1 Graph Flow

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    ESTIMATION GRAPH                      │
                    │                                                          │
START ─────────────▶│  ┌──────────────┐                                       │
                    │  │  Validation  │─────▶ [Validation Failed] ────▶ END   │
                    │  │     Node     │                                       │
                    │  └──────────────┘                                       │
                    │         │                                               │
                    │         ▼ [Validation Passed]                           │
                    │  ┌──────────────┐                                       │
                    │  │  Extraction  │                                       │
                    │  │     Node     │                                       │
                    │  └──────────────┘                                       │
                    │         │                                               │
                    │         ▼                                               │
                    │  ┌──────────────┐                                       │
                    │  │Decomposition │                                       │
                    │  │     Node     │                                       │
                    │  └──────────────┘                                       │
                    │         │                                               │
                    │         ▼                                               │
                    │  ┌──────────────┐                                       │
                    │  │  Estimation  │                                       │
                    │  │     Node     │                                       │
                    │  └──────────────┘                                       │
                    │         │                                               │
                    │         ▼                                               │
                    │  ┌──────────────┐                                       │
                    │  │  Reporting   │──────────────────────────────────▶ END │
                    │  │     Node     │                                       │
                    │  └──────────────┘                                       │
                    │                                                          │
                    └─────────────────────────────────────────────────────────┘
```

### 3.2 Node Specifications

#### ValidationNode

**Purpose:** Validates input artifacts for sufficiency

**Inputs:**

- Business Vision document (required)
- Stakeholder Requirements document (required)
- High-Level Architecture (optional)
- Non-Functional Requirements (optional)
- RAID log (optional)

**Outputs:**

- Validation status (pass/fail)
- List of missing required artifacts
- List of found optional artifacts
- Data quality assessment

**Implementation:** [`validation.node.ts`](apps/api/src/agents/nodes/validation.node.ts)

---

#### ExtractionNode

**Purpose:** Extracts and normalizes requirements from ShRD

**Inputs:**

- Stakeholder Requirements document content
- Business Vision context

**Outputs:**

- List of extracted requirements with unique IDs
- Requirement types (functional/non-functional)
- Original text preservation for traceability
- Ambiguity flags

**Implementation:** [`extraction.node.ts`](apps/api/src/agents/nodes/extraction.node.ts)

---

#### DecompositionNode

**Purpose:** Decomposes requirements into atomic BA works

**Inputs:**

- Extracted requirements
- Reference catalog of atomic works
- BA process mappings (35 processes)

**Outputs:**

- Atomic work instances per requirement
- Process mappings to BABOK categories
- Work complexity indicators

**Implementation:** [`decomposition.node.ts`](apps/api/src/agents/nodes/decomposition.node.ts)

---

#### EstimationNode

**Purpose:** Calculates PERT estimates with coefficients

**Inputs:**

- Atomic works with process mappings
- Complexity coefficients catalog
- Project context factors

**Outputs:**

- PERT estimates (O, M, P) per atomic work
- Applied coefficients with justifications
- Aggregated totals by requirement, process, and project

**Implementation:** [`estimation.node.ts`](apps/api/src/agents/nodes/estimation.node.ts)

---

#### ReportingNode

**Purpose:** Generates markdown and CSV reports

**Inputs:**

- All estimation results
- Intermediate results from previous nodes
- Input artifact metadata

**Outputs:**

- Markdown estimation report
- CSV breakdown file
- Intermediate results saved to disk

**Implementation:** [`reporting.node.ts`](apps/api/src/agents/nodes/reporting.node.ts)

---

### 3.3 State Management

The graph state is defined in [`state.ts`](apps/api/src/agents/graph/state.ts) using LangGraph's `Annotation` pattern:

```typescript
interface GraphState {
  // Input
  inputPath: string;
  artifacts: Map<string, string>;

  // Processing State
  currentStep: string;
  validationPassed: boolean;
  extractedRequirements: Requirement[];
  atomicWorks: AtomicWork[];
  estimates: Estimate[];

  // Output
  reportMarkdown: string;
  reportCsv: string;

  // Metadata
  errors: EstimationError[];
  warnings: string[];
  metrics: ExecutionMetrics;
}
```

---

## 4. Data Architecture

### 4.1 Reference Catalogs

#### Atomic Works Catalog

**Location:** [`atomic_works.yaml`](apps/api/assets/catalogs/demo/atomic_works.yaml)

```yaml
atomic_works:
  - id: "aw-001"
    name: "Write User Story"
    description: "Create a user story with acceptance criteria"
    default_hours: 2.0
    ba_process_ids: ["bp-006", "bp-007"]

  - id: "aw-002"
    name: "Create Process Diagram"
    description: "Design BPMN or flowchart diagram"
    default_hours: 3.0
    ba_process_ids: ["bp-012", "bp-013"]
```

#### BA Processes Catalog

**Location:** [`ba_processes.yaml`](apps/api/assets/catalogs/demo/ba_processes.yaml)

```yaml
ba_processes:
  - id: "bp-001"
    name: "Elicitation Planning"
    babok_category: "Elicitation"
    babok_number: "6.1"

  - id: "bp-002"
    name: "Conduct Interviews"
    babok_category: "Elicitation"
    babok_number: "6.2"
```

#### Coefficients Catalog

**Location:** [`coefficients.yaml`](apps/api/assets/catalogs/demo/coefficients.yaml)

```yaml
coefficients:
  - id: "coef-001"
    name: "Legacy System Integration"
    description: "Integration with legacy systems increases complexity"
    value: 1.5
    triggers:
      - "legacy"
      - "mainframe"
      - "old system"

  - id: "coef-002"
    name: "High Regulatory Requirements"
    description: "Compliance requirements increase documentation"
    value: 1.3
    triggers:
      - "GDPR"
      - "HIPAA"
      - "compliance"
```

### 4.2 Vector Store Schema

**Collection:** `estimator.documents`

```javascript
{
  _id: ObjectId,
  content: String,           // Document text content
  embedding: Vector(1536),   // Embedding vector
  metadata: {
    source: String,          // Source file path
    doc_type: String,        // "atomic_work" | "ba_process" | "coefficient"
    doc_id: String,          // Reference ID from catalog
    created_at: Date
  }
}
```

**Vector Search Index:** `vector_index`

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      }
    }
  }
}
```

### 4.3 Input Artifacts Structure

```
project-folder/
├── business-vision.md          # Required
├── stakeholder-requirements.md # Required
├── high-level-architecture.md  # Optional
├── non-functional-requirements.md # Optional
└── raid.md                     # Optional
```

---

## 5. Integration Architecture

### 5.1 LLM Integration

**Provider:** ZhipuAI GLM-5  
**Interface:** OpenAI-compatible API  
**Implementation:** [`langchain-llm.provider.ts`](apps/api/src/ai/providers/langchain-llm.provider.ts)

```typescript
interface LLMProvider {
  chat(messages: Message[]): Promise<string>;
  chatWithSystem(systemPrompt: string, messages: Message[]): Promise<string>;
}
```

**Configuration:**

```env
ZHIPUAI_API_KEY=your_api_key
ZHIPUAI_BASE_URL=https://api.z.ai/api/paas/v4
LLM_MODEL=glm-5
```

### 5.2 Embedding Integration

**Provider:** ZhipuAI Embedding or OpenAI Embedding  
**Implementation:** [`langchain-embedding.provider.ts`](apps/api/src/ai/providers/langchain-embedding.provider.ts)

```typescript
interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
```

### 5.3 Vector Store Integration

**Provider:** MongoDB Atlas Vector Search  
**Implementation:** [`mongodb.store.ts`](apps/api/src/rag/vectorstore/mongodb.store.ts)

```typescript
interface VectorStore {
  addDocuments(documents: Document[]): Promise<void>;
  similaritySearch(query: string, k: number): Promise<Document[]>;
  deleteByMetadata(filter: object): Promise<void>;
}
```

### 5.4 Observability Integration

**Provider:** Langfuse  
**Implementation:** [`langfuse.service.ts`](apps/api/src/ai/langfuse/langfuse.service.ts)

**Tracked Metrics:**

- Token usage per agent/node
- Execution duration per step
- Error rates and types
- Cost attribution

---

## 6. API Design

### 6.1 REST API Endpoints

| Method | Endpoint          | Description                           |
| ------ | ----------------- | ------------------------------------- |
| GET    | `/`               | API information                       |
| GET    | `/health`         | Health check                          |
| GET    | `/config`         | Current configuration (non-sensitive) |
| POST   | `/estimation`     | Start estimation job                  |
| GET    | `/estimation/:id` | Get estimation status/results         |

### 6.2 Estimation Request/Response

**Request:**

```json
POST /estimation
{
  "inputPath": "/path/to/project/folder",
  "options": {
    "outputFormat": ["markdown", "csv"],
    "includeIntermediateResults": true,
    "language": "en"
  }
}
```

**Response:**

```json
{
  "id": "est-12345",
  "status": "completed",
  "results": {
    "totalHours": 120.5,
    "breakdownByProcess": {...},
    "breakdownByRequirement": {...}
  },
  "outputs": {
    "reportUrl": "/estimation/est-12345/report.md",
    "csvUrl": "/estimation/est-12345/breakdown.csv"
  }
}
```

### 6.3 CLI Commands

```bash
# Run estimation
npm run cli estimate -d /path/to/project

# With options
npm run cli estimate \
  -d /path/to/project \
  --output ./results \
  --format markdown,csv \
  --verbose

# Catalog management
npm run cli catalog list
npm run cli catalog reload
```

---

## 7. Security Considerations

### 7.1 Current State

| Aspect              | Status          | Notes                                       |
| ------------------- | --------------- | ------------------------------------------- |
| API Authentication  | Not Implemented | Planned: API Key authentication             |
| Input Validation    | Implemented     | File type, size, content validation         |
| Output Sanitization | Implemented     | Markdown escaping, CSV injection prevention |
| Secrets Management  | Implemented     | Environment variables, never logged         |
| Rate Limiting       | Not Implemented | Planned for API                             |

### 7.2 Data Handling

- **Input Files:** Read-only access, never modified
- **API Keys:** Stored in environment variables, masked in logs
- **Estimation Results:** Stored locally, user-controlled
- **Vector Data:** Stored in MongoDB Atlas with encryption at rest

---

## 8. Performance Considerations

### 8.1 Performance Targets

| Metric                         | Target       | Notes                              |
| ------------------------------ | ------------ | ---------------------------------- |
| Single Requirement Estimation  | < 5 seconds  | End-to-end processing              |
| Full Project (50 requirements) | < 2 minutes  | Parallel processing where possible |
| Vector Search Query            | < 500ms      | P95 latency                        |
| Report Generation              | < 10 seconds | Markdown + CSV                     |

### 8.2 Optimization Strategies

1. **Embedding Caching:** Catalog embeddings cached in vector store
2. **Prompt Optimization:** Concise prompts to reduce token usage
3. **Parallel Processing:** Independent requirements processed concurrently
4. **Streaming:** Future: Stream results for long-running estimations

---

## 9. Deployment Architecture

### 9.1 Development Environment

```
┌─────────────────────────────────────────┐
│         Developer Machine               │
│  ┌─────────────────────────────────┐   │
│  │  NestJS Dev Server (port 3000)  │   │
│  └─────────────────────────────────┘   │
│                 │                       │
│  ┌─────────────────────────────────┐   │
│  │  Local MongoDB or Atlas         │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  ┌──────────────┐    ┌──────────────┐
  │  ZhipuAI API │    │ Langfuse Cloud│
  └──────────────┘    └──────────────┘
```

### 9.2 Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Container Orchestration                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  API Pod 1  │  │  API Pod 2  │  │  API Pod N  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Load Balancer / Ingress                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ MongoDB Atlas │  │  ZhipuAI API │  │Langfuse Cloud│
  └──────────────┘  └──────────────┘  └──────────────┘
```

### 9.3 Configuration Management

| Environment | Config Source         | Secrets Source              |
| ----------- | --------------------- | --------------------------- |
| Development | `.env` file           | `.env` file (not committed) |
| Staging     | Environment variables | Cloud secret manager        |
| Production  | Environment variables | Cloud secret manager        |

---

## 10. Testing Strategy

### 10.1 Test Levels

| Level       | Framework    | Coverage Target | Location          |
| ----------- | ------------ | --------------- | ----------------- |
| Unit        | Jest         | 80%+            | `*.spec.ts` files |
| Integration | Jest         | Key paths       | `test/` directory |
| E2E         | Jest + Shell | Critical flows  | `tests/e2e/`      |

### 10.2 Test Categories

```
tests/
├── e2e/
│   ├── phase1-config-env.test.sh    # Configuration tests
│   ├── phase2-rag.test.sh           # RAG pipeline tests
│   ├── phase3-catalogs.test.sh      # Catalog loading tests
│   ├── phase4-prompts.test.sh       # Prompt template tests
│   ├── phase5-nodes.test.sh         # Agent node tests
│   ├── phase6-graph.test.sh         # Graph execution tests
│   ├── phase7-tools.test.sh         # Tool implementation tests
│   ├── phase10-observability.test.sh # Observability tests
│   └── phase11-full-e2e.test.sh     # Full pipeline tests
│
└── api-test/
    ├── curl-commands.sh             # Manual API tests
    └── estimator-api.postman_collection.json
```

---

## 11. Monitoring and Observability

### 11.1 Observability Stack

| Component           | Tool                  | Purpose                        |
| ------------------- | --------------------- | ------------------------------ |
| LLM Tracing         | Langfuse              | Token usage, latency, costs    |
| Application Logs    | NestJS Logger         | Structured application logs    |
| Metrics             | Custom MetricsService | Business and technical metrics |
| Distributed Tracing | Custom TracingService | Request correlation            |

### 11.2 Key Metrics

**Business Metrics:**

- Estimations completed per day
- Average requirements per estimation
- Average atomic works generated
- Estimation accuracy (post-delivery feedback)

**Technical Metrics:**

- LLM token usage per estimation
- Node execution duration
- Error rate by node type
- Vector search latency

### 11.3 Alerting

| Alert                 | Condition                     | Severity |
| --------------------- | ----------------------------- | -------- |
| High Error Rate       | > 5% failures in 5 min window | High     |
| LLM Latency           | P95 > 30 seconds              | Medium   |
| Vector Search Failure | Any failure                   | High     |
| Token Budget Exceeded | Daily usage > threshold       | Medium   |

---

## 12. Scalability Considerations

### 12.1 Current Limitations

| Limitation             | Impact                        | Mitigation                      |
| ---------------------- | ----------------------------- | ------------------------------- |
| Synchronous Processing | Long estimations block        | Future: Async job queue         |
| Single LLM Provider    | Provider outage = system down | Future: Multi-provider fallback |
| No Caching             | Repeated queries to LLM       | Future: Redis caching           |
| File-based Input       | No database storage           | By design for simplicity        |

### 12.2 Scaling Path

1. **Horizontal Scaling:** Add API pods behind load balancer
2. **Async Processing:** Move to job queue (Bull/BullMQ)
3. **Caching Layer:** Add Redis for frequent queries
4. **Multi-region:** Deploy to multiple regions for latency

---

## 13. Future Roadmap

### Phase 1 (Current)

- ✅ Multi-agent estimation pipeline
- ✅ CLI and REST API interfaces
- ✅ MongoDB Atlas Vector Search
- ✅ Langfuse observability

### Phase 2 (Planned)

- ⏳ Web UI for estimation management
- ⏳ API authentication (OAuth2 / API Keys)
- ⏳ Async job processing with webhooks
- ⏳ Estimation history and comparison

### Phase 3 (Future)

- 📋 IDE plugins (VS Code, IntelliJ)
- 📋 Integration with project management tools (Jira, Azure DevOps)
- 📋 Multi-language support for reports
- 📋 Custom catalog management UI

---

## 14. Glossary

| Term            | Definition                                          |
| --------------- | --------------------------------------------------- |
| **Atomic Work** | A concrete BA action (e.g., "Write User Story")     |
| **BA Process**  | One of 35 standard processes from BABOK             |
| **BABOK**       | Business Analysis Body of Knowledge (IIBA standard) |
| **PERT**        | Program Evaluation and Review Technique             |
| **RAG**         | Retrieval-Augmented Generation                      |
| **ShRD**        | Stakeholder Requirements Document                   |
| **BV**          | Business Vision document                            |
| **HLA**         | High-Level Architecture document                    |
| **NFR**         | Non-Functional Requirements                         |
| **RAID**        | Risks, Assumptions, Issues, Dependencies            |

---

## 15. References

- [NestJS Documentation](https://docs.nestjs.com/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
- [Langfuse Documentation](https://langfuse.com/docs)
- [BABOK Guide v3](https://www.iiba.org/business-analysis-body-of-knowledge/)
- [Project Requirements Document](../specifications/requirements.md)
- [Project Design Document](../specifications/design.md)
- [Architecture Decision Records](./adr.md)
