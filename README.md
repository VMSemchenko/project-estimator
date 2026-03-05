# BA Work Estimation System

A multi-agent RAG (Retrieval-Augmented Generation) system for business analyst work estimation using NestJS, LangChain, and MongoDB Atlas Vector Search.

## Features

- **Multi-Agent Architecture**: Specialized agents for different estimation tasks
- **RAG Pipeline**: Document ingestion, embedding, and retrieval
- **Vector Search**: MongoDB Atlas Vector Search for semantic similarity
- **LLM Integration**: ZhipuAI GLM-5 for language understanding
- **Observability**: Langfuse integration for LLM tracing and monitoring
- **CLI Tool**: Command-line interface for document ingestion and estimation

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10
- **LLM**: ZhipuAI GLM-5 (OpenAI-compatible API)
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

```bash
# Ingest documents
npm run cli ingest -d ./documents

# Generate estimation
npm run cli estimate -d "Project description"

# Query knowledge base
npm run cli query "your query here" -k 5
```

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `GET /config` - Current configuration

## Project Structure

```
apps/api/src/
├── cli/                    # CLI commands
├── config/                 # Configuration files
├── database/               # Database module and repositories
├── ai/                     # AI agents and LLM providers
├── app.module.ts           # Root module
├── app.controller.ts       # Basic API controller
└── main.ts                 # Application entry point
```

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Build
npm run build
```

## License

MIT
