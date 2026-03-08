# High-Level Architecture: Healthcare Patient Portal

## Architecture Overview

The platform follows a microservices architecture with event-driven communication, designed for healthcare compliance and high availability.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Web Portal  │  │  iOS App     │  │  Android App │          │
│  │  (React)     │  │  (Swift)     │  │  (Kotlin)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│  - Rate Limiting                                                 │
│  - OAuth 2.0 / SMART on FHIR                                    │
│  - Request Routing                                               │
│  - Audit Logging                                                 │
│  - WAF Protection                                                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Spring Cloud Microservices                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Patient   │  │  Appoint-  │  │  Medical   │                │
│  │  Service   │  │  ment Svc  │  │  Records   │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Messaging │  │  Prescrip- │  │  Billing   │                │
│  │  Service   │  │  tion Svc  │  │  Service   │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Telehealth│  │  Notif     │  │  Integrat. │                │
│  │  Service   │  │  Service   │  │  Service   │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Event & Data Layer                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  PostgreSQL│  │  Redis     │  │  Kafka     │                │
│  │  (Primary) │  │  (Cache)   │  │  (Events)  │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│  ┌────────────┐  ┌────────────┐                                 │
│  │  Elastic   │  │  MinIO/S3  │                                 │
│  │  (Search)  │  │  (Files)   │                                 │
│  └────────────┘  └────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **State Management**: React Query + Zustand
- **UI Library**: Material-UI (MUI) with custom theming
- **Build Tool**: Vite
- **Testing**: Jest, React Testing Library, Cypress

### Backend

- **Framework**: Spring Boot 3.x
- **Language**: Java 21 (LTS)
- **Build Tool**: Gradle with Kotlin DSL
- **ORM**: Spring Data JPA + Hibernate
- **Security**: Spring Security with OAuth 2.0
- **Validation**: Bean Validation (Jakarta)

### Infrastructure

- **Cloud Provider**: AWS (HIPAA-eligible)
- **Container Orchestration**: Kubernetes (EKS)
- **Service Mesh**: Istio for mTLS
- **CI/CD**: GitHub Actions with security scanning
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack with audit log separation

### External Services

- **EHR Integration**: Epic, Cerner via HL7 FHIR
- **Video**: Twilio Video for telehealth
- **Email/SMS**: AWS SES/SNS
- **Storage**: AWS S3 with encryption
- **Identity Verification**: ID.me integration

## Service Descriptions

### Patient Service

Manages patient identity and demographics.

- Patient registration and verification
- Profile management
- Emergency contacts
- Insurance information
- Consent management

### Appointment Service

Handles scheduling and calendar management.

- Provider availability management
- Appointment booking and cancellation
- Recurring appointments
- Waitlist management
- Calendar sync (iCal, Google)

### Medical Records Service

Provides access to clinical data.

- Lab results display
- Visit summaries
- Immunization records
- Allergy information
- Clinical notes (with provider approval)

### Messaging Service

Secure patient-provider communication.

- Threaded conversations
- Attachment support
- Read receipts
- Auto-routing to care team
- Message retention policies

### Prescription Service

Medication management.

- Active medications list
- Refill request workflow
- Pharmacy selection
- Drug interaction warnings
- Medication history

### Billing Service

Financial management.

- Statement viewing
- Online payment processing
- Payment plans
- Insurance claims status
- Price estimates

### Telehealth Service

Video consultation platform.

- Video session management
- Waiting room experience
- Screen sharing
- Session recording (with consent)
- Technical quality monitoring

### Notification Service

Multi-channel notifications.

- Appointment reminders
- Lab result notifications
- Message alerts
- Medication reminders
- Preference management

### Integration Service

EHR and external system connectivity.

- FHIR R4 API implementation
- Epic integration
- Cerner integration
- HIE (Health Information Exchange)
- Data transformation layer

## Security Architecture

### Authentication & Authorization

- SMART on FHIR OAuth 2.0 flows
- Multi-factor authentication (SMS, TOTP)
- Session management with secure tokens
- Role-based access control (RBAC)
- Attribute-based access for PHI

### Data Protection

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Field-level encryption for SSN, DOB
- Data masking for non-privileged access
- Secure key management (AWS KMS)

### Audit & Compliance

- Comprehensive audit logging
- Immutable audit trail
- Break-the-glass access logging
- Regular access reviews
- Automated compliance reporting

## Data Models

### Core Entities

```java
// Patient
@Entity
public class Patient {
    @Id private UUID id;
    private String mrn; // Medical Record Number
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private String ssn; // Encrypted
    private String email;
    private String phone;
    private Address address;
    private EmergencyContact emergencyContact;
    private Instant createdAt;
    private Instant updatedAt;
}

// Appointment
@Entity
public class Appointment {
    @Id private UUID id;
    private UUID patientId;
    private UUID providerId;
    private UUID locationId;
    private AppointmentType type;
    private Instant scheduledTime;
    private Duration duration;
    private AppointmentStatus status;
    private String notes;
}

// MedicalRecord
@Entity
public class MedicalRecord {
    @Id private UUID id;
    private UUID patientId;
    private RecordType type;
    private String title;
    private LocalDate recordDate;
    private String content; // JSON or reference
    private AccessLevel accessLevel;
}
```

## API Design

### FHIR R4 Endpoints

- `GET /fhir/R4/Patient/{id}` - Get patient demographics
- `GET /fhir/R4/Observation?patient={id}` - Get lab results
- `GET /fhir/R4/MedicationRequest?patient={id}` - Get medications
- `POST /fhir/R4/Appointment` - Schedule appointment

### Custom Endpoints

- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/mfa/verify` - MFA verification
- `GET /api/v1/appointments` - List appointments
- `POST /api/v1/messages` - Send message
- `POST /api/v1/prescriptions/{id}/refill` - Request refill

## Deployment Architecture

### Environments

- Development (non-PHI)
- Staging (synthetic data)
- Production (PHI with full compliance)

### High Availability

- Multi-AZ deployment
- Database replication
- Automatic failover
- Disaster recovery site

### Monitoring

- Real-time alerting
- SLA dashboards
- Security event monitoring
- Performance metrics
