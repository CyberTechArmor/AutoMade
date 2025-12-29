# GitHub Repository Setup Guide

This guide shows how to set up a Fractionate-standard repository from scratch—**before** discovery outputs are added.

---

## Repository Types

### 1. `fractionate/dev-standard`
The standard itself. Already created.

### 2. `fractionate/[project-name]`
Individual project repositories (NEON, BOOKED, client projects).

### 3. `fractionate/templates`
Optional: Shared templates repository for quick project initialization.

---

## Standard Project Repository Structure

```
project-name/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                 # CI/CD pipeline
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── discovery/                 # ← Discovery outputs go here
│   │   ├── requirements.md        # Generated from discovery
│   │   └── discovery-data.json    # Machine-readable version
│   ├── design/
│   │   └── design-spec.md         # Design specification
│   ├── adr/                       # Architecture Decision Records
│   │   └── 000-template.md
│   └── api.md                     # Additional API documentation
├── src/                           # Source code (added during build)
├── tests/                         # Tests (added during build)
├── .env.example                   # Example environment variables
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── DECISIONS.md                   # Deviations from dev-standard
├── docker-compose.yml
├── Dockerfile
├── LICENSE
├── package.json
├── README.md
└── tsconfig.json
```

---

## Quick Setup Commands

```bash
# Create and initialize repository
mkdir project-name && cd project-name
git init

# Create directory structure
mkdir -p .github/workflows .github/ISSUE_TEMPLATE
mkdir -p docs/discovery docs/design docs/adr
mkdir -p src tests

# Create essential files
touch README.md CHANGELOG.md DECISIONS.md CONTRIBUTING.md
touch .env.example .gitignore
touch docker-compose.yml Dockerfile

# Initialize npm (if Node.js project)
npm init -y
npm pkg set type="module"
```

---

## File Templates

### README.md (Initial)

```markdown
# [Project Name]

> [One-line description]

## Status

🔴 **Discovery** — Requirements gathering in progress

## Overview

[Brief description of what this project will do]

## Documentation

- [Requirements](docs/discovery/requirements.md) — What we're building and why
- [Design Spec](docs/design/design-spec.md) — How we're building it
- [ADRs](docs/adr/) — Key technical decisions

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

## Links

- [Development Standard](https://github.com/fractionate/dev-standard)
- [Project Board](#) — Task tracking
- [Client Portal](#) — Client-facing documentation

---

*This project follows the [Fractionate Development Standard](https://github.com/fractionate/dev-standard).*
```

### DECISIONS.md

```markdown
# Technical Decisions

This document tracks deviations from the [Fractionate Development Standard](https://github.com/fractionate/dev-standard).

## Format

For each deviation:

```
### [Decision Title]
**Date:** YYYY-MM-DD
**Standard:** [Which standard section this deviates from]
**Deviation:** [What we're doing differently]
**Rationale:** [Why this deviation is necessary]
**Risk:** [Any risks introduced]
```

---

## Decisions

*No deviations yet. This project follows the standard.*
```

### CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure
- Discovery documentation

## [0.0.0] - YYYY-MM-DD

- Project initialized
```

### CONTRIBUTING.md

```markdown
# Contributing

## Development Setup

```bash
# Prerequisites
# - Node.js 22+
# - Docker

# Clone repository
git clone https://github.com/fractionate/[project-name].git
cd [project-name]

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development services
docker compose up -d

# Run development server
npm run dev
```

## Development Standard

This project follows the [Fractionate Development Standard](https://github.com/fractionate/dev-standard).

Before contributing, please review:
- [Build Standards](https://github.com/fractionate/dev-standard/blob/main/04-BUILD.md)
- [Code Patterns](https://github.com/fractionate/dev-standard/blob/main/04-BUILD.md#patterns)

## Workflow

1. Create a branch from `main`
2. Make changes following the development standard
3. Write/update tests
4. Submit PR with description of changes
5. Address review feedback
6. Merge after approval

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Maintenance

Example: `feat: add user authentication endpoint`
```

### .gitignore

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test coverage
coverage/

# Temporary files
tmp/
temp/
*.tmp

# Docker
.docker/
```

### .env.example

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://dev:dev@localhost:5432/app

# Authentication
JWT_SECRET=change-this-to-a-secure-random-string-min-32-chars
JWT_ISSUER=fractionate

# Logging
LOG_LEVEL=debug

# External Services (add as needed)
# EXTERNAL_API_KEY=
# EXTERNAL_API_URL=
```

### .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Test
        run: npm run test
```

### .github/ISSUE_TEMPLATE/bug_report.md

```markdown
---
name: Bug Report
about: Report a bug or unexpected behavior
title: '[BUG] '
labels: bug
assignees: ''
---

## Description
[Clear description of the bug]

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: 
- Node version: 
- Browser (if applicable): 

## Additional Context
[Screenshots, logs, etc.]
```

### .github/ISSUE_TEMPLATE/feature_request.md

```markdown
---
name: Feature Request
about: Suggest a new feature or enhancement
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Problem
[What problem does this solve?]

## Proposed Solution
[How should it work?]

## Alternatives Considered
[Other approaches you've thought about]

## Additional Context
[Any other relevant information]
```

### .github/PULL_REQUEST_TEMPLATE.md

```markdown
## Description
[What does this PR do?]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Code follows the development standard
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings

## Testing
[How to test these changes]

## Related Issues
Closes #[issue number]
```

### docs/adr/000-template.md

```markdown
# ADR-[NUMBER]: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the issue that we're seeing that is motivating this decision or change?]

## Decision
[What is the change that we're proposing and/or doing?]

## Consequences
[What becomes easier or more difficult to do because of this change?]

## Alternatives Considered
[What other options were evaluated?]
```

---

## Creating a New Repository

### Step 1: Create on GitHub

```bash
# Using GitHub CLI
gh repo create fractionate/project-name --private --description "Project description"

# Or create via GitHub web interface
```

### Step 2: Clone and Initialize

```bash
# Clone empty repo
git clone https://github.com/fractionate/project-name.git
cd project-name

# Run initialization script (or manually create structure)
```

### Step 3: Add Structure

Option A: **Copy from template repo**
```bash
# If you have a template repo
gh repo create fractionate/project-name --template fractionate/project-template
```

Option B: **Manual setup**
```bash
# Create directories
mkdir -p .github/workflows .github/ISSUE_TEMPLATE
mkdir -p docs/discovery docs/design docs/adr
mkdir -p src tests

# Copy template files (from dev-standard or local templates)
# ... create each file as shown above
```

### Step 4: Initial Commit

```bash
git add .
git commit -m "chore: initial project structure"
git push origin main
```

### Step 5: Configure Repository Settings

On GitHub:
- Enable branch protection for `main`
- Require PR reviews
- Enable automatic deletion of merged branches
- Set up any required secrets for CI/CD

---

## Discovery Integration

After running a discovery session, the outputs go into:

```
docs/discovery/
├── requirements.md          # Human-readable requirements
├── discovery-data.json      # Machine-readable data
└── client-report.pdf        # Client-facing document (optional)
```

The discovery session should reference the project:
- Client: [Client Name]
- Project: [This repository]
- Session ID: [Reference for traceability]

---

## Project Phases & Repository State

### Phase 1: Discovery
```
docs/discovery/
├── requirements.md          ✓ Created
└── discovery-data.json      ✓ Created
```
README status: 🔴 **Discovery**

### Phase 2: Design
```
docs/design/
├── design-spec.md           ✓ Created
├── openapi.yaml             ✓ Created (if API project)
└── data-model.md            ✓ Created
```
README status: 🟡 **Design**

### Phase 3: Build
```
src/                         ✓ Code added
tests/                       ✓ Tests added
package.json                 ✓ Dependencies defined
Dockerfile                   ✓ Container configured
```
README status: 🟢 **Development**

### Phase 4: Deploy
```
.github/workflows/ci.yml     ✓ Full pipeline
docker-compose.prod.yml      ✓ Production config
```
README status: 🔵 **Production**

---

## Initialization Script

For convenience, here's a script that creates the full structure:

```bash
#!/bin/bash
# init-project.sh

PROJECT_NAME=$1

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: ./init-project.sh <project-name>"
  exit 1
fi

# Create directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Initialize git
git init

# Create structure
mkdir -p .github/workflows .github/ISSUE_TEMPLATE
mkdir -p docs/discovery docs/design docs/adr
mkdir -p src tests

# Create files
cat > README.md << 'EOF'
# [Project Name]

> [One-line description]

## Status

🔴 **Discovery** — Requirements gathering in progress

...
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
...
EOF

# ... (create other files)

echo "Project $PROJECT_NAME initialized!"
echo "Next steps:"
echo "1. Update README.md with project details"
echo "2. Run discovery session"
echo "3. Add discovery outputs to docs/discovery/"
```

---

## Quick Reference

| Phase | Key Files | Status |
|-------|-----------|--------|
| Init | README, .gitignore, DECISIONS | 🔴 Discovery |
| Discovery | docs/discovery/* | 🔴 Discovery |
| Design | docs/design/*, openapi.yaml | 🟡 Design |
| Build | src/*, tests/*, package.json | 🟢 Development |
| Deploy | CI/CD, Docker configs | 🔵 Production |
