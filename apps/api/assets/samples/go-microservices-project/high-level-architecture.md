# High-Level Architecture: Real-time Analytics Platform

## Architecture Overview

The platform follows an event-driven microservices architecture optimized for high-throughput data ingestion and real-time processing.

```
┌─────────────────────────────────────────────────────────────────┐
│                        IoT Devices                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Sensors     │  │  Industrial  │  │  Edge        │          │
│  │  (MQTT)      │  │  Systems     │  │  Gateways    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Ingestion Layer                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  MQTT      │  │  HTTP      │  │  Kafka     │                │
│  │  Broker    │  │  API       │  │  Ingress   │                │
│  │  (Mosquitto│  │  Gateway   │  │            │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Processing Layer (Go Services)               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Ingest    │  │  Stream    │  │  Alert     │                │
│  │  Service   │  │  Processor │  │  Engine    │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Device    │  │  Query     │  │  ML        │                │
│  │  Registry  │  │  Service   │  │  Service   │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌────────────┐  ┌────────────┐                                 │
│  │  Notif     │  │  Report    │                                 │
│  │  Service   │  │  Service   │                                 │
│  └────────────┘  └────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  TimescaleDB│  │  Redis     │  │  Kafka     │                │
│  │  (Metrics) │  │  (Cache)   │  │  (Events)  │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌────────────┐  ┌────────────┐                                 │
│  │  ClickHouse│  │  MinIO/S3  │                                 │
│  │  (Analytics│  │  (Objects) │                                 │
│  └────────────┘  └────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query + Zustand
- **Charts**: Apache ECharts for real-time visualizations
- **UI Library**: Ant Design with custom theming
- **Build Tool**: Vite

### Backend

- **Language**: Go 1.22+
- **Framework**: Gin (HTTP), gRPC for internal services
- **Architecture**: Clean Architecture with hexagonal ports
- **Validation**: go-playground/validator
- **Testing**: testify, gomock

### Infrastructure

- **Cloud Provider**: AWS (primary), on-premise option
- **Container Orchestration**: Kubernetes
- **Service Mesh**: Linkerd for mTLS
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki + Grafana

### Data Infrastructure

- **Time-series**: TimescaleDB (PostgreSQL extension)
- **Analytics**: ClickHouse for OLAP queries
- **Message Queue**: Apache Kafka
- **Cache**: Redis Cluster
- **Object Storage**: MinIO (S3-compatible)

### Protocols

- **IoT Ingestion**: MQTT 5.0, CoAP
- **Internal**: gRPC with Protocol Buffers
- **External API**: REST, GraphQL (optional)
- **Real-time**: WebSocket for dashboards

## Service Descriptions

### Ingest Service

High-throughput data ingestion.

- MQTT subscriber for device telemetry
- HTTP endpoint for batch uploads
- Data validation and normalization
- Kafka event publishing
- Rate limiting per device

### Stream Processor

Real-time data processing.

- Kafka stream consumer
- Windowed aggregations
- Data enrichment
- Downsample for long-term storage
- Dead letter queue handling

### Alert Engine

Real-time alerting system.

- Rule evaluation engine
- Threshold-based alerts
- Anomaly score integration
- Alert deduplication
- Escalation policies

### Device Registry

Device lifecycle management.

- Device registration and provisioning
- Metadata management
- Device groups and tags
- Certificate management
- Device health monitoring

### Query Service

Data query interface.

- Time-range queries
- Aggregation queries
- GraphQL API for flexible queries
- Query result caching
- Rate limiting

### ML Service

Machine learning inference.

- Anomaly detection models
- Predictive maintenance scoring
- Model serving with ONNX
- Feature extraction
- Model versioning

### Notification Service

Multi-channel notifications.

- Email alerts (SMTP)
- SMS alerts (Twilio)
- Webhook notifications
- Slack/Teams integration
- Notification templates

### Report Service

Scheduled reporting.

- PDF report generation
- Scheduled report delivery
- Custom report builder
- Data export (CSV, JSON)

## Data Models

### Core Entities

```go
// Device represents an IoT device
type Device struct {
    ID          uuid.UUID `json:"id"`
    SerialNum   string    `json:"serial_number"`
    Name        string    `json:"name"`
    Type        string    `json:"type"`
    GroupID     uuid.UUID `json:"group_id"`
    Metadata    JSONB     `json:"metadata"`
    Status      string    `json:"status"`
    LastSeen    time.Time `json:"last_seen"`
    CreatedAt   time.Time `json:"created_at"`
}

// Telemetry represents a data point
type Telemetry struct {
    DeviceID    uuid.UUID      `json:"device_id"`
    Timestamp   time.Time      `json:"timestamp"`
    Metrics     map[string]any `json:"metrics"`
    Tags        map[string]string `json:"tags"`
}

// AlertRule defines an alerting rule
type AlertRule struct {
    ID          uuid.UUID `json:"id"`
    Name        string    `json:"name"`
    DeviceFilter string   `json:"device_filter"`
    Condition   string    `json:"condition"`
    Severity    string    `json:"severity"`
    Actions     []AlertAction `json:"actions"`
    Enabled     bool      `json:"enabled"`
}

// Alert represents a triggered alert
type Alert struct {
    ID          uuid.UUID `json:"id"`
    RuleID      uuid.UUID `json:"rule_id"`
    DeviceID    uuid.UUID `json:"device_id"`
    Message     string    `json:"message"`
    Severity    string    `json:"severity"`
    Status      string    `json:"status"`
    TriggeredAt time.Time `json:"triggered_at"`
    ResolvedAt  *time.Time `json:"resolved_at"`
}
```

## API Design

### REST Endpoints

- `POST /api/v1/devices` - Register device
- `GET /api/v1/devices/{id}` - Get device details
- `POST /api/v1/telemetry` - Ingest telemetry (batch)
- `GET /api/v1/telemetry?device={id}&from={ts}&to={ts}` - Query telemetry
- `POST /api/v1/alert-rules` - Create alert rule
- `GET /api/v1/alerts` - List alerts

### gRPC Services

```protobuf
service TelemetryService {
  rpc Ingest(stream TelemetryBatch) returns (IngestResponse);
  rpc Query(QueryRequest) returns (stream TelemetryPoint);
}

service AlertService {
  rpc Evaluate(AlertContext) returns (AlertResult);
  rpc GetActive(GetActiveRequest) returns (stream Alert);
}
```

### WebSocket Endpoints

- `WS /ws/dashboard/{dashboardId}` - Real-time dashboard updates
- `WS /ws/device/{deviceId}` - Live device telemetry

## Performance Optimizations

### Data Ingestion

- Batch writes to TimescaleDB
- Kafka partitioning by device ID
- Connection pooling for MQTT
- Protobuf for internal communication

### Query Performance

- Materialized views for common aggregations
- Query result caching in Redis
- TimescaleDB compression for historical data
- ClickHouse for analytical queries

### Scalability

- Horizontal pod autoscaling
- Kafka consumer groups
- Database read replicas
- CDN for static assets

## Deployment Options

### Cloud (SaaS)

- Multi-tenant architecture
- Shared infrastructure with isolation
- Automatic scaling

### On-Premise

- Single-tenant deployment
- Kubernetes or Docker Compose
- Air-gapped option available
