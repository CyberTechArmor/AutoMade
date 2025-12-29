# 02 - Design

**Purpose:** Define what we're building with enough precision that implementation is straightforward. API contracts, data models, and compliance mapping are locked before code begins.

---

## Design Philosophy

### Design-First, Not Code-First

We write specifications before implementations. This means:

1. **OpenAPI spec** written and reviewed before any route handlers
2. **Database schema** designed and reviewed before any migrations run
3. **Integration contracts** defined before external systems are called

Why? Because changing a spec is free. Changing code is expensive. Changing deployed systems is very expensive.

### The Consumer Perspective

Every API is designed from the perspective of who will consume it:

- **Human developers**: Clear naming, predictable patterns, helpful errors
- **AI agents (MCP)**: Structured responses, discoverable endpoints, typed schemas
- **Future maintainers**: Self-documenting, no magic, obvious intent

---

## Design Outputs

Every project must produce these artifacts before moving to Build:

| Artifact | Purpose |
|----------|---------|
| OpenAPI Specification | Complete API contract (endpoints, schemas, auth) |
| Data Model | Database schema with relationships and constraints |
| Compliance Mapping | How each compliance requirement is satisfied |
| Integration Contracts | External system interfaces and data flows |
| Architecture Decision Records | Key technical decisions with rationale |

---

## OpenAPI Specification

### Requirements

Every API must have an OpenAPI 3.1 specification that includes:

```yaml
openapi: 3.1.0
info:
  title: [Project Name] API
  version: 1.0.0
  description: |
    [One paragraph description]
    
    ## Authentication
    [How to authenticate]
    
    ## Rate Limits
    [Rate limit policy]
    
    ## Errors
    [Error format description]

servers:
  - url: http://localhost:3000
    description: Local development
  - url: https://staging.example.com
    description: Staging
  - url: https://api.example.com
    description: Production

security:
  - bearerAuth: []

paths:
  # All endpoints defined here

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    # All request/response schemas defined here
    
    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
          description: Machine-readable error code
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional context (validation errors, etc.)
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Endpoints | Plural nouns, kebab-case | `/users`, `/chat-rooms` |
| Path parameters | Singular, camelCase | `/users/{userId}` |
| Query parameters | camelCase | `?pageSize=20&sortBy=createdAt` |
| Request/response bodies | PascalCase schemas | `CreateUserRequest`, `UserResponse` |
| Enum values | SCREAMING_SNAKE_CASE | `"USER_ACTIVE"`, `"USER_SUSPENDED"` |

### Endpoint Design

```yaml
# Good: Clear, predictable, RESTful
/users:
  get:    # List users
  post:   # Create user
/users/{userId}:
  get:    # Get single user
  patch:  # Update user (partial)
  delete: # Delete user

# Bad: Verbs in URLs, unclear intent
/getUser:
/createNewUser:
/users/update:
```

### Error Responses

All errors follow this structure:

```yaml
ErrorResponse:
  type: object
  required: [code, message]
  properties:
    code:
      type: string
      enum:
        - VALIDATION_ERROR
        - AUTHENTICATION_REQUIRED
        - FORBIDDEN
        - NOT_FOUND
        - CONFLICT
        - RATE_LIMITED
        - INTERNAL_ERROR
    message:
      type: string
    details:
      type: object
      additionalProperties: true
```

HTTP status codes:
- `400`: Validation error, malformed request
- `401`: Not authenticated
- `403`: Authenticated but not authorized
- `404`: Resource not found
- `409`: Conflict (duplicate, state mismatch)
- `429`: Rate limited
- `500`: Internal error (never expose details)

---

## Data Model

### Schema Design Principles

1. **Normalize by default**: Duplicate data creates sync problems
2. **UUID primary keys**: Avoid sequential IDs (information leakage)
3. **Timestamps everywhere**: `created_at`, `updated_at` on every table
4. **Soft delete pattern**: `deleted_at` timestamp, never hard delete (compliance)
5. **Audit trail**: Separate audit log, never modify history

### Required Columns

Every table includes:

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at  TIMESTAMPTZ  -- NULL = active, timestamp = soft deleted
```

### Schema Documentation

Every table and column must be documented:

```typescript
// schema.ts (Drizzle example)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  /** User's email address. Used for login and notifications. */
  email: text('email').notNull().unique(),
  
  /** Argon2id hash of user's password. Never store plaintext. */
  passwordHash: text('password_hash').notNull(),
  
  /** User's display name. Shown in UI, not unique. */
  displayName: text('display_name').notNull(),
  
  /** Role for authorization. See RBAC documentation. */
  role: text('role', { enum: ['admin', 'user', 'guest'] })
    .notNull()
    .default('user'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
```

### Relationships

Document all relationships with cardinality:

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │  messages   │       │   rooms     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │    ┌──│ id (PK)     │
│ email       │  │    │ sender_id   │────┘  │ name        │
│ ...         │  └───>│ room_id     │───────│ ...         │
└─────────────┘       │ content     │       └─────────────┘
                      │ ...         │
       1:N            └─────────────┘            1:N
   (user has many         |              (room has many
    messages)             |               messages)
                          |
                     N:1 to users
                     N:1 to rooms
```

---

## Compliance Mapping

For each compliance requirement (from [07-SECURITY.md](07-SECURITY.md)), document how the design satisfies it:

### HIPAA Mapping Example

| Requirement | Design Solution | Implementation |
|-------------|-----------------|----------------|
| Unique user identification | `users.id` UUID, no shared accounts | Auth middleware validates session |
| Audit logging | `audit_logs` table, append-only | Trigger on all data access |
| Access controls | RBAC with role column | Authorization middleware |
| Encryption at rest | PostgreSQL TDE or application-level | AES-256-GCM for PHI columns |
| Encryption in transit | TLS 1.3 required | nginx/traefik terminates TLS |
| Automatic logoff | Session timeout configurable | JWT expiry + refresh token rotation |
| Data retention | `deleted_at` soft delete + retention job | Cron job enforces retention policy |

---

## Integration Contracts

For each external system, document:

```yaml
# integrations/athenahealth.yaml
name: athenahealth
type: REST API
authentication:
  type: OAuth 2.0
  flow: client_credentials
  token_endpoint: https://api.athenahealth.com/oauth2/token

rate_limits:
  requests_per_second: 10
  daily_limit: 50000

endpoints_used:
  - name: Get Patient
    method: GET
    path: /patients/{patientid}
    purpose: Retrieve patient demographics for display
    
  - name: Create Appointment
    method: POST
    path: /appointments
    purpose: Book appointments from our scheduling UI

error_handling:
  retry_on: [429, 500, 502, 503, 504]
  max_retries: 3
  backoff: exponential

data_mapping:
  athena_patient_id: users.external_id
  athena_practice_id: organizations.athena_id
```

---

## Architecture Decision Records (ADRs)

Document significant technical decisions using this format:

```markdown
# ADR-001: Use PostgreSQL over MongoDB

## Status
Accepted

## Context
We need a database for [project]. Options considered:
- PostgreSQL (relational)
- MongoDB (document)
- SQLite (embedded)

## Decision
We will use PostgreSQL.

## Rationale
- Fractionate standard requires PostgreSQL unless technically impossible
- Relational model fits our data (users, messages, relationships)
- Strong ACID guarantees needed for compliance
- Drizzle ORM provides excellent TypeScript integration

## Consequences
- Must manage PostgreSQL instance
- Schema migrations required for changes
- Joins are efficient; denormalization rarely needed

## Alternatives Rejected
- MongoDB: No strong reason to deviate from standard
- SQLite: Won't scale to concurrent users requirement
```

Store ADRs in `docs/adr/` within each project.

---

## Design Review Checklist

Before moving to Build, confirm:

### API Design
- [ ] OpenAPI spec is complete (all endpoints, schemas, auth)
- [ ] All endpoints follow naming conventions
- [ ] Error responses are consistent
- [ ] Authentication/authorization documented
- [ ] Rate limiting defined

### Data Model
- [ ] All tables have required columns (id, timestamps)
- [ ] Relationships documented with cardinality
- [ ] Indexes identified for query patterns
- [ ] Soft delete implemented for compliance
- [ ] Columns documented

### Compliance
- [ ] Compliance mode selected (HIPAA/GDPR/none)
- [ ] All requirements mapped to design elements
- [ ] Audit log schema defined
- [ ] Encryption approach documented

### Integrations
- [ ] All external systems documented
- [ ] Authentication flows defined
- [ ] Error handling specified
- [ ] Data mappings clear

### Decisions
- [ ] ADRs written for significant choices
- [ ] Deviations from standard documented

---

## Templates

See [TEMPLATES/design-spec.md](TEMPLATES/design-spec.md) for a complete design specification template.
