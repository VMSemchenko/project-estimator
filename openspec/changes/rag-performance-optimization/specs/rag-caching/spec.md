## ADDED Requirements

### Requirement: RAG cache stores similarity search results

The system SHALL cache RAG similarity search results in an in-memory cache with a configurable TTL (default: 1 hour).

#### Scenario: Cache hit returns cached results

- **WHEN** a RAG query is made with text that matches a cached entry (normalized)
- **THEN** the system returns the cached results without making a new vector search

#### Scenario: Cache miss performs search and stores results

- **WHEN** a RAG query is made with text not in the cache
- **THEN** the system performs the vector search and stores the results in cache

#### Scenario: Cache entries expire after TTL

- **WHEN** a cache entry is older than the configured TTL
- **THEN** the system treats it as a cache miss and performs a new search

### Requirement: Cache key normalization

The system SHALL normalize query text before using it as a cache key.

#### Scenario: Whitespace normalization

- **WHEN** query text has multiple spaces or leading/trailing whitespace
- **THEN** the cache key is generated with single spaces and no leading/trailing whitespace

#### Scenario: Case normalization

- **WHEN** query text has mixed case
- **THEN** the cache key is generated in lowercase

### Requirement: Cache statistics tracking

The system SHALL track cache hit/miss statistics for monitoring.

#### Scenario: Cache stats available

- **WHEN** cache statistics are requested
- **THEN** the system returns hits, misses, hit rate, and current cache size

### Requirement: Cache invalidation

The system SHALL provide a mechanism to clear the cache.

#### Scenario: Manual cache clear

- **WHEN** cache clear is requested via CLI or API
- **THEN** all cache entries are removed
