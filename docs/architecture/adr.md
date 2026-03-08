# Architecture Decision Records (ADR)

## Overview

This document captures the key architectural decisions made during the design and implementation of the BA Work Estimation System. Each decision is documented with its context, decision, consequences, and status.

---

## ADR-001: Multi-Agent Architecture with LangGraph

### Status

**Accepted** (2024-01-15)

### Context

The system needs to process Discovery artifacts through multiple stages: validation, extraction, decomposition, estimation, and reporting. Each stage requires specialized processing and can fail independently. We needed an architecture that:

- Supports sequential processing with conditional branching
- Allows each stage to be developed and tested independently
- Provides clear state management between stages
- Enables observability and tracing of the entire pipeline

### Decision

We adopted a **multi-agent architecture using LangGraph** with a state machine pattern. The system consists of 5 specialized nodes:

- **ValidationNode** - Validates input artifacts sufficiency
- **ExtractionNode** - Extracts and normalizes requirements from ShRD
- **DecompositionNode** - Decomposes requirements into atomic BA works
- **EstimationNode** - Calculates PERT estimates with coefficients
- **ReportingNode** - Generates markdown and CSV reports

The graph flow is defined in [`estimation.graph.ts`](apps/api/src/agents/graph/estimation.graph.ts:90) using StateGraph from `@langchain/langgraph`.

### Consequences

**Positive:**

- Clear separation of concerns with each node having a single responsibility
- Easy to add new nodes or modify existing ones
- Built-in state management with `GraphState` annotation
- Natural error handling at node level
- Excellent testability with isolated unit tests per node

**Negative:**

- Learning curve for LangGraph concepts
- Additional complexity for simple operations
- State must be carefully managed to avoid bloating

---

## ADR-002: NestJS as Application Framework

### Status

**Accepted** (2024-01-10)

### Context

The system requires a robust framework that provides:

- Dependency injection for managing services and providers
- Modular architecture for organizing code
- Configuration management
- CLI capabilities alongside API endpoints
- TypeScript native support

### Decision

We chose **NestJS** as the application framework. The application is structured into modules:

- [`AppModule`](apps/api/src/app.module.ts) - Root module
- [`AgentsModule`](apps/api/src/agents/agents.module.ts) - Agent graph and nodes
- [`AiModule`](apps/api/src/ai/ai.module.ts) - LLM and embedding providers
- [`CatalogsModule`](apps/api/src/catalogs/catalogs.module.ts) - Reference data loaders
- [`RagModule`](apps/api/src/rag/rag.module.ts) - RAG service and vector store
- [`ToolsModule`](apps/api/src/tools/tools.module.ts) - Tool implementations
- [`PromptsModule`](apps/api/src/prompts/prompts.module.ts) - Prompt templates
- [`ObservabilityModule`](apps/api/src/observability/observability.module.ts) - Metrics and tracing

### Consequences

**Positive:**

- Strong dependency injection container
- Consistent code structure across the team
- Built-in configuration management with `@nestjs/config`
- Easy to test with testing utilities
- Rich ecosystem of modules

**Negative:**

- Boilerplate code for modules and providers
- Steeper learning curve for developers new to NestJS
- Overhead for simple operations

---

## ADR-003: MongoDB Atlas Vector Search for RAG

### Status

**Accepted** (2024-01-12)

### Context

The system needs to retrieve relevant atomic works, BA processes, and coefficients from reference catalogs based on semantic similarity to input requirements. We evaluated:

- Pinecone
- Weaviate
- MongoDB Atlas Vector Search
- Local vector stores (in-memory)

### Decision

We chose **MongoDB Atlas Vector Search** as the vector database solution. The implementation is in [`mongodb.store.ts`](apps/api/src/rag/vectorstore/mongodb.store.ts).

### Rationale

- Single database for both vector and metadata storage
- Native MongoDB integration (already using MongoDB)
- Atlas Vector Search provides production-ready vector search
- Cost-effective with existing MongoDB Atlas subscription
- No additional infrastructure to manage

### Consequences

**Positive:**

- Simplified infrastructure (one database)
- Good integration with LangChain
- Automatic scaling with Atlas
- Rich filtering capabilities

**Negative:**

- Vendor lock-in to MongoDB Atlas
- Requires Atlas cluster with appropriate tier
- Index creation and management through Atlas UI
- Less flexible than dedicated vector databases

---

## ADR-004: ZhipuAI GLM-5 as Primary LLM Provider

### Status

**Accepted** (2024-01-11)

### Context

The system requires an LLM for:

- Understanding and extracting requirements
- Decomposing requirements into atomic works
- Generating PERT estimates
- Creating natural language reports

We evaluated:

- OpenAI GPT-4
- Anthropic Claude
- ZhipuAI GLM-5
- Local models (Ollama)

### Decision

We chose **ZhipuAI GLM-5** as the primary LLM provider with OpenAI-compatible API interface. Configuration is in [`configuration.ts`](apps/api/src/config/configuration.ts:8).

### Rationale

- Cost-effective compared to GPT-4
- Strong performance on structured outputs
- OpenAI-compatible API for easy integration
- Good multilingual support (Ukrainian and English)
- Available embedding models

### Consequences

**Positive:**

- Lower operational costs
- Compatible with LangChain's OpenAI integration
- Good quality for BA domain tasks
- Supports both chat and embedding models

**Negative:**

- Less established than OpenAI
- Potential availability concerns
- Fewer community resources
- May require fallback strategy

---

## ADR-005: YAML for Reference Catalogs

### Status

**Accepted** (2024-01-13)

### Context

The system uses reference data for:

- Atomic BA works (concrete actions)
- BA processes (35 standard processes from BABOK)
- Complexity coefficients

This data needs to be:

- Human-readable and editable
- Version controlled
- Easily updatable without code changes
- Structured with clear schema

### Decision

We chose **YAML** as the format for reference catalogs. Catalogs are stored in [`apps/api/assets/catalogs/`](apps/api/assets/catalogs) with separate files for:

- [`atomic_works.yaml`](apps/api/assets/catalogs/demo/atomic_works.yaml) - Atomic work definitions
- [`ba_processes.yaml`](apps/api/assets/catalogs/demo/ba_processes.yaml) - BA process mappings
- [`coefficients.yaml`](apps/api/assets/catalogs/demo/coefficients.yaml) - Complexity coefficients

### Consequences

**Positive:**

- Human-readable and easy to edit
- Supports comments for documentation
- Native support in Python and Node.js
- Works well with version control
- Clear structure with nested data

**Negative:**

- Whitespace sensitivity can cause errors
- No built-in schema validation
- Requires custom validation logic
- Potential for inconsistent formatting

---

## ADR-006: Langfuse for Observability

### Status

**Accepted** (2024-01-14)

### Context

Multi-agent LLM systems require comprehensive observability for:

- Tracking token usage and costs
- Debugging agent behavior
- Performance monitoring
- Error tracing
- Audit trails

### Decision

We integrated **Langfuse** for LLM observability. The implementation is in [`langfuse.service.ts`](apps/api/src/ai/langfuse/langfuse.service.ts).

### Consequences

**Positive:**

- Automatic tracing of LLM calls
- Token usage tracking per agent
- Timeline visualization of execution
- Cost attribution
- Easy integration with LangChain

**Negative:**

- External service dependency
- Additional latency for trace submission
- Cost at scale
- Requires network connectivity

---

## ADR-007: PERT Estimation Methodology

### Status

**Accepted** (2024-01-15)

### Context

The system needs to provide effort estimates that account for uncertainty inherent in software project estimation. Traditional single-point estimates are often inaccurate.

### Decision

We adopted **PERT (Program Evaluation and Review Technique)** methodology for estimation. Each atomic work receives three estimates:

- **Optimistic (O)** - Best-case scenario
- **Most Likely (M)** - Normal conditions
- **Pessimistic (P)** - Worst-case scenario

Expected value is calculated as: `(O + 4M + P) / 6`

### Consequences

**Positive:**

- Accounts for uncertainty in estimates
- Provides range instead of single point
- Industry-standard methodology
- Easy to explain to stakeholders
- Supports risk analysis

**Negative:**

- Requires more input from LLM
- Subjective optimistic/pessimistic values
- Formula assumes beta distribution
- May not capture all uncertainty factors

---

## ADR-008: External Prompt Templates

### Status

**Accepted** (2024-01-16)

### Context

LLM prompts need to be:

- Iteratively refined based on results
- Version controlled
- Easy to modify without code changes
- Documented with examples

### Decision

We store **prompt templates as external Markdown files** in [`apps/api/src/prompts/templates/`](apps/api/src/prompts/templates):

- [`validation-agent.md`](apps/api/src/prompts/templates/validation-agent.md)
- [`extraction-agent.md`](apps/api/src/prompts/templates/extraction-agent.md)
- [`decomposition-agent.md`](apps/api/src/prompts/templates/decomposition-agent.md)
- [`estimation-agent.md`](apps/api/src/prompts/templates/estimation-agent.md)
- [`reporting-agent.md`](apps/api/src/prompts/templates/reporting-agent.md)

### Consequences

**Positive:**

- Prompts can be modified without deployment
- Version control of prompt changes
- Easy A/B testing of prompts
- Clear documentation alongside prompts
- Non-developers can review and suggest changes

**Negative:**

- File I/O for each prompt load
- No compile-time validation of prompt structure
- Must handle missing template files
- Template versioning complexity

---

## ADR-009: Tool-Based Architecture for External Access

### Status

**Accepted** (2024-01-17)

### Context

Agents need to access external resources:

- Read input files (TXT, MD, CSV, PDF)
- Query reference catalogs
- Access vector store for semantic search

### Decision

We implemented a **tool-based architecture** where each external resource access is encapsulated as a tool. Tools are defined in [`apps/api/src/tools/implementations/`](apps/api/src/tools/implementations):

- [`file-reader.tool.ts`](apps/api/src/tools/implementations/file-reader.tool.ts) - Read text files
- [`pdf-reader.tool.ts`](apps/api/src/tools/implementations/pdf-reader.tool.ts) - Extract text from PDFs
- [`catalog-retriever.tool.ts`](apps/api/src/tools/implementations/catalog-retriever.tool.ts) - Query reference catalogs

### Consequences

**Positive:**

- Clear interface for external access
- Easy to add new tools
- Tools can be tested independently
- Reusable across agents
- Clear error boundaries

**Negative:**

- Additional abstraction layer
- Tool registration overhead
- Must manage tool dependencies

---

## ADR-010: CLI-First Interface with Optional API

### Status

**Accepted** (2024-01-18)

### Context

The primary users are Business Analysts who may prefer command-line tools for batch processing. However, API access is needed for integration with other systems.

### Decision

We implemented a **CLI-first interface** with an optional REST API. CLI commands are in [`apps/api/src/cli/commands/`](apps/api/src/cli/commands):

- [`estimate.command.ts`](apps/api/src/cli/commands/estimate.command.ts) - Run estimation
- [`catalog.command.ts`](apps/api/src/cli/commands/catalog.command.ts) - Manage catalogs

REST API endpoints are in [`estimation.controller.ts`](apps/api/src/estimation/estimation.controller.ts).

### Consequences

**Positive:**

- BA-friendly interface
- Scriptable for automation
- API available for integrations
- Same business logic for both interfaces
- Easy local development

**Negative:**

- Must maintain two interfaces
- CLI output formatting complexity
- API authentication not yet implemented
- Different error handling approaches

---

## Decision Summary

| ADR     | Title                                       | Status   | Date       |
| ------- | ------------------------------------------- | -------- | ---------- |
| ADR-001 | Multi-Agent Architecture with LangGraph     | Accepted | 2024-01-15 |
| ADR-002 | NestJS as Application Framework             | Accepted | 2024-01-10 |
| ADR-003 | MongoDB Atlas Vector Search for RAG         | Accepted | 2024-01-12 |
| ADR-004 | ZhipuAI GLM-5 as Primary LLM Provider       | Accepted | 2024-01-11 |
| ADR-005 | YAML for Reference Catalogs                 | Accepted | 2024-01-13 |
| ADR-006 | Langfuse for Observability                  | Accepted | 2024-01-14 |
| ADR-007 | PERT Estimation Methodology                 | Accepted | 2024-01-15 |
| ADR-008 | External Prompt Templates                   | Accepted | 2024-01-16 |
| ADR-009 | Tool-Based Architecture for External Access | Accepted | 2024-01-17 |
| ADR-010 | CLI-First Interface with Optional API       | Accepted | 2024-01-18 |

---

## Future Considerations

The following decisions may need to be revisited:

1. **LLM Provider** - As the market evolves, we may evaluate other providers or implement multi-provider support
2. **Vector Database** - If scale increases significantly, dedicated vector databases may be needed
3. **API Authentication** - Currently not implemented, will need OAuth2 or API key authentication
4. **Streaming Responses** - For long-running estimations, streaming may improve UX
5. **Caching Layer** - Redis caching for frequently accessed catalogs and embeddings
