# Design Document: BA Work AI Evaluation System

## Overview

The BA Work AI Evaluation System is a command-line tool that automates Business Analyst work estimation during the Discovery phase. The system analyzes Discovery artifacts (Business Vision, Stakeholder Requirements, and optional supporting documents) and generates detailed effort estimates using a multi-agent architecture with PERT methodology.

### Core Capabilities

- Reads Discovery artifacts from a specified folder (TXT, MD, CSV formats)
- Validates input sufficiency before estimation
- Extracts and normalizes requirements from Stakeholder Requirements Document
- Decomposes requirements into atomic BA works (concrete actions like writing user stories, creating diagrams, conducting interviews)
- Maps atomic works to 35 standard BA processes from BABOK for classification and reporting
- Applies complexity coefficients based on project context
- Calculates PERT estimates (Optimistic, Most-likely, Pessimistic)
- Generates comprehensive markdown reports with RAID context
- Produces CSV breakdowns for detailed analysis
- Supports descoping through requirement-level breakdown
- Provides full observability of agent execution

### Key Design Principles

1. **Data Sufficiency Over Guessing**: System refuses to estimate when input is insufficient rather than producing unreliable results
2. **Traceability**: All intermediate results are preserved; reports show which inputs influenced the estimate
3. **Modularity**: Sequential multi-agent architecture with specialized agents for each phase
4. **Transparency**: Detailed breakdowns by requirement, atomic work, and BA process
5. **Evolvability**: Reference catalogs (atomic works, coefficients) are external and updatable without code changes
6. **Observability**: Comprehensive metrics and tracing for all agent operations

### Target Environment

- Operating System: Windows
- Shell: bash
- Interface: Command-line
- Language Support: Ukrainian and English

## Technology Stack

### Core Framework and Orchestration

**CrewAI** (v0.80.0+)
- **Purpose**: Multi-agent orchestration framework
- **Usage**: Defines and coordinates 5 specialized agents in sequential workflow
- **Key Features**:
  - Agent abstraction with roles, goals, and backstories
  - Task management with context propagation
  - Sequential process execution
  - Custom tool integration
- **Documentation**: https://github.com/crewaiinc/crewai
- **Installation**: `pip install crewai`

### Observability and Tracing

**Langfuse** (v2.0.0+)
- **Purpose**: LLM observability and tracing platform
- **Usage**: Automatic tracking of agent execution, token usage, and performance metrics
- **Key Features**:
  - `@observe()` decorator for automatic function tracing
  - Context managers for manual span creation
  - Token usage tracking (input/output per agent)
  - Execution timeline and bottleneck identification
  - Error traces with stack information
- **Documentation**: https://langfuse.com/
- **Installation**: `pip install langfuse`
- **Configuration**: Requires `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` environment variables

### Documentation Access

**Context7 MCP** (Model Context Protocol)
- **Purpose**: Fetch current documentation for architecture and BA process definitions
- **Usage**: Access up-to-date information during decomposition and estimation
- **Key Features**:
  - Real-time documentation retrieval
  - Support for multiple technology stacks
  - Integration with agent tools
- **Documentation**: https://context7.com/
- **Installation**: Via MCP client library

### Language Model Integration

**OpenAI API** (GPT-5 family)
- **Purpose**: Power AI agents for requirements analysis, decomposition, and estimation
- **Usage**: All 5 agents use LLM for natural language understanding and reasoning
- **Models**:
  - **Production Mode**: `gpt-5.2` - Most capable model for complex BA estimation tasks
  - **Test Mode**: `gpt-5-nano` - Cost-optimized model for development and testing
- **Configuration**: 
  - Requires `OPENAI_API_KEY` environment variable
  - Optional `OPENAI_MODEL` environment variable (defaults to `gpt-5.2`)
  - Use `--test-mode` CLI flag to switch to `gpt-5-nano`
- **API Version**: OpenAI API v1
- **Documentation**: https://platform.openai.com/docs

**Langfuse OpenAI Integration**
- **Purpose**: Automatic tracing of OpenAI API calls
- **Usage**: Drop-in replacement for standard OpenAI client
- **Import**: `from langfuse.openai import openai`
- **Features**: Tracks token usage, latency, and costs for both gpt-5.2 and gpt-5-nano

### Data Processing and Storage

**PyYAML** (v6.0+)
- **Purpose**: Parse and validate reference catalogs (atomic works, BA processes, coefficients)
- **Usage**: Load YAML configuration files
- **Installation**: `pip install pyyaml`

**Python Standard Library**
- **pathlib**: Cross-platform file path handling
- **json**: JSON parsing for observability data
- **csv**: CSV generation with UTF-8 BOM encoding
- **datetime**: Timestamp management
- **uuid**: Correlation ID generation
- **logging**: Structured logging

### Testing Framework

**Pytest** (v7.0+)
- **Purpose**: Unit and integration testing framework
- **Usage**: Test runner for all test suites
- **Installation**: `pip install pytest`

**Hypothesis** (v6.0+)
- **Purpose**: Property-based testing library
- **Usage**: Generate test cases for 32 correctness properties
- **Configuration**: Minimum 100 iterations per property test
- **Installation**: `pip install hypothesis`

**pytest-asyncio** (v0.21+)
- **Purpose**: Support for async test functions
- **Usage**: Test async CrewAI operations
- **Installation**: `pip install pytest-asyncio`

### Development Tools

**Python** (v3.10+)
- **Minimum Version**: 3.10 (required for modern type hints and pattern matching)
- **Recommended Version**: 3.11 or 3.12 for better performance

**pip** (v23.0+)
- **Purpose**: Package management
- **Usage**: Install all dependencies from requirements.txt

**chardet** (v5.0+)
- **Purpose**: Character encoding detection
- **Usage**: Handle non-UTF-8 input files
- **Installation**: `pip install chardet`

### Command-Line Interface

**argparse** (Python Standard Library)
- **Purpose**: CLI argument parsing
- **Usage**: Handle command-line options (--output, --verbose, --help, etc.)

**rich** (v13.0+) - Optional
- **Purpose**: Enhanced console output with progress bars and formatting
- **Usage**: Display real-time progress indicators
- **Installation**: `pip install rich`

### File Format Support

**Supported Input Formats**:
- **Markdown (.md)**: Primary format for Discovery artifacts
- **Plain Text (.txt)**: Alternative format for artifacts
- **CSV (.csv)**: Structured data input

**Supported Output Formats**:
- **Markdown (.md)**: Estimation reports and intermediate results
- **CSV (.csv)**: Detailed calculation breakdowns with UTF-8 BOM encoding
- **JSON (.json)**: Observability dashboards and structured logs

### Environment Configuration

**Environment Variables**:
```bash
# Required for LLM integration
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-5.2  # Optional, defaults to gpt-5.2 (use gpt-5-nano for testing)

# Required for Langfuse observability
LANGFUSE_PUBLIC_KEY=<your-langfuse-public-key>
LANGFUSE_SECRET_KEY=<your-langfuse-secret-key>
LANGFUSE_HOST=https://cloud.langfuse.com  # Optional, defaults to cloud

# Optional for Context7 MCP
CONTEXT7_API_KEY=<your-context7-api-key>
```

**Configuration Files**:
- `.env`: Environment variables (not committed to version control)
- `config.yaml`: System configuration (log levels, timeouts, etc.)
- `catalogs/*.yaml`: Reference catalogs (atomic works, BA processes, coefficients)

### Deployment Requirements

**System Requirements**:
- **OS**: Windows 10/11 with bash shell (Git Bash, WSL, or similar)
- **Python**: 3.10 or higher
- **Memory**: Minimum 2GB RAM (4GB recommended for large projects)
- **Disk Space**: 500MB for installation + space for input/output files
- **Network**: Internet connection for OpenAI API and Langfuse

**Dependencies Installation**:
```bash
# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows with Git Bash

# Install dependencies
pip install -r requirements.txt
```

**requirements.txt**:
```
crewai>=0.80.0
langfuse>=2.0.0
openai>=1.0.0
pyyaml>=6.0
pytest>=7.0
hypothesis>=6.0
pytest-asyncio>=0.21
chardet>=5.0
rich>=13.0
python-dotenv>=1.0.0
```

### Architecture Patterns

**Design Patterns Used**:
- **Agent Pattern**: CrewAI agents with specialized roles
- **Pipeline Pattern**: Sequential task execution with context propagation
- **Observer Pattern**: Langfuse observability decorators
- **Strategy Pattern**: Pluggable coefficient detection and application
- **Factory Pattern**: Agent and task creation
- **Repository Pattern**: Catalog management for atomic works and coefficients

**Code Organization**:
```
src/
├── agents/              # CrewAI agent definitions
│   ├── validation.py
│   ├── extraction.py
│   ├── decomposition.py
│   ├── estimation.py
│   └── reporting.py
├── tools/               # Custom CrewAI tools
│   ├── file_tools.py
│   ├── catalog_tools.py
│   └── calculation_tools.py
├── models/              # Data models and schemas
│   ├── requirement.py
│   ├── atomic_work.py
│   └── estimation.py
├── utils/               # Utility functions
│   ├── file_utils.py
│   ├── logging_utils.py
│   └── validation_utils.py
├── observability/       # Langfuse integration
│   └── manager.py
└── main.py              # CLI entry point
```

### Version Control and Dependencies

**Dependency Management Strategy**:
- Pin major versions in requirements.txt
- Use semantic versioning for system releases
- Document breaking changes in CHANGELOG.md
- Test compatibility with new framework versions before upgrading

**Compatibility Matrix**:
| Component | Minimum Version | Tested Version | Notes |
|-----------|----------------|----------------|-------|
| Python | 3.10 | 3.11 | Type hints, pattern matching |
| CrewAI | 0.80.0 | 0.80.0 | Sequential process support |
| Langfuse | 2.0.0 | 2.0.0 | @observe decorator |
| OpenAI | 1.0.0 | 1.0.0 | New API structure |
| Hypothesis | 6.0 | 6.0 | Property-based testing |

### Security Considerations

**API Key Management**:
- Store API keys in `.env` file (excluded from version control)
- Use environment variables for sensitive configuration
- Never commit API keys to repository
- Rotate keys regularly

**Data Privacy**:
- All processing happens locally except LLM API calls
- Input artifacts are not stored on external servers (except during LLM processing)
- Observability data can be self-hosted (Langfuse supports self-hosting)

**Dependency Security**:
- Regularly update dependencies for security patches
- Use `pip-audit` to scan for known vulnerabilities
- Review dependency licenses for compliance

## Architecture

### System Architecture

The system is built on the **CrewAI framework** (https://github.com/crewaiinc/crewai), which provides a robust multi-agent orchestration platform. The architecture uses CrewAI's Crew, Agent, and Task abstractions to implement a sequential estimation pipeline with full observability through **Langfuse** (https://langfuse.com/).

#### CrewAI Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Input                               │
│                    (Folder with artifacts)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CrewAI Crew                                 │
│  Process: Sequential                                             │
│  Observability: Langfuse @observe decorators                     │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 1: Validation                                         │  │
│  │ Agent: ValidationAgent                                     │  │
│  │ Expected Output: Validation results (01-validation.md)    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                     │
│                             ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 2: Requirements Extraction                            │  │
│  │ Agent: ExtractionAgent                                     │  │
│  │ Context: Task 1 output                                     │  │
│  │ Expected Output: Extracted requirements (02-extraction.md)│  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                     │
│                             ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 3: Decomposition                                      │  │
│  │ Agent: DecompositionAgent                                  │  │
│  │ Context: Task 2 output                                     │  │
│  │ Expected Output: Atomic works mapping (03-decomposition.md)│ │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                     │
│                             ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 4: Estimation                                         │  │
│  │ Agent: EstimationAgent                                     │  │
│  │ Context: Task 3 output                                     │  │
│  │ Expected Output: PERT estimates (04-estimation.md)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                     │
│                             ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Task 5: Report Generation                                  │  │
│  │ Agent: ReportGenerationAgent                               │  │
│  │ Context: Task 4 output                                     │  │
│  │ Expected Output: Final reports (report.md, breakdown.csv) │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Final Output                                │
│  - Estimation report (markdown)                                  │
│  - Calculation breakdown (CSV)                                   │
│  - Intermediate results (for traceability)                       │
│  - Langfuse observability traces                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### CrewAI Crew Definition

The system defines a single Crew with 5 specialized agents and 5 sequential tasks:

```python
from crewai import Crew, Agent, Task, Process
from langfuse.decorators import observe

@observe()
def create_estimation_crew(input_folder: str, output_folder: str) -> Crew:
    """Create and configure the BA estimation crew with Langfuse observability."""
    
    # Define agents
    validation_agent = Agent(
        role="Input Validation Specialist",
        goal="Verify input sufficiency and folder structure",
        backstory="Expert in validating Discovery artifacts and ensuring data quality",
        tools=[FolderReaderTool(), FileValidatorTool()],
        verbose=True
    )
    
    extraction_agent = Agent(
        role="Requirements Extraction Specialist",
        goal="Extract and normalize requirements from ShRD",
        backstory="Expert in parsing and structuring stakeholder requirements",
        tools=[ShRDParserTool(), RequirementNormalizerTool()],
        verbose=True
    )
    
    decomposition_agent = Agent(
        role="Work Decomposition Specialist",
        goal="Map requirements to atomic BA works and processes",
        backstory="Expert in breaking down requirements into concrete BA activities",
        tools=[CatalogReaderTool(), ProcessMapperTool()],
        verbose=True
    )
    
    estimation_agent = Agent(
        role="PERT Estimation Specialist",
        goal="Calculate effort estimates using PERT methodology",
        backstory="Expert in applying complexity coefficients and calculating estimates",
        tools=[CoefficientDetectorTool(), PERTCalculatorTool()],
        verbose=True
    )
    
    report_agent = Agent(
        role="Report Generation Specialist",
        goal="Generate comprehensive estimation reports",
        backstory="Expert in creating clear, actionable estimation documentation",
        tools=[MarkdownGeneratorTool(), CSVGeneratorTool()],
        verbose=True
    )
    
    # Define sequential tasks
    validation_task = Task(
        description=load_prompt("prompts/validation-agent.md"),
        expected_output="Validation results with file inventory and sufficiency check",
        agent=validation_agent,
        output_file="intermediate-results/01-validation.md"
    )
    
    extraction_task = Task(
        description=load_prompt("prompts/extraction-agent.md"),
        expected_output="Extracted and normalized requirements with unique IDs",
        agent=extraction_agent,
        context=[validation_task],
        output_file="intermediate-results/02-extraction.md"
    )
    
    decomposition_task = Task(
        description=load_prompt("prompts/decomposition-agent.md"),
        expected_output="Requirements mapped to atomic works and BA processes",
        agent=decomposition_agent,
        context=[extraction_task],
        output_file="intermediate-results/03-decomposition.md"
    )
    
    estimation_task = Task(
        description=load_prompt("prompts/estimation-agent.md"),
        expected_output="PERT estimates with coefficients and aggregations",
        agent=estimation_agent,
        context=[decomposition_task],
        output_file="intermediate-results/04-estimation.md"
    )
    
    report_task = Task(
        description=load_prompt("prompts/report-agent.md"),
        expected_output="Final markdown report and CSV breakdown",
        agent=report_agent,
        context=[estimation_task],
        output_file="intermediate-results/05-report-generation.md"
    )
    
    # Create crew with sequential process
    crew = Crew(
        agents=[validation_agent, extraction_agent, decomposition_agent, 
                estimation_agent, report_agent],
        tasks=[validation_task, extraction_task, decomposition_task,
               estimation_task, report_task],
        process=Process.sequential,
        verbose=True
    )
    
    return crew
```

#### Langfuse Observability Integration

All agent operations are automatically traced using Langfuse decorators:

```python
from langfuse.decorators import observe, langfuse_context

@observe()
def run_estimation(input_folder: str, output_folder: str):
    """Run BA estimation with full Langfuse tracing."""
    
    # Create span for overall execution
    with langfuse_context.observe(name="ba_estimation_execution"):
        # Initialize crew
        crew = create_estimation_crew(input_folder, output_folder)
        
        # Execute crew (automatically traced)
        result = crew.kickoff(inputs={
            "input_folder": input_folder,
            "output_folder": output_folder
        })
        
        # Generate observability dashboard
        generate_observability_dashboard()
        
        return result

@observe()
def generate_observability_dashboard():
    """Generate observability dashboard from Langfuse traces."""
    # Fetch traces from Langfuse
    # Aggregate metrics
    # Write to observability/dashboard.json
    pass
```

Langfuse automatically tracks:
- Execution timeline (start/end times, duration)
- Token usage (input/output per agent)
- Memory consumption
- Error traces with stack information
- Data flow between agents
- Performance bottlenecks

#### Agent Prompt Loading

Each agent loads its instructions from a separate markdown file in the `prompts/` folder:

```python
def load_prompt(prompt_file: str) -> str:
    """Load agent prompt from markdown file."""
    with open(prompt_file, 'r', encoding='utf-8') as f:
        return f.read()
```

Prompt files:
- `prompts/validation-agent.md` - Validation instructions
- `prompts/extraction-agent.md` - Extraction instructions
- `prompts/decomposition-agent.md` - Decomposition instructions
- `prompts/estimation-agent.md` - Estimation instructions
- `prompts/report-agent.md` - Report generation instructions

This allows developers to modify agent behavior without code changes.

#### Context7 MCP Integration

The system uses **Context7 MCP** (Model Context Protocol) to fetch current documentation for architecture work:

```python
from mcp import Context7Client

@observe()
def fetch_architecture_context(technology: str) -> str:
    """Fetch current documentation using Context7 MCP."""
    client = Context7Client()
    context = client.get_documentation(technology)
    return context
```

This is used during decomposition and estimation to access up-to-date information about:
- CrewAI framework patterns
- Langfuse integration best practices
- BA process definitions
- Industry standards

### Reference Catalogs

The system uses three external reference catalogs stored in YAML format:

1. **Atomic Works Catalog** (`catalogs/atomic-works.yaml`)
   - Concrete BA actions (write user story, create diagram, conduct interview, etc.)
   - Base PERT estimates (O/M/P hours)
   - Applicability conditions
   - Mapping to BA processes

2. **BA Processes Catalog** (`catalogs/ba-processes.yaml`)
   - 35 standard BA processes organized in 6 BABOK categories
   - Process descriptions
   - Category mappings

3. **Coefficients Catalog** (`catalogs/coefficients.yaml`)
   - Complexity multipliers (0.5 to 3.0)
   - Applicability conditions
   - Context detection rules

### Agent Communication Protocol

Agents communicate through CrewAI's task context mechanism. Each task receives the output of previous tasks through the `context` parameter. Additionally, intermediate results are saved to markdown files with the following format:

```markdown
# Agent Name Output

## Metadata
- Timestamp Start: YYYY-MM-DD HH:MM:SS
- Timestamp End: YYYY-MM-DD HH:MM:SS
- Duration: X.XX seconds
- Agent Version: X.Y.Z
- Status: SUCCESS | FAILURE
- Correlation ID: <uuid>
- Langfuse Trace ID: <trace_id>

## Input Summary
- Source files: [list]
- Input size: X characters

## Output Summary
- Records processed: N
- Output size: X characters

## Results
[Structured data specific to agent]

## Observability Metrics
- Tokens used (input): N
- Tokens used (output): N
- Memory usage: X MB
- Warnings: [list]
- Errors: [list]

## Next Agent Instructions
[What the next agent should do with this data]
```

### Observability System

The observability system uses **Langfuse** for automatic tracing and metrics collection:

```
observability/
├── <timestamp>-execution.json    # Detailed execution metrics from Langfuse
└── dashboard.json                # Latest execution summary
```

Tracked metrics include:
- Agent execution timeline
- Token usage per agent
- Memory consumption
- Error traces
- Data flow sizes
- Performance bottlenecks
- Anomaly detection

The system supports a `--verbose` flag for detailed console output during execution.

## Components and Interfaces

### 1. Command-Line Interface (CLI)

**Responsibility**: Parse command-line arguments, initialize CrewAI crew, display progress

**Interface**:
```bash
ba-estimate <input-folder> [options]

Options:
  --output <path>        Output directory (default: input folder)
  --test-mode           Use gpt-5-nano model for cost-effective testing
  --verbose             Detailed observability output
  --help                Display usage information
  --version             Display system version
  --log-level <level>   Set log level (DEBUG|INFO|WARNING|ERROR)
  --skip-intermediate   Skip intermediate file generation for faster execution
```

**Key Methods**:
- `parse_arguments()` - Parse and validate CLI arguments
- `create_crew()` - Initialize CrewAI crew with agents and tasks
- `run_crew()` - Execute crew.kickoff() with Langfuse tracing
- `display_progress()` - Show real-time progress indicators
- `handle_errors()` - Display user-friendly error messages

**Implementation**:
```python
@observe()
def main():
    """Main entry point with Langfuse observability."""
    args = parse_arguments()
    
    # Initialize Langfuse
    langfuse_context.configure(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY")
    )
    
    # Create and run crew
    crew = create_estimation_crew(args.input_folder, args.output_folder)
    result = crew.kickoff(inputs={
        "input_folder": args.input_folder,
        "output_folder": args.output_folder,
        "verbose": args.verbose
    })
    
    # Generate observability dashboard
    generate_observability_dashboard()
    
    print(f"✓ Estimation complete. Reports saved to {args.output_folder}")
```

### 2. ValidationAgent (CrewAI Agent)

**Responsibility**: Verify input sufficiency and folder structure

**CrewAI Configuration**:
```python
validation_agent = Agent(
    role="Input Validation Specialist",
    goal="Verify input sufficiency and folder structure for BA estimation",
    backstory="""You are an expert in validating Discovery artifacts and ensuring 
    data quality. You have deep knowledge of what constitutes sufficient input for 
    accurate BA work estimation. You meticulously check file presence, formats, 
    and content quality.""",
    tools=[FolderReaderTool(), FileValidatorTool(), ContentCheckerTool()],
    verbose=True,
    allow_delegation=False
)
```

**Custom Tools**:
- `FolderReaderTool` - Reads folder contents and lists files
- `FileValidatorTool` - Validates file formats (TXT, MD, CSV only)
- `ContentCheckerTool` - Checks content sufficiency (BV has description, ShRD has requirements)

**Input**: 
- Folder path from CLI
- Expected file names: `business-vision.md`, `stakeholder-requirements.md`, `high-level-architecture.md`, `non-functional-requirements.md`, `raid.md`

**Output**: `intermediate-results/01-validation.md`

**Task Definition**:
```python
validation_task = Task(
    description=load_prompt("prompts/validation-agent.md"),
    expected_output="""Validation results including:
    - Folder existence confirmation
    - List of found files with formats
    - Required files status (BV, ShRD)
    - Optional files status (HLA, NFR, RAID)
    - Content sufficiency check results
    - Overall validation status (PASS/FAIL)
    - List of missing artifacts if validation fails""",
    agent=validation_agent,
    output_file="intermediate-results/01-validation.md"
)
```

**Prompt File**: `prompts/validation-agent.md`

**Error Conditions**:
- Folder does not exist
- Required files missing (BV, ShRD)
- Files are empty or corrupted
- Unsupported file formats (DOCX, XLSX, PPTX)

### 3. ExtractionAgent (CrewAI Agent)

**Responsibility**: Extract and normalize requirements from ShRD

**CrewAI Configuration**:
```python
extraction_agent = Agent(
    role="Requirements Extraction Specialist",
    goal="Extract and normalize all requirements from Stakeholder Requirements Document",
    backstory="""You are an expert in parsing and structuring stakeholder requirements. 
    You have extensive experience with various requirement documentation formats and can 
    identify functional vs non-functional requirements. You excel at normalizing text 
    and flagging ambiguous or incomplete requirements.""",
    tools=[ShRDParserTool(), RequirementNormalizerTool(), RequirementClassifierTool()],
    verbose=True,
    allow_delegation=False
)
```

**Custom Tools**:
- `ShRDParserTool` - Parses ShRD document structure
- `RequirementNormalizerTool` - Normalizes requirement text
- `RequirementClassifierTool` - Classifies requirements as functional/non-functional

**Input**: 
- `intermediate-results/01-validation.md` (via CrewAI context)
- `stakeholder-requirements.md`

**Output**: `intermediate-results/02-extraction.md`

**Task Definition**:
```python
extraction_task = Task(
    description=load_prompt("prompts/extraction-agent.md"),
    expected_output="""Extracted requirements including:
    - List of all requirements with unique IDs (REQ-001, REQ-002, etc.)
    - Original and normalized text for each requirement
    - Classification (functional/non-functional)
    - Flags for ambiguous or incomplete requirements
    - Source section references
    - Total count of requirements extracted""",
    agent=extraction_agent,
    context=[validation_task],
    output_file="intermediate-results/02-extraction.md"
)
```

**Prompt File**: `prompts/extraction-agent.md`

**Output Schema**:
```yaml
requirements:
  - id: REQ-001
    original_text: "..."
    normalized_text: "..."
    type: functional | non-functional
    flags: [ambiguous, incomplete]
    source_section: "..."
```

### 4. DecompositionAgent (CrewAI Agent)

**Responsibility**: Map requirements to atomic works and BA processes

**CrewAI Configuration**:
```python
decomposition_agent = Agent(
    role="Work Decomposition Specialist",
    goal="Break down requirements into atomic BA works and map to standard BA processes",
    backstory="""You are an expert in breaking down requirements into concrete BA 
    activities. You have deep knowledge of the 35 standard BA processes from BABOK 
    and understand how different types of requirements translate into specific BA 
    work items like writing user stories, creating diagrams, conducting interviews, 
    and aligning requirements with stakeholders.""",
    tools=[CatalogReaderTool(), ProcessMapperTool(), Context7MCPTool()],
    verbose=True,
    allow_delegation=False
)
```

**Custom Tools**:
- `CatalogReaderTool` - Reads atomic works and BA processes catalogs
- `ProcessMapperTool` - Maps atomic works to BA processes
- `Context7MCPTool` - Fetches current BA process documentation via MCP

**Input**:
- `intermediate-results/02-extraction.md` (via CrewAI context)
- `catalogs/atomic-works.yaml`
- `catalogs/ba-processes.yaml`
- Optional context from BV, HLA, NFR

**Output**: `intermediate-results/03-decomposition.md`

**Task Definition**:
```python
decomposition_task = Task(
    description=load_prompt("prompts/decomposition-agent.md"),
    expected_output="""Decomposition results including:
    - For each requirement: list of applicable atomic works
    - For each atomic work: mapping to BA processes (one work can map to multiple)
    - Rationale for each decomposition decision
    - Traceability links back to source requirements
    - Summary of total atomic works identified""",
    agent=decomposition_agent,
    context=[extraction_task],
    output_file="intermediate-results/03-decomposition.md"
)
```

**Prompt File**: `prompts/decomposition-agent.md`

**Output Schema**:
```yaml
decomposition:
  - requirement_id: REQ-001
    atomic_works:
      - work_id: AW-001
        work_name: "Write user story"
        ba_process_mappings: ["7.1", "7.2"]  # Analysis processes
        rationale: "..."
      - work_id: AW-002
        work_name: "Create use case diagram"
        ba_process_mappings: ["7.5"]
        rationale: "..."
```

### 5. EstimationAgent (CrewAI Agent)

**Responsibility**: Apply coefficients and calculate PERT estimates

**CrewAI Configuration**:
```python
estimation_agent = Agent(
    role="PERT Estimation Specialist",
    goal="Calculate accurate effort estimates using PERT methodology and complexity coefficients",
    backstory="""You are an expert in applying complexity coefficients and calculating 
    PERT estimates. You understand how factors like legacy system integration, reverse 
    engineering needs, and integration complexity affect BA work effort. You excel at 
    aggregating estimates across multiple dimensions (requirement, work type, BA process).""",
    tools=[CoefficientDetectorTool(), PERTCalculatorTool(), AggregatorTool()],
    verbose=True,
    allow_delegation=False
)
```

**Custom Tools**:
- `CoefficientDetectorTool` - Detects applicable coefficients from context
- `PERTCalculatorTool` - Calculates PERT estimates with formula (O + 4M + P) / 6
- `AggregatorTool` - Aggregates estimates by various dimensions

**Input**:
- `intermediate-results/03-decomposition.md` (via CrewAI context)
- `catalogs/atomic-works.yaml` (for base estimates)
- `catalogs/coefficients.yaml`
- Optional context from HLA, NFR, RAID

**Output**: `intermediate-results/04-estimation.md`

**Task Definition**:
```python
estimation_task = Task(
    description=load_prompt("prompts/estimation-agent.md"),
    expected_output="""Estimation results including:
    - For each atomic work: base PERT values (O/M/P)
    - Applied coefficients with rationale
    - Adjusted PERT values after coefficients
    - Expected hours calculated using PERT formula
    - Aggregations by requirement, work type, and BA process
    - Total BA hours for initiative
    - All values rounded to 0.5 hour precision""",
    agent=estimation_agent,
    context=[decomposition_task],
    output_file="intermediate-results/04-estimation.md"
)
```

**Prompt File**: `prompts/estimation-agent.md`

**Output Schema**:
```yaml
estimates:
  - requirement_id: REQ-001
    atomic_work_id: AW-001
    base_estimates:
      optimistic: 2.0
      most_likely: 4.0
      pessimistic: 6.0
    coefficients_applied:
      - name: "Legacy integration"
        multiplier: 1.5
        rationale: "..."
    adjusted_estimates:
      optimistic: 3.0
      most_likely: 6.0
      pessimistic: 9.0
    expected_hours: 6.0

aggregations:
  by_requirement: [...]
  by_work_type: [...]
  by_ba_process: [...]
  total_hours: 120.5
```

### 6. ReportGenerationAgent (CrewAI Agent)

**Responsibility**: Generate final markdown report and CSV breakdown

**CrewAI Configuration**:
```python
report_agent = Agent(
    role="Report Generation Specialist",
    goal="Generate comprehensive, clear estimation reports with RAID context",
    backstory="""You are an expert in creating clear, actionable estimation documentation. 
    You understand how to present complex estimation data in a way that supports decision-making. 
    You excel at organizing information by multiple dimensions (BA process, requirement, work type) 
    and incorporating RAID context to provide complete transparency.""",
    tools=[MarkdownGeneratorTool(), CSVGeneratorTool(), RAIDExtractorTool(), LanguageDetectorTool()],
    verbose=True,
    allow_delegation=False
)
```

**Custom Tools**:
- `MarkdownGeneratorTool` - Generates formatted markdown reports
- `CSVGeneratorTool` - Generates CSV breakdowns with UTF-8 BOM encoding
- `RAIDExtractorTool` - Extracts RAID context from artifacts
- `LanguageDetectorTool` - Detects document language (Ukrainian/English)

**Input**:
- `intermediate-results/04-estimation.md` (via CrewAI context)
- All original input files (for traceability)
- `raid.md` (if available)

**Output**: 
- `report.md`
- `breakdown.csv`
- `intermediate-results/05-report-generation.md`

**Task Definition**:
```python
report_task = Task(
    description=load_prompt("prompts/report-agent.md"),
    expected_output="""Final reports including:
    - Markdown report with executive summary, breakdowns, RAID context, traceability
    - CSV breakdown with all calculation details
    - Report in same language as input documents
    - UTF-8 with BOM encoding for CSV
    - All required sections properly formatted""",
    agent=report_agent,
    context=[estimation_task],
    output_file="intermediate-results/05-report-generation.md"
)
```

**Prompt File**: `prompts/report-agent.md`

**Report Sections**:
- Executive summary
- Input artifacts and versions
- Total BA hours estimate
- Breakdown by BA process (35 processes in 6 categories)
- Breakdown by requirement (for descoping)
- Breakdown by atomic work type
- RAID context
- Detailed explanations per requirement
- Traceability information

### 7. Langfuse Observability Manager

**Responsibility**: Track and report agent execution metrics using Langfuse

**Implementation**:
```python
from langfuse.decorators import observe, langfuse_context
from langfuse import Langfuse

class ObservabilityManager:
    """Manages Langfuse observability integration."""
    
    def __init__(self):
        self.langfuse = Langfuse(
            public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
            secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
            host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        )
    
    @observe()
    def track_agent_execution(self, agent_name: str, operation: str):
        """Track agent execution with Langfuse span."""
        with langfuse_context.observe(
            name=f"{agent_name}_{operation}",
            metadata={"agent": agent_name, "operation": operation}
        ):
            # Agent execution happens here
            pass
    
    def generate_dashboard(self, output_folder: str):
        """Generate observability dashboard from Langfuse traces."""
        # Fetch traces from Langfuse API
        traces = self.langfuse.get_traces()
        
        # Aggregate metrics
        dashboard = {
            "execution_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "agents": [],
            "total_tokens": 0,
            "total_duration_seconds": 0,
            "bottlenecks": [],
            "anomalies": []
        }
        
        # Process traces and build dashboard
        for trace in traces:
            agent_metrics = self._extract_agent_metrics(trace)
            dashboard["agents"].append(agent_metrics)
            dashboard["total_tokens"] += agent_metrics["tokens_total"]
        
        # Identify bottlenecks
        dashboard["bottlenecks"] = self._identify_bottlenecks(dashboard["agents"])
        
        # Detect anomalies
        dashboard["anomalies"] = self._detect_anomalies(dashboard["agents"])
        
        # Save dashboard
        dashboard_path = os.path.join(output_folder, "observability", "dashboard.json")
        os.makedirs(os.path.dirname(dashboard_path), exist_ok=True)
        with open(dashboard_path, 'w', encoding='utf-8') as f:
            json.dump(dashboard, f, indent=2, ensure_ascii=False)
        
        return dashboard
    
    def display_progress(self, agent_name: str, percentage: float, operation: str):
        """Display real-time progress indicator."""
        if self.verbose:
            bar_length = 40
            filled = int(bar_length * percentage / 100)
            bar = '█' * filled + '░' * (bar_length - filled)
            print(f"\r{agent_name}: [{bar}] {percentage:.1f}% - {operation}", end='', flush=True)
```

**Tracked Metrics**:
- Execution timeline (start/end times, duration)
- Token usage (input/output per agent)
- Memory consumption
- Error traces with stack information
- Data flow sizes (input/output characters)
- Performance bottlenecks
- Anomaly detection

**Output**: 
- `observability/<timestamp>-execution.json`
- `observability/dashboard.json`
- Real-time console output (if --verbose)

**Langfuse Features Used**:
- `@observe()` decorator for automatic tracing
- `langfuse_context.observe()` for manual span creation
- Trace API for fetching execution data
- Metadata tagging for agent identification

### 8. Logging System

**Responsibility**: Structured logging for debugging and audit

**Interface**:
- `log(level, message, context)` - Log with structured context
- `set_correlation_id(id)` - Set request correlation ID
- `rotate_logs()` - Manage log file rotation

**Output**: `logs/<timestamp>-execution.log`

**Log Format**: JSON structured logging
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "correlation_id": "uuid",
  "agent": "validation",
  "message": "Validating input folder",
  "context": {
    "folder": "/path/to/input",
    "files_found": ["business-vision.md", "stakeholder-requirements.md"]
  },
  "metrics": {
    "duration_ms": 150,
    "memory_mb": 45.2
  }
}
```

### 9. Catalog Manager

**Responsibility**: Load and validate reference catalogs

**Interface**:
- `load_atomic_works()` - Load atomic works catalog
- `load_ba_processes()` - Load BA processes catalog
- `load_coefficients()` - Load coefficients catalog
- `validate_catalog(catalog_type)` - Validate structure
- `get_catalog_version(catalog_type)` - Get version info

**Validation Rules**:
- YAML syntax correctness
- Required fields present
- Value ranges valid (e.g., coefficients 0.5-3.0)
- Process mappings reference valid BA processes
- No duplicate IDs

### 10. Error Handler

**Responsibility**: Centralized error handling and user-friendly messages

**Interface**:
- `handle_error(error, context)` - Process error and generate message
- `suggest_resolution(error_type)` - Provide actionable suggestions
- `save_partial_results(agent_name, data)` - Preserve work on failure

**Error Categories**:
- Input errors (missing files, invalid format)
- Validation errors (insufficient data)
- Processing errors (AI service failure, timeout)
- System errors (disk space, permissions)

## Data Models

### Input Artifacts

**Business Vision (business-vision.md)**
```yaml
initiative_name: string
description: string
goals: list[string]
stakeholders: list[string]
scope: string
constraints: list[string]
```

**Stakeholder Requirements Document (stakeholder-requirements.md)**
```yaml
requirements:
  - id: string (optional, will be assigned if missing)
    title: string
    description: string
    type: functional | non-functional
    priority: high | medium | low
    acceptance_criteria: list[string]
```

**High-Level Architecture (high-level-architecture.md)**
```yaml
system_components: list[string]
integrations: list[string]
legacy_systems: list[string]
technology_stack: list[string]
```

**Non-Functional Requirements (non-functional-requirements.md)**
```yaml
performance: dict
security: dict
scalability: dict
reliability: dict
risks: list[string]
```

**RAID (raid.md)**
```yaml
risks:
  - id: string
    description: string
    impact: high | medium | low
    mitigation: string

assumptions:
  - id: string
    description: string
    validation: string

issues:
  - id: string
    description: string
    status: open | resolved
    resolution: string

dependencies:
  - id: string
    description: string
    type: internal | external
    status: pending | resolved
```

### Atomic Work

```yaml
id: string  # e.g., "AW-001"
name: string  # e.g., "Write user story"
description: string
category: string  # e.g., "Requirements Documentation"
base_estimates:
  optimistic: float  # hours
  most_likely: float  # hours
  pessimistic: float  # hours
applicability_conditions: list[string]
ba_process_mappings: list[string]  # e.g., ["7.1", "7.2"]
version: string
```

### BA Process

```yaml
id: string  # e.g., "7.1"
name: string  # e.g., "Analyze Current State"
category: string  # One of 6 BABOK categories
description: string
typical_activities: list[string]
```

### Coefficient

```yaml
id: string  # e.g., "COEF-001"
name: string  # e.g., "Legacy System Integration"
multiplier: float  # 0.5 to 3.0
applicability_conditions: list[string]
detection_rules: list[string]  # Keywords or patterns to detect in artifacts
version: string
```

### Requirement (Extracted)

```yaml
id: string  # e.g., "REQ-001"
original_text: string
normalized_text: string
type: functional | non-functional
priority: high | medium | low
flags: list[string]  # e.g., ["ambiguous", "incomplete"]
source_section: string
source_file: string
```

### Decomposition Result

```yaml
requirement_id: string
atomic_works:
  - work_id: string
    work_name: string
    work_category: string
    ba_process_mappings: list[string]
    rationale: string
    base_estimates:
      optimistic: float
      most_likely: float
      pessimistic: float
```

### Estimation Result

```yaml
requirement_id: string
atomic_work_id: string
atomic_work_name: string
atomic_work_type: string
ba_process_mappings: list[string]
base_estimates:
  optimistic: float
  most_likely: float
  pessimistic: float
coefficients_applied:
  - name: string
    multiplier: float
    rationale: string
adjusted_estimates:
  optimistic: float
  most_likely: float
  pessimistic: float
expected_hours: float  # (O + 4M + P) / 6
```

### Aggregation Models

**By Requirement**
```yaml
requirement_id: string
requirement_text: string
total_hours: float
percentage_of_total: float
atomic_works_count: int
atomic_works: list[string]
```

**By Atomic Work Type**
```yaml
work_type: string
total_hours: float
percentage_of_total: float
instances_count: int
requirements_affected: list[string]
```

**By BA Process**
```yaml
process_id: string  # e.g., "7.1"
process_name: string
category: string  # One of 6 BABOK categories
total_hours: float
percentage_of_total: float
atomic_works_mapped: list[string]
```

### Observability Data

```yaml
execution_id: string  # UUID
timestamp_start: datetime
timestamp_end: datetime
total_duration_seconds: float
status: success | failure | partial

agents:
  - name: string
    timestamp_start: datetime
    timestamp_end: datetime
    duration_seconds: float
    status: success | failure
    tokens_input: int
    tokens_output: int
    memory_mb: float
    input_size_chars: int
    output_size_chars: int
    warnings: list[string]
    errors: list[dict]

bottlenecks:
  - agent_name: string
    duration_seconds: float
    reason: string

anomalies:
  - type: string  # e.g., "high_token_usage", "slow_execution"
    agent_name: string
    description: string
    severity: high | medium | low

total_tokens_used: int
total_memory_peak_mb: float
```

### Report Output

**Markdown Report Structure**
```markdown
# BA Work Estimation Report

## Executive Summary
- Initiative: [name]
- Estimation Date: [date]
- Total BA Hours: [hours]
- Confidence Level: [based on input quality]

## Input Artifacts
- business-vision.md (modified: [date])
- stakeholder-requirements.md (modified: [date])
- [optional files]

## Total Estimate
[Total hours with breakdown]

## Breakdown by BA Process
[35 processes organized in 6 categories with hours]

## Breakdown by Requirement (Descoping Support)
[Requirements sorted by hours contribution]

## Breakdown by Atomic Work Type
[Work types with hours]

## RAID Context
### Risks
[Key risks affecting estimate]

### Assumptions
[Key assumptions made]

### Issues
[Issues affecting accuracy]

### Dependencies
[Dependencies impacting scope]

## Detailed Requirement Analysis
[For each requirement: atomic works, coefficients, calculations]

## Traceability
- System Version: [version]
- Catalog Versions: [versions]
- Correlation ID: [uuid]
- Intermediate Results: [folder path]
- Observability Data: [file path]
```

**CSV Breakdown Structure**
```csv
requirement_id,requirement_text,atomic_work,atomic_work_type,ba_process_mapping,coefficients,O_estimate,M_estimate,P_estimate,expected_hours
REQ-001,"User login functionality","Write user story","Requirements Documentation","7.1|7.2","Legacy:1.5",3.0,6.0,9.0,6.0
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all 24 requirements with 150+ acceptance criteria, I identified the following redundancies and consolidations:

**Redundancy Analysis**:
- File format reading (1.2, 1.3, 1.4) can be combined into single property about supported formats
- Required file validation (2.1, 2.2, 2.3, 2.4) can be combined into property about required files
- Intermediate file generation (9.2-9.6) can be combined into single property about all agent outputs
- Aggregation properties (6.5, 6.6, 6.7) can be combined into single property about aggregation correctness
- Traceability fields (14.1-14.8) can be combined into properties about required metadata

**Consolidated Properties**:
The following properties eliminate redundancy while maintaining complete coverage of all testable acceptance criteria.

### Property 1: File Format Support

*For any* folder containing Discovery artifacts, the system should successfully read all files in TXT, MD, and CSV formats, and should ignore (not process) files in DOCX, XLSX, or PPTX formats.

**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

### Property 2: Required File Validation

*For any* input folder, if either `business-vision.md` or `stakeholder-requirements.md` is missing, the system should return an "insufficient data" error message listing the missing files, without performing estimation.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**

### Property 3: Content Sufficiency Validation

*For any* input folder with required files present, if the BV file is empty or lacks an initiative description, or if the ShRD file contains no requirements, the system should return an "insufficient data" error without performing estimation.

**Validates: Requirements 2.5, 2.6**

### Property 4: Requirement Extraction Completeness

*For any* ShRD document containing N requirements, the extraction agent should extract exactly N requirements, each with a unique ID, and preserve the original text for traceability.

**Validates: Requirements 3.1, 3.2, 3.8**

### Property 5: Requirement ID Uniqueness

*For any* set of extracted requirements, no two requirements should have the same ID.

**Validates: Requirements 3.2**

### Property 6: Atomic Work Decomposition Traceability

*For any* requirement that is decomposed into atomic works, each atomic work should have a traceability link back to its source requirement ID.

**Validates: Requirements 4.1, 4.7**

### Property 7: BA Process Mapping Completeness

*For any* atomic work identified during decomposition, that work should be mapped to at least one of the 35 standard BA processes.

**Validates: Requirements 4.4, 4.5, 4.8**

### Property 8: PERT Formula Correctness

*For any* atomic work with optimistic (O), most-likely (M), and pessimistic (P) estimates, the expected hours should equal (O + 4M + P) / 6.

**Validates: Requirements 6.4**

### Property 9: Coefficient Range Validation

*For any* coefficient applied during estimation, the multiplier value should be between 0.5 and 3.0 inclusive.

**Validates: Requirements 5.9**

### Property 10: Aggregation Consistency

*For any* completed estimation, the sum of hours across all requirements should equal the sum of hours across all atomic work types, which should equal the sum of hours across all BA processes, which should equal the total BA hours.

**Validates: Requirements 6.5, 6.6, 6.7, 6.8**

### Property 11: Hour Precision Rounding

*For any* final hour estimate in the report, the value should be rounded to 0.5 hour precision (e.g., 3.0, 3.5, 4.0, but not 3.2 or 3.7).

**Validates: Requirements 6.10**

### Property 12: Intermediate File Generation

*For any* successful execution, the system should create exactly 5 intermediate markdown files in the `intermediate-results/` subfolder, named `01-validation.md`, `02-extraction.md`, `03-decomposition.md`, `04-estimation.md`, and `05-report-generation.md`.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

### Property 13: Intermediate File Metadata Completeness

*For any* intermediate file generated by an agent, the file should contain a metadata section with timestamp start, timestamp end, duration, agent version, status, and correlation ID.

**Validates: Requirements 9.7**

### Property 14: CSV Structure Validation

*For any* generated CSV breakdown file, the file should contain a header row with the columns: requirement_id, requirement_text, atomic_work, atomic_work_type, ba_process_mapping, coefficients, O_estimate, M_estimate, P_estimate, expected_hours.

**Validates: Requirements 8.2, 8.7**

### Property 15: CSV Row Count Consistency

*For any* generated CSV breakdown file, the number of data rows (excluding header) should equal the total number of atomic work instances across all requirements.

**Validates: Requirements 8.3**

### Property 16: CSV Encoding Validation

*For any* generated CSV file, the file encoding should be UTF-8 with BOM to support Ukrainian text.

**Validates: Requirements 8.5**

### Property 17: Report Language Consistency

*For any* input folder where the primary language (detected from BV) is Ukrainian or English, the generated report should be in the same language as the input documents.

**Validates: Requirements 23.4, 23.6**

### Property 18: Requirement Descoping Support

*For any* requirement in the estimation, the report should show that requirement's total hours contribution and percentage of total, enabling descoping analysis.

**Validates: Requirements 10.2, 10.8**

### Property 19: Requirements Sorted by Contribution

*For any* generated report, the requirements in the descoping section should be sorted in descending order by hours contribution.

**Validates: Requirements 10.5**

### Property 20: Sequential Agent Execution

*For any* execution of the CrewAI crew, agents should execute in the exact order: ValidationAgent, ExtractionAgent, DecompositionAgent, EstimationAgent, ReportGenerationAgent.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

### Property 21: Agent Context Propagation

*For any* agent after ValidationAgent, that agent should receive the output from the previous agent as context through CrewAI's task context mechanism.

**Validates: Requirements 11.6, 11.7**

### Property 22: Agent Failure Handling

*For any* agent that fails during execution, the system should stop the pipeline, report which agent failed, and preserve any intermediate results generated up to that point.

**Validates: Requirements 11.8**

### Property 23: Prompt File Validation

*For any* system startup, the system should validate that all 5 prompt files exist in the `prompts/` folder before beginning execution, and should fail with a clear error if any are missing.

**Validates: Requirements 11.10, 11.12**

### Property 24: CLI Exit Code Correctness

*For any* execution, the system should return exit code 0 on success and a non-zero exit code on failure.

**Validates: Requirements 12.7**

### Property 25: Error Message Stream Routing

*For any* error that occurs during execution, the error message should be written to stderr, not stdout.

**Validates: Requirements 12.6**

### Property 26: RAID Section Presence

*For any* generated report, the report should include a RAID section with subsections for Risks, Assumptions, Issues, and Dependencies.

**Validates: Requirements 13.1, 13.4, 13.5, 13.6, 13.7**

### Property 27: Traceability Information Completeness

*For any* generated report, the traceability section should include: list of input files used, file modification dates, system version, estimation timestamp, and reference to intermediate results folder.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

### Property 28: Observability Metrics Collection

*For any* agent execution, the Langfuse observability system should track and record: start time, end time, duration, tokens used (input and output), memory usage, and status (success/failure).

**Validates: Requirements 24.1, 24.2**

### Property 29: Observability Dashboard Generation

*For any* completed execution, the system should generate an `observability/dashboard.json` file containing aggregated metrics, execution timeline, token usage breakdown, and bottleneck identification.

**Validates: Requirements 24.2, 24.8, 24.10**

### Property 30: Agent Timeout Enforcement

*For any* agent execution that exceeds 120 seconds, the system should terminate that agent, save partial results, and report a timeout error.

**Validates: Requirements 15.7, 15.8**

### Property 31: Catalog Structure Validation

*For any* system startup, the system should validate that all three catalog files (atomic-works.yaml, ba-processes.yaml, coefficients.yaml) exist, are valid YAML, and contain required fields, failing with specific validation errors if any catalog is invalid.

**Validates: Requirements 16.1, 16.9, 16.10**

### Property 32: Execution Time Logging

*For any* agent execution, the system should measure and log the execution time for that agent in both the intermediate file and the observability dashboard.

**Validates: Requirements 18.7, 20.4**

## Error Handling

### Error Categories and Handling Strategy

The system implements comprehensive error handling across all components using a centralized error handler that provides user-friendly messages and actionable suggestions.

#### 1. Input Errors

**File System Errors**:
- **Missing folder**: Return clear error with the folder path that was not found
- **Missing required files**: List specific files missing (BV, ShRD) with full paths
- **Unsupported file formats**: Warn about DOCX/XLSX/PPTX files and suggest converting to TXT/MD
- **File read errors**: Report which file cannot be read and check permissions

**Encoding Errors**:
- **Non-UTF-8 files**: Attempt to detect encoding using chardet library
- **If detection succeeds**: Convert to UTF-8 and proceed with warning
- **If detection fails**: Report error with suggestion to save file as UTF-8

**Content Errors**:
- **Empty files**: Report which file is empty and suggest adding content
- **Missing required content**: Specify what's missing (e.g., "BV lacks initiative description")

#### 2. Validation Errors

**Insufficient Data**:
- **Missing required files**: Return "insufficient data" message without estimation
- **Empty or invalid content**: Return "insufficient data" with specific issues listed
- **Message format**: "Insufficient data for estimation. Missing: [list]. Please provide these artifacts and retry."

**Catalog Validation Errors**:
- **Missing catalog files**: Report which catalog is missing
- **Invalid YAML syntax**: Report line number and syntax error
- **Missing required fields**: List which fields are missing from which catalog entries
- **Invalid value ranges**: Report which coefficients are outside 0.5-3.0 range

#### 3. Processing Errors

**AI Service Errors**:
- **API failures**: Log full error details, suggest retry with exponential backoff
- **Rate limiting**: Wait and retry automatically up to 3 times
- **Token limit exceeded**: Suggest breaking down input or using smaller context
- **Timeout**: Save partial results, report which agent timed out, suggest retry

**Parsing Errors**:
- **ShRD parsing failure**: Report which section failed to parse
- **YAML parsing failure**: Report line number and syntax error
- **JSON parsing failure**: Report which intermediate file is corrupted

**Agent Execution Errors**:
- **Agent failure**: Stop pipeline, report which agent failed and why
- **Task context missing**: Report which agent expected context that wasn't provided
- **Tool execution failure**: Report which tool failed and with what error

#### 4. System Errors

**Disk Space**:
- **Check before writing**: Verify sufficient disk space before generating reports
- **If insufficient**: Report required vs available space, suggest cleanup

**Permissions**:
- **Read permission errors**: Report which file cannot be read, suggest checking permissions
- **Write permission errors**: Report which folder cannot be written to, suggest checking permissions

**Memory**:
- **Monitor memory usage**: Track memory consumption during execution
- **If approaching limits**: Warn user and suggest processing smaller batches

### Error Message Format

All error messages follow a consistent format:

```
ERROR: [Brief description]

Details:
- [Specific detail 1]
- [Specific detail 2]

Suggestion:
[Actionable suggestion for resolution]

For more information, see logs at: [log file path]
```

### Error Recovery Strategy

**Partial Results Preservation**:
- On any agent failure, save intermediate results generated up to that point
- Include error information in the last intermediate file
- Allow users to inspect partial results for debugging

**Retry Mechanism**:
- Automatic retry for transient errors (API rate limits, network issues)
- Exponential backoff: 1s, 2s, 4s delays
- Maximum 3 retry attempts
- Log all retry attempts

**Graceful Degradation**:
- If optional files are missing, proceed with warning
- If RAID context cannot be extracted, infer from other artifacts
- If observability tracking fails, continue execution but log warning

### Logging for Error Diagnosis

All errors are logged with:
- Full stack trace
- Correlation ID for tracing across agents
- Context information (which file, which agent, what operation)
- Timestamp
- Langfuse trace ID for observability

## Testing Strategy

### Dual Testing Approach

The system requires both **unit testing** and **property-based testing** for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary

### Unit Testing

**Focus Areas**:
- Specific examples that demonstrate correct behavior
- Integration points between CrewAI agents
- Edge cases (empty files, malformed YAML, missing sections)
- Error conditions (missing files, invalid formats, timeouts)

**Unit Test Examples**:

```python
def test_validation_agent_with_missing_bv():
    """Test that validation fails when BV is missing."""
    # Specific example: folder with only ShRD
    result = run_validation_agent("test_data/missing_bv")
    assert result.status == "FAIL"
    assert "business-vision.md" in result.missing_files

def test_extraction_agent_with_empty_shrd():
    """Test that extraction handles empty ShRD gracefully."""
    # Edge case: empty ShRD file
    result = run_extraction_agent("test_data/empty_shrd")
    assert result.status == "FAIL"
    assert "no requirements found" in result.error_message

def test_pert_calculation_example():
    """Test PERT formula with specific values."""
    # Specific example: O=2, M=4, P=6
    result = calculate_pert(optimistic=2.0, most_likely=4.0, pessimistic=6.0)
    assert result == 4.0  # (2 + 4*4 + 6) / 6 = 4.0

def test_csv_encoding_with_ukrainian_text():
    """Test CSV generation with Ukrainian characters."""
    # Edge case: Ukrainian text in requirements
    requirements = [{"id": "REQ-001", "text": "Користувач може увійти"}]
    csv_path = generate_csv(requirements, "test_output")
    
    # Verify UTF-8 with BOM encoding
    with open(csv_path, 'rb') as f:
        assert f.read(3) == b'\xef\xbb\xbf'  # UTF-8 BOM
```

**Unit Test Organization**:
```
tests/
├── unit/
│   ├── test_validation_agent.py
│   ├── test_extraction_agent.py
│   ├── test_decomposition_agent.py
│   ├── test_estimation_agent.py
│   ├── test_report_agent.py
│   ├── test_catalog_manager.py
│   ├── test_error_handler.py
│   └── test_observability.py
├── integration/
│   ├── test_crew_execution.py
│   ├── test_end_to_end.py
│   └── test_langfuse_integration.py
└── fixtures/
    ├── valid_input/
    ├── missing_files/
    ├── invalid_formats/
    └── edge_cases/
```

### Property-Based Testing

**Property Testing Library**: Use **Hypothesis** (Python) for property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with reference to design property
- Tag format: `# Feature: ba-work-ai-evaluation, Property {number}: {property_text}`

**Property Test Examples**:

```python
from hypothesis import given, strategies as st
import hypothesis

# Feature: ba-work-ai-evaluation, Property 8: PERT Formula Correctness
@given(
    optimistic=st.floats(min_value=0.1, max_value=100.0),
    most_likely=st.floats(min_value=0.1, max_value=100.0),
    pessimistic=st.floats(min_value=0.1, max_value=100.0)
)
@hypothesis.settings(max_examples=100)
def test_pert_formula_property(optimistic, most_likely, pessimistic):
    """For any O, M, P values, expected hours should equal (O + 4M + P) / 6."""
    expected = calculate_pert(optimistic, most_likely, pessimistic)
    manual_calculation = (optimistic + 4 * most_likely + pessimistic) / 6
    assert abs(expected - manual_calculation) < 0.001  # floating point tolerance

# Feature: ba-work-ai-evaluation, Property 5: Requirement ID Uniqueness
@given(st.lists(st.text(min_size=1), min_size=1, max_size=50))
@hypothesis.settings(max_examples=100)
def test_requirement_id_uniqueness_property(requirement_texts):
    """For any set of requirements, all IDs should be unique."""
    requirements = extract_requirements_from_texts(requirement_texts)
    ids = [req.id for req in requirements]
    assert len(ids) == len(set(ids))  # No duplicates

# Feature: ba-work-ai-evaluation, Property 10: Aggregation Consistency
@given(
    st.lists(
        st.fixed_dictionaries({
            'requirement_id': st.text(min_size=1),
            'hours': st.floats(min_value=0.5, max_value=100.0)
        }),
        min_size=1,
        max_size=30
    )
)
@hypothesis.settings(max_examples=100)
def test_aggregation_consistency_property(requirement_data):
    """For any estimation, sum by requirements should equal sum by work types should equal total."""
    estimation = create_estimation_from_data(requirement_data)
    
    total_by_requirements = sum(r.hours for r in estimation.by_requirement)
    total_by_work_types = sum(w.hours for w in estimation.by_work_type)
    total_by_processes = sum(p.hours for p in estimation.by_ba_process)
    total_hours = estimation.total_hours
    
    assert abs(total_by_requirements - total_hours) < 0.01
    assert abs(total_by_work_types - total_hours) < 0.01
    assert abs(total_by_processes - total_hours) < 0.01

# Feature: ba-work-ai-evaluation, Property 11: Hour Precision Rounding
@given(st.floats(min_value=0.1, max_value=1000.0))
@hypothesis.settings(max_examples=100)
def test_hour_rounding_property(raw_hours):
    """For any hour value, final rounded value should be multiple of 0.5."""
    rounded = round_to_half_hour(raw_hours)
    assert (rounded * 2) % 1 == 0  # Multiplying by 2 should give integer

# Feature: ba-work-ai-evaluation, Property 9: Coefficient Range Validation
@given(st.floats(min_value=-10.0, max_value=10.0))
@hypothesis.settings(max_examples=100)
def test_coefficient_range_property(coefficient_value):
    """For any coefficient, if valid it should be between 0.5 and 3.0."""
    is_valid = validate_coefficient(coefficient_value)
    if is_valid:
        assert 0.5 <= coefficient_value <= 3.0
    else:
        assert coefficient_value < 0.5 or coefficient_value > 3.0
```

**Property Test Organization**:
```
tests/
├── properties/
│   ├── test_file_handling_properties.py
│   ├── test_validation_properties.py
│   ├── test_extraction_properties.py
│   ├── test_decomposition_properties.py
│   ├── test_estimation_properties.py
│   ├── test_report_properties.py
│   └── test_observability_properties.py
```

### Integration Testing

**CrewAI Integration Tests**:
- Test full crew execution with valid inputs
- Test agent context propagation
- Test sequential execution order
- Test failure handling and partial results

**Langfuse Integration Tests**:
- Test observability data collection
- Test trace generation
- Test dashboard creation
- Test metrics accuracy

**End-to-End Tests**:
- Test complete workflow from CLI to final reports
- Test with various input combinations (minimal, full, missing optional files)
- Test with Ukrainian and English documents
- Test error scenarios (missing files, invalid formats, timeouts)

### Test Data Strategy

**Fixtures**:
- `valid_input/` - Complete set of valid Discovery artifacts
- `minimal_input/` - Only BV and ShRD (minimum required)
- `missing_files/` - Various combinations of missing files
- `invalid_formats/` - DOCX, XLSX, PPTX files to test rejection
- `edge_cases/` - Empty files, malformed YAML, special characters
- `ukrainian_input/` - Ukrainian language documents
- `english_input/` - English language documents

**Synthetic Data Generation**:
- Use Hypothesis strategies to generate random requirements
- Generate random atomic works and coefficients
- Generate random PERT values within valid ranges

### Manual Testing

**Pilot Group Testing**:
- Real BA users test with actual Discovery artifacts
- Collect feedback on estimation accuracy
- Validate report clarity and usefulness
- Test descoping workflow
- Verify RAID context quality

**Test Scenarios**:
1. Small project (5-10 requirements)
2. Medium project (20-30 requirements)
3. Large project (50+ requirements)
4. Project with high complexity (legacy systems, integrations)
5. Project with minimal context (only BV + ShRD)
6. Project with full context (all optional files)

### Performance Testing

**Benchmarks**:
- Typical project (20-30 requirements) should complete within 5 minutes
- Track execution time per agent
- Monitor token usage and costs
- Monitor memory consumption

**Performance Tests**:
```python
def test_performance_typical_project():
    """Test that typical project completes within 5 minutes."""
    start_time = time.time()
    result = run_estimation("test_data/typical_project")
    duration = time.time() - start_time
    
    assert duration < 300  # 5 minutes
    assert result.status == "SUCCESS"
```

### Continuous Testing

**Test Execution**:
- Run unit tests on every commit
- Run property tests nightly (due to longer execution time)
- Run integration tests before releases
- Run performance tests weekly

**Coverage Goals**:
- Unit test coverage: >80% of code
- Property test coverage: All 32 correctness properties
- Integration test coverage: All agent interactions
- End-to-end test coverage: All major workflows

### Test Documentation

Each test should include:
- Clear description of what is being tested
- Reference to requirement or property being validated
- Expected behavior
- Edge cases covered
- Known limitations

Example:
```python
def test_requirement_extraction_completeness():
    """
    Test: Requirement Extraction Completeness
    Property: Property 4
    Validates: Requirements 3.1, 3.2, 3.8
    
    For any ShRD document containing N requirements, the extraction agent 
    should extract exactly N requirements, each with a unique ID, and 
    preserve the original text for traceability.
    
    Edge cases:
    - Requirements with complex formatting
    - Requirements split across multiple lines
    - Requirements with nested lists
    
    Known limitations:
    - Does not handle requirements in tables (out of scope for MVP)
    """
    # Test implementation
    pass
```
