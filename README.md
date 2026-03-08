# BA Work Estimation System

A multi-agent RAG (Retrieval-Augmented Generation) system for business analyst work estimation using NestJS, LangChain, LangGraph, and MongoDB Atlas Vector Search.

## Features

- **Multi-Agent Architecture**: Five specialized agents orchestrated via LangGraph state machine
  - Validation Agent - Verifies input data sufficiency
  - Extraction Agent - Extracts and normalizes requirements
  - Decomposition Agent - Breaks requirements into atomic BA works
  - Estimation Agent - Calculates PERT estimates with coefficients
  - Reporting Agent - Generates markdown and CSV reports
- **RAG Pipeline**: Document ingestion, embedding, and retrieval using vector search
- **Vector Search**: MongoDB Atlas Vector Search for semantic similarity
- **LLM Integration**: ZhipuAI GLM-5 (OpenAI-compatible API)
- **Observability**: Langfuse integration for LLM tracing and monitoring
- **CLI Tool**: Command-line interface for catalog management and estimation
- **REST API**: Full REST API for programmatic access

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10
- **Agent Framework**: LangChain.js + LangGraph
- **LLM**: ZhipuAI GLM-5 (OpenAI-compatible API)
- **Embeddings**: ZhipuAI embedding-3
- **Database**: MongoDB Atlas
- **Vector Store**: MongoDB Atlas Vector Search
- **Observability**: Langfuse

## Prerequisites

- Node.js 20+
- MongoDB Atlas account with Vector Search enabled
- ZhipuAI API key
- Langfuse account (optional, for observability)

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
```

## Configuration

Set the following environment variables in your `.env` file:

```env
# ZhipuAI
ZHIPUAI_API_KEY=your_api_key
LLM_MODEL=glm-5
EMBEDDING_MODEL=embedding-3

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/estimator

# Langfuse (optional)
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_ENABLED=true

# Catalog Set (demo or real-world)
CATALOG_SET=demo
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## CLI Usage

### Estimation

```bash
# Run estimation on a project folder
npm run estimate -- /path/to/discovery/artifacts

# With options
npm run estimate -- /path/to/discovery/artifacts --output /path/to/output --verbose

# Use specific catalog set
npm run estimate -- /path/to/discovery/artifacts --catalog real-world

# Test mode (uses cheaper model)
npm run estimate -- /path/to/discovery/artifacts --test-mode
```

### Catalog Management

```bash
# Index catalogs to vector store
npm run catalog:index

# Check catalog status
npm run catalog:status
```

### CLI Options

| Option                  | Description                             |
| ----------------------- | --------------------------------------- |
| `-o, --output <path>`   | Output directory for reports            |
| `-v, --verbose`         | Enable verbose logging                  |
| `-t, --test-mode`       | Use cheaper model for testing           |
| `-r, --reindex`         | Force catalog re-indexing               |
| `-c, --catalog <name>`  | Catalog set to use (demo or real-world) |
| `-l, --log-file <path>` | Log file path                           |

## API Endpoints

### Root Endpoints

| Method | Endpoint  | Description                      |
| ------ | --------- | -------------------------------- |
| `GET`  | `/`       | API info and version             |
| `GET`  | `/health` | Health check with service status |
| `GET`  | `/config` | Current configuration            |

### Estimation Endpoints

| Method   | Endpoint               | Description                            |
| -------- | ---------------------- | -------------------------------------- |
| `POST`   | `/estimate`            | Create new estimation job              |
| `GET`    | `/estimate`            | List all estimation jobs               |
| `GET`    | `/estimate/:id`        | Get estimation status and results      |
| `GET`    | `/estimate/:id/report` | Get estimation report (markdown + CSV) |
| `DELETE` | `/estimate/:id`        | Delete estimation job                  |

### Example API Usage

**Create Estimation:**

```bash
curl -X POST http://localhost:3000/estimate \
  -H "Content-Type: application/json" \
  -d '{"inputFolder": "./apps/api/assets/samples/sample-project"}'
```

**Response:**

```json
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

**Get Estimation Status:**

```bash
curl http://localhost:3000/estimate/est-20260308-abc123
```

**Response:**

```json
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

**Health Check:**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-08T20:00:00Z",
  "services": {
    "mongodb": "connected",
    "zhipuai": "available",
    "langfuse": "connected"
  }
}
```

## Project Structure

```
apps/api/src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root NestJS module
├── app.controller.ts          # Basic API controller (/, /health, /config)
│
├── agents/                    # Multi-agent system
│   ├── graph/                 # LangGraph orchestration
│   │   ├── estimation.graph.ts
│   │   ├── state.ts
│   │   └── edges.ts
│   ├── nodes/                 # Agent node implementations
│   │   ├── validation.node.ts
│   │   ├── extraction.node.ts
│   │   ├── decomposition.node.ts
│   │   ├── estimation.node.ts
│   │   └── reporting.node.ts
│   └── interfaces/            # Agent type definitions
│
├── ai/                        # AI/LLM integration
│   ├── providers/             # LLM and embedding providers
│   │   ├── langchain-llm.provider.ts
│   │   └── langchain-embedding.provider.ts
│   └── langfuse/              # Observability service
│
├── catalogs/                  # Reference catalogs
│   ├── catalogs.service.ts
│   └── loaders/               # YAML catalog loaders
│
├── cli/                       # CLI commands
│   ├── index.ts
│   └── commands/
│       ├── estimate.command.ts
│       └── catalog.command.ts
│
├── config/                    # Configuration
├── database/                  # Database module
├── estimation/                # Estimation service & controller
├── observability/             # Metrics and tracing
├── prompts/                   # Agent prompt templates
├── rag/                       # RAG pipeline
│   └── vectorstore/           # MongoDB vector store
└── tools/                     # Agent tools
    ├── file-reader.tool.ts
    ├── pdf-reader.tool.ts
    └── catalog-retriever.tool.ts
```

## Input Artifacts

The system expects Discovery phase artifacts in the input folder:

### Required Files

- `business-vision.md` - Business Vision document
- `stakeholder-requirements.md` - Stakeholder Requirements Document

### Optional Files (improve accuracy)

- `high-level-architecture.md` - High-Level Architecture
- `non-functional-requirements.md` - Non-Functional Requirements
- `raid.md` - Risks, Assumptions, Issues, Dependencies

## Output

The system generates:

1. **Markdown Report** (`estimation-report.md`)
   - Executive summary
   - Requirements breakdown
   - Atomic works per requirement
   - PERT estimates (Optimistic, Most-likely, Pessimistic)
   - RAID context
   - Confidence level

2. **CSV Breakdown** (`estimation-breakdown.csv`)
   - Detailed line items for analysis
   - Requirement-level granularity
   - Support for descoping analysis

## Development

```bash
# Run tests
npm test

# Run e2e tests
npm run test:e2e

# Lint code
npm run lint

# Build
npm run build
```

## Sample Projects

Sample discovery artifacts are available in `apps/api/assets/samples/`:

- `sample-project/` - Generic sample project
- `single-requirement/` - Minimal example with one requirement
- `go-microservices-project/` - Go microservices example
- `java-springboot-project/` - Java Spring Boot example
- `python-fastapi-project/` - Python FastAPI example

## Catalog Sets

Two catalog sets are available:

- `demo` - Simplified catalogs for testing (default)
- `real-world` - Comprehensive real-world catalogs

Switch using `--catalog` flag or `CATALOG_SET` env variable.

## License

MIT
