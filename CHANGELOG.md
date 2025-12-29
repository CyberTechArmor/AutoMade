# Changelog

All notable changes to the Fractionate Development Standard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- [Feature or document to be added]

### Changed
- [Modification to existing standard]

### Deprecated
- [Feature or tool being phased out]

### Removed
- [Feature or tool removed from standard]

---

## [1.0.0] - 2024-12-28

### Added

**Core Documents**
- `00-OVERVIEW.md` — Development standard overview, principles, quick reference
- `01-DISCOVERY.md` — Requirements gathering process, personas, success criteria
- `02-DESIGN.md` — API-first design, data modeling, compliance mapping
- `03-STACK.md` — Approved technology stack, evaluation criteria
- `04-BUILD.md` — Code structure, patterns, testing standards
- `05-DEPLOY.md` — Container strategy, CI/CD, environments, scaling
- `06-OPERATE.md` — Observability, maintenance, incident response
- `07-SECURITY.md` — Authentication, encryption, compliance checklists

**Templates**
- `TEMPLATES/project-init.md` — Project initialization guide with all boilerplate
- `TEMPLATES/tool-evaluation.md` — Tool evaluation checklist
- `TEMPLATES/requirements-doc.md` — Requirements document template

**Approved Stack (Initial)**
- Runtime: Node.js 22 LTS, TypeScript 5.x
- Backend: Express, Zod, Drizzle, Socket.io
- Database: PostgreSQL 16, Redis 7
- Storage: S3-compatible (Garage default)
- Frontend: React 18, Vite, Tailwind
- Infrastructure: Docker, Docker Swarm, Traefik, GHCR
- Development: GitHub Actions, ESLint, Vitest
- Observability: Pino (logging), Prometheus/Grafana (metrics)
- Security: JWT + Refresh tokens, Argon2id, libsodium

**Compliance Support**
- HIPAA Security Rule checklist
- GDPR requirements checklist
- SOC 2 Trust Services Criteria mapping
- Audit logging specification with hash chaining

---

## Version Numbering

This standard uses semantic versioning:

- **Major (X.0.0)**: Breaking changes to process, significant stack changes, removed tools
- **Minor (0.X.0)**: New documents, new approved tools, expanded guidance
- **Patch (0.0.X)**: Typo fixes, clarifications, minor template updates

---

## Review Schedule

This standard is reviewed quarterly. Next review: **March 2025**

Review considerations:
- Tools nearing end-of-life
- New tools gaining adoption
- Lessons learned from projects
- Security vulnerabilities requiring stack changes
- Industry standard updates (Node LTS, etc.)

---

## How to Propose Changes

1. Create an issue in the dev-standard repository describing the change
2. Include rationale and impact assessment
3. For tool changes, complete the Tool Evaluation Template
4. Submit PR with proposed changes
5. Review period: 1 week for minor changes, 2 weeks for major
6. Approval required from at least one other team member
