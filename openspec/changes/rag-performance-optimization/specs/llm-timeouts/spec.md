## ADDED Requirements

### Requirement: LLM request timeout configuration

The system SHALL support configurable timeout settings for LLM API requests.

#### Scenario: Default timeout applied

- **WHEN** no timeout is configured
- **THEN** a default timeout of 60 seconds is applied to all LLM requests

#### Scenario: Custom timeout from environment

- **WHEN** LLM_TIMEOUT_MS environment variable is set
- **THEN** the configured value is used as the request timeout

#### Scenario: Timeout triggers error

- **WHEN** an LLM request exceeds the timeout duration
- **THEN** the request is cancelled and a timeout error is thrown

### Requirement: Timeout at multiple levels

The system SHALL apply timeouts at both the HTTP client and LangChain levels.

#### Scenario: HTTP client timeout

- **WHEN** an LLM request is made
- **THEN** the HTTP client (OpenAI-compatible) has a timeout configured

#### Scenario: LangChain timeout

- **WHEN** an LLM request is made via LangChain
- **THEN** the LangChain call has a timeout configured

### Requirement: Timeout error handling

The system SHALL handle timeout errors gracefully.

#### Scenario: Timeout error logged

- **WHEN** a timeout error occurs
- **THEN** the error is logged with request details and timeout duration

#### Scenario: Timeout error propagated

- **WHEN** a timeout error occurs
- **THEN** the error is propagated to the calling node for handling
