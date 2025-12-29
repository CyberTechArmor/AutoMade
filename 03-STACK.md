# 03 - Stack

**Purpose:** Define the approved technology stack and criteria for evaluating alternatives. Consistency across projects enables knowledge transfer, reduces onboarding time, and simplifies maintenance.

---

## Stack Philosophy

### Why Standardize?

Every technology choice is a maintenance burden. Each tool requires:
- Learning (documentation, tutorials, trial and error)
- Keeping current (security patches, version upgrades)
- Debugging (understanding failure modes, edge cases)
- Integration (making it work with everything else)

Standardizing means we invest deeply in fewer tools rather than superficially in many.

### When to Deviate

A tool outside this stack may be used when:

1. **The approved tool cannot solve the problem** (not "isn't ideal"—cannot)
2. **The alternative passes the evaluation criteria** (see below)
3. **The deviation is documented** in the project's `DECISIONS.md`

"I prefer X" or "X is newer" are not valid reasons to deviate.

---

## Approved Stack

### Core Runtime

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| Language | TypeScript | 5.x | Strict mode enabled |
| Runtime | Node.js | 22.x LTS | Use current LTS |
| Package Manager | npm | 10.x | Lock file committed |

### Backend

| Purpose | Tool | Notes |
|---------|------|-------|
| HTTP Framework | Express | Minimal, well-understood |
| Validation | Zod | Runtime + TypeScript types |
| ORM | Drizzle | TypeScript-native, clean SQL |
| Real-time | Socket.io | When WebSocket needed |
| Job Queue | BullMQ | Redis-backed, when async jobs needed |
| API Documentation | Scalar + OpenAPI | Design-first, spec-driven |

### Database

| Purpose | Tool | Notes |
|---------|------|-------|
| Primary Database | PostgreSQL | 16.x |
| Cache / Queue Backend | Redis | 7.x, when needed |
| Search | PostgreSQL Full-Text | Use pg_trgm; Elasticsearch only if proven insufficient |
| Object Storage | S3-compatible | Garage (default), MinIO, or customer's choice |

### Frontend (when applicable)

| Purpose | Tool | Notes |
|---------|------|-------|
| Framework | React | 18.x with hooks |
| Build | Vite | Fast, ESM-native |
| Styling | Tailwind CSS | Utility-first |
| State | Zustand | Simple, when needed |
| Forms | React Hook Form + Zod | Validation shared with backend |

### Infrastructure

| Purpose | Tool | Notes |
|---------|------|-------|
| Containerization | Docker | Single Dockerfile per service |
| Orchestration (simple) | Docker Compose | Local dev, single-node prod |
| Orchestration (scale) | Docker Swarm | Multi-node, HA |
| Orchestration (enterprise) | Kubernetes | Only when Swarm insufficient |
| Reverse Proxy | Traefik | Automatic TLS, Docker-native |
| Registry | GitHub Container Registry | ghcr.io |

### Development

| Purpose | Tool | Notes |
|---------|------|-------|
| Version Control | Git + GitHub | |
| CI/CD | GitHub Actions | |
| Linting | ESLint | Flat config (eslint.config.js) |
| Formatting | Prettier | Run via ESLint |
| Testing | Vitest | Compatible with Jest API |
| API Testing | Supertest | Integration tests |

### Observability

| Purpose | Tool | Notes |
|---------|------|-------|
| Logging | Pino | Structured JSON logs |
| Metrics | Prometheus | When needed |
| Visualization | Grafana | When needed |
| Tracing | OpenTelemetry | When needed (start simple) |

### Security

| Purpose | Tool | Notes |
|---------|------|-------|
| Authentication | Custom JWT + Refresh | See auth pattern below |
| Password Hashing | Argon2id | Via argon2 package |
| Encryption | libsodium | Via sodium-native |
| Secrets (dev) | .env files | git-ignored |
| Secrets (prod) | Environment variables | Docker secrets for Swarm |

---

## Authentication Pattern

All projects use this authentication approach:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AUTHENTICATION FLOW                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Login: POST /auth/login                                            │
│     → Validate credentials                                              │
│     → Return { accessToken (15min), refreshToken (7d) }                │
│     → refreshToken stored in httpOnly cookie                           │
│                                                                         │
│  2. API Requests: Authorization: Bearer {accessToken}                  │
│     → Validate JWT signature and expiry                                 │
│     → Extract user context                                              │
│                                                                         │
│  3. Token Refresh: POST /auth/refresh                                  │
│     → Validate refreshToken from cookie                                 │
│     → Rotate refreshToken (invalidate old)                             │
│     → Return new accessToken                                            │
│                                                                         │
│  4. Logout: POST /auth/logout                                          │
│     → Invalidate refreshToken in database                              │
│     → Clear cookie                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**External Auth Providers:**

When integrating with external identity providers:

| Provider Type | Approach |
|---------------|----------|
| OAuth 2.0 / OIDC | Passport.js strategies → convert to internal JWT |
| SAML | passport-saml → convert to internal JWT |
| Custom SSO | Evaluate per case, document in ADR |

The internal JWT format remains consistent regardless of how the user authenticated.

---

## Tool Evaluation Criteria

When the approved stack cannot solve a problem, evaluate alternatives against these criteria. All criteria must be satisfied unless explicitly waived with documented rationale.

### Required Criteria

| Criterion | Requirement | How to Verify |
|-----------|-------------|---------------|
| **License** | Open source: MIT, Apache 2.0, BSD, AGPL, MPL | Check LICENSE file |
| **Maintenance** | Commit in last 6 months | GitHub activity |
| **Security** | No unpatched critical CVEs | `npm audit`, Snyk, GitHub advisories |
| **Scale** | Used in production by 100+ companies OR handles documented scale | Case studies, benchmarks |
| **TypeScript** | First-class TS support or excellent types | Try importing, check @types |
| **Documentation** | Complete API docs, getting started guide | Read the docs |

### Evaluation Criteria

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| **Integration** | High | Works with existing stack without adapters |
| **Simplicity** | High | Mid-level dev can understand in 30 minutes |
| **Community** | Medium | Active issues, responsive maintainers |
| **Longevity** | Medium | Stable API, semantic versioning |
| **Performance** | Medium | Meets our scale requirements (10k users) |

### Evaluation Template

```markdown
# Tool Evaluation: [Tool Name]

## Problem Being Solved
[What gap in the approved stack are we addressing?]

## Candidate: [Tool Name]
- License: [license]
- GitHub: [url]
- Last commit: [date]
- Stars/Downloads: [metrics]

## Required Criteria
- [ ] Open source license: [license name]
- [ ] Active maintenance: [last commit date]
- [ ] No critical CVEs: [audit result]
- [ ] Proven scale: [evidence]
- [ ] TypeScript support: [native / @types / none]
- [ ] Documentation quality: [assessment]

## Evaluation Criteria
| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Integration | | |
| Simplicity | | |
| Community | | |
| Longevity | | |
| Performance | | |

## Recommendation
[Accept / Reject / Accept with conditions]

## If Accepted
- Add to approved stack: [Yes / No - project-specific only]
- Conditions: [any constraints on usage]
```

---

## Version Policy

### Node.js and TypeScript

Use current LTS versions. Update when:
- New LTS is released (annually, typically April)
- Security patches are released (immediately)

### Dependencies

```bash
# Check for outdated packages
npm outdated

# Check for security issues
npm audit
```

Update policy:
- **Patch versions**: Update freely, test, commit
- **Minor versions**: Update in dedicated PR, run full test suite
- **Major versions**: Evaluate breaking changes, document in ADR, dedicated PR

### Lock Files

- `package-lock.json` is always committed
- `npm ci` used in CI/CD (not `npm install`)
- Renovate or Dependabot for automated update PRs (optional, recommended)

---

## Stack Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRACTIONATE STACK                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CLIENT                                                          │   │
│  │  React + Vite + Tailwind + Zustand                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  EDGE                                                            │   │
│  │  Traefik (TLS termination, routing, rate limiting)              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  API                                                             │   │
│  │  Express + Zod + Drizzle                                        │   │
│  │  ├── REST endpoints (OpenAPI)                                   │   │
│  │  ├── WebSocket (Socket.io) when needed                          │   │
│  │  └── Background jobs (BullMQ) when needed                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│  │  PostgreSQL       │  │  Redis            │  │  S3 (Garage)      │   │
│  │  Primary data     │  │  Cache, sessions  │  │  File storage     │   │
│  │                   │  │  Job queue        │  │                   │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Starting a New Project

```bash
# Initialize
npm init -y
npm pkg set type="module"

# Core dependencies
npm install express zod drizzle-orm postgres pino

# Dev dependencies  
npm install -D typescript @types/node @types/express \
  drizzle-kit vitest supertest eslint prettier \
  @typescript-eslint/parser @typescript-eslint/eslint-plugin

# TypeScript config
npx tsc --init --target ES2022 --module NodeNext \
  --moduleResolution NodeNext --strict --outDir dist

# Drizzle config
npx drizzle-kit init
```

See [TEMPLATES/project-init.md](TEMPLATES/project-init.md) for complete setup script.
