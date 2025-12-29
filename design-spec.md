# Design Specification Template

**Project:** [Project Name]  
**Version:** 1.0  
**Date:** YYYY-MM-DD  
**Author:** [Name]  
**Status:** Draft / Review / Approved

---

## 1. Overview

### 1.1 Purpose

[One paragraph describing what this system does and for whom]

### 1.2 Background

[Link to Requirements Document or brief summary of the problem being solved]

### 1.3 Goals

- [Goal 1]
- [Goal 2]

### 1.4 Non-Goals

- [Explicitly not trying to achieve X]
- [Out of scope: Y]

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        [System Name]                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Client    │───▶│    API      │───▶│  Database   │        │
│  │   (React)   │    │  (Express)  │    │ (PostgreSQL)│        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                            │                                    │
│                            ▼                                    │
│                     ┌─────────────┐                            │
│                     │  External   │                            │
│                     │  Services   │                            │
│                     └─────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| [name] | [purpose] | [tech] |

### 2.3 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| [decision] | [what was chosen] | [why] |

[Link to ADRs for detailed decisions]

---

## 3. API Design

### 3.1 API Overview

**Base URL:** `https://api.example.com/v1`

**Authentication:** Bearer token (JWT)

**Rate Limiting:** 100 requests/minute per user

### 3.2 Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Authenticate user |
| GET | /users | List users |
| POST | /users | Create user |
| GET | /users/{id} | Get user by ID |
| PATCH | /users/{id} | Update user |
| DELETE | /users/{id} | Delete user |

### 3.3 Endpoint Details

#### POST /auth/login

**Description:** Authenticate user and receive tokens

**Request:**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

**Response (401):**
```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

#### GET /users

**Description:** List users with pagination

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | no | 1 | Page number |
| limit | integer | no | 20 | Items per page (max 100) |
| role | string | no | - | Filter by role |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "User Name",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

[Continue for each endpoint...]

### 3.4 Error Responses

All errors follow this format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| AUTHENTICATION_REQUIRED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

### 3.5 OpenAPI Specification

Full specification: [openapi.yaml](./openapi.yaml)

---

## 4. Data Model

### 4.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│   users     │       │   posts     │
├─────────────┤       ├─────────────┤
│ id (PK)     │───┐   │ id (PK)     │
│ email       │   └──▶│ author_id   │
│ ...         │       │ ...         │
└─────────────┘       └─────────────┘
```

### 4.2 Table Definitions

#### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| email | TEXT | NOT NULL, UNIQUE | User email |
| password_hash | TEXT | NOT NULL | Argon2id hash |
| display_name | TEXT | NOT NULL | Display name |
| role | TEXT | NOT NULL, DEFAULT 'user' | User role |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete |

**Indexes:**
- `users_email_idx` UNIQUE on (email)
- `users_role_idx` on (role)

#### posts

[Continue for each table...]

### 4.3 Audit Log Schema

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| timestamp | TIMESTAMPTZ | Event time |
| actor_id | UUID | User who performed action |
| actor_type | TEXT | 'user', 'system', 'api_key' |
| action | TEXT | 'user.create', 'post.update', etc. |
| resource_type | TEXT | Type of affected resource |
| resource_id | UUID | ID of affected resource |
| before_state | JSONB | State before change |
| after_state | JSONB | State after change |
| hash | TEXT | Hash for tamper detection |

---

## 5. Security Design

### 5.1 Authentication Flow

```
┌────────┐                    ┌────────┐                    ┌────────┐
│ Client │                    │  API   │                    │   DB   │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │  POST /auth/login           │                             │
    │  {email, password}          │                             │
    │────────────────────────────▶│                             │
    │                             │  Lookup user                │
    │                             │────────────────────────────▶│
    │                             │                             │
    │                             │  User record                │
    │                             │◀────────────────────────────│
    │                             │                             │
    │                             │  Verify password            │
    │                             │  Generate tokens            │
    │                             │                             │
    │  {accessToken, refresh...}  │                             │
    │◀────────────────────────────│                             │
    │                             │                             │
```

### 5.2 Authorization Matrix

| Resource | Action | Admin | Manager | User | Guest |
|----------|--------|-------|---------|------|-------|
| users | create | ✓ | | | |
| users | read | ✓ | ✓ | Own | |
| users | update | ✓ | ✓ | Own | |
| users | delete | ✓ | | | |
| posts | create | ✓ | ✓ | ✓ | |
| posts | read | ✓ | ✓ | ✓ | ✓ |
| posts | update | ✓ | ✓ | Own | |
| posts | delete | ✓ | ✓ | | |

### 5.3 Data Encryption

| Data Type | At Rest | In Transit |
|-----------|---------|------------|
| Passwords | Argon2id hash | TLS 1.3 |
| PHI fields | AES-256-GCM | TLS 1.3 |
| Files | AES-256-GCM | TLS 1.3 |
| Tokens | - | TLS 1.3 |

---

## 6. Compliance Mapping

### 6.1 Compliance Mode

**Selected mode:** ☐ Standard / ☐ HIPAA / ☐ GDPR

### 6.2 Requirements Mapping

| Requirement | Design Element | Implementation |
|-------------|----------------|----------------|
| Audit logging | audit_logs table | All data access logged |
| Encryption at rest | AES-256-GCM | Sensitive columns encrypted |
| Access control | RBAC | Role-based middleware |
| Data retention | Soft delete + purge job | Configurable retention period |

---

## 7. Integration Design

### 7.1 External System: [System Name]

**Purpose:** [Why we integrate]

**Authentication:** OAuth 2.0 / API Key / etc.

**Endpoints Used:**

| Our Action | Their Endpoint | Method |
|------------|----------------|--------|
| [action] | [endpoint] | GET/POST |

**Data Mapping:**

| Our Field | Their Field | Transform |
|-----------|-------------|-----------|
| user.id | external_id | None |
| user.email | email_address | None |

**Error Handling:**
- Retry on: 429, 500, 502, 503, 504
- Max retries: 3
- Backoff: Exponential (1s, 2s, 4s)

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (p95) | < 200ms | Prometheus histogram |
| Database query time (p95) | < 50ms | Query logging |
| Concurrent users | 1,000 | Load testing |

### 8.2 Availability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| RTO | 4 hours |
| RPO | 1 hour |

### 8.3 Scalability

| Dimension | Current | Target | Approach |
|-----------|---------|--------|----------|
| Users | 100 | 10,000 | Horizontal scaling |
| Data | 1 GB | 100 GB | PostgreSQL partitioning |
| Requests | 10/s | 100/s | Add replicas |

---

## 9. Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| [question] | [name] | [date] | [pending/resolved: answer] |

---

## 10. Appendix

### 10.1 Glossary

| Term | Definition |
|------|------------|
| [term] | [definition] |

### 10.2 References

- [Requirements Document](./requirements.md)
- [ADR-001: Database Choice](./docs/adr/001-database.md)
- [OpenAPI Specification](./openapi.yaml)

---

## Approval

| Role | Name | Date | Approved |
|------|------|------|----------|
| Technical Lead | | | ☐ |
| Security Review | | | ☐ |
| Product Owner | | | ☐ |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | [name] | Initial design |
