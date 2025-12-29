# 05 - Deploy

**Purpose:** Define how code moves from repository to running system. Same artifact, multiple environments, configuration-driven behavior.

---

## Deployment Philosophy

### Immutable Artifacts

Build once, deploy everywhere:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  IMMUTABLE ARTIFACT FLOW                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   git push ──► CI builds image ──► Push to registry                   │
│                                         │                               │
│                    ┌────────────────────┼────────────────────┐         │
│                    ▼                    ▼                    ▼         │
│               [staging]            [production]         [client]       │
│                                                                         │
│   Same image bytes.                                                    │
│   Different configuration.                                             │
│   Identical behavior.                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Never build in production.** Pull pre-built images from the registry.

### Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CONFIGURATION SOURCES (lowest to highest priority)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Default values in code          (committed, safe defaults)         │
│  2. config/{environment}.json       (committed, no secrets)            │
│  3. .env file                       (local dev only, git-ignored)      │
│  4. Environment variables           (runtime, secrets)                 │
│  5. Docker secrets                  (Swarm, sensitive values)          │
│                                                                         │
│  Higher sources override lower.                                         │
│  Secrets NEVER in code or config files.                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Container Strategy

### Dockerfile Pattern

Multi-stage builds for small, secure images:

```dockerfile
# Dockerfile

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies only (cached layer)
COPY package*.json ./
RUN npm ci --only=production

# ============================================
# Stage 2: Build
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Don't run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Set user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### .dockerignore

```
# .dockerignore
node_modules
dist
.git
.github
.env*
*.md
*.log
tests
coverage
.vscode
```

---

## Registry

### GitHub Container Registry (GHCR)

All images pushed to `ghcr.io/fractionate/{project}`.

**Tagging strategy:**

| Tag | When Applied | Use For |
|-----|--------------|---------|
| `:{git-sha-short}` | Every build | Exact version reference |
| `:{branch}` | Push to branch | Environment tracking |
| `:latest` | Push to main | Convenience (never prod) |
| `:v{semver}` | Release tags | Production deployments |

**Example tags for a build:**
```
ghcr.io/fractionate/neon:abc1234
ghcr.io/fractionate/neon:main
ghcr.io/fractionate/neon:latest
ghcr.io/fractionate/neon:v1.2.3  (if tagged release)
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # Quality Checks
  # ============================================
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
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
      
      - name: Validate OpenAPI spec
        run: npm run validate:api

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

  # ============================================
  # Build and Push Image
  # ============================================
  build:
    needs: quality
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ============================================
  # Deploy to Staging (automatic)
  # ============================================
  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          # SSH to staging server and pull new image
          # Or trigger webhook to orchestrator
          echo "Deploying ${{ needs.build.outputs.image-tag }} to staging"

  # ============================================
  # Deploy to Production (manual)
  # ============================================
  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build.outputs.image-tag }} to production"
```

---

## Environments

### Local Development

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://dev:dev@postgres:5432/app
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./src:/app/src:ro  # Hot reload
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

```bash
# Start local environment
docker compose up -d

# View logs
docker compose logs -f app

# Run migrations
docker compose exec app npm run db:migrate

# Stop everything
docker compose down
```

### Staging / Production (Docker Swarm)

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  app:
    image: ghcr.io/fractionate/neon:${IMAGE_TAG:-latest}
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - NODE_ENV=production
    secrets:
      - database_url
      - jwt_secret
    networks:
      - traefik-public
      - internal
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:16-alpine
    deploy:
      placement:
        constraints:
          - node.role == manager
    volumes:
      - postgres_data:/var/lib/postgresql/data
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    networks:
      - internal

networks:
  traefik-public:
    external: true
  internal:
    driver: overlay
    internal: true

volumes:
  postgres_data:

secrets:
  database_url:
    external: true
  jwt_secret:
    external: true
  postgres_password:
    external: true
```

```bash
# Create secrets
echo "postgres://user:pass@postgres:5432/app" | docker secret create database_url -
echo "your-jwt-secret" | docker secret create jwt_secret -

# Deploy stack
docker stack deploy -c docker-compose.prod.yml neon

# Check status
docker service ls
docker service logs neon_app

# Scale
docker service scale neon_app=4

# Update (rolling)
docker service update --image ghcr.io/fractionate/neon:v1.2.3 neon_app

# Rollback
docker service rollback neon_app
```

---

## Scaling Guide

### When to Scale

| Signal | Action |
|--------|--------|
| Response times increasing | Add replicas or optimize code |
| CPU > 70% sustained | Add replicas |
| Memory > 80% | Add replicas or fix leak |
| Connection pool exhausted | Increase pool or add replicas |

### Horizontal vs Vertical

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCALING DECISION                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Start Here:                                                            │
│  ┌─────────────────────────────────────────┐                           │
│  │  Single container, adequate resources   │                           │
│  │  (2 CPU, 4GB RAM)                       │                           │
│  └─────────────────────────────────────────┘                           │
│                     │                                                   │
│                     ▼                                                   │
│  ┌─────────────────────────────────────────┐                           │
│  │  Need more capacity?                    │                           │
│  └─────────────────────────────────────────┘                           │
│           │                    │                                        │
│    [I/O bound]          [CPU bound]                                    │
│           │                    │                                        │
│           ▼                    ▼                                        │
│  ┌─────────────────┐  ┌─────────────────┐                              │
│  │  Add replicas   │  │  Bigger server  │                              │
│  │  (horizontal)   │  │  (vertical)     │                              │
│  └─────────────────┘  └─────────────────┘                              │
│                                │                                        │
│                                ▼                                        │
│                    ┌─────────────────────┐                             │
│                    │  Still not enough?  │                             │
│                    │  Add replicas       │                             │
│                    └─────────────────────┘                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Swarm to Kubernetes Migration

Move to Kubernetes when:
- Multi-region deployment required
- Need advanced scheduling (GPU, node affinity)
- Team has Kubernetes expertise
- Customer requires it

**Migration path:**
1. Kubernetes manifests live alongside Compose files
2. Test in staging Kubernetes cluster
3. Migrate staging first, validate
4. Migrate production

---

## Rollback Procedure

### Automatic (Swarm)

Swarm automatically rolls back if health checks fail during update:

```yaml
deploy:
  update_config:
    failure_action: rollback
```

### Manual Rollback

```bash
# Find previous working version
docker service ps neon_app --format "{{.Image}}" | head -5

# Rollback to previous
docker service rollback neon_app

# Or deploy specific version
docker service update --image ghcr.io/fractionate/neon:abc1234 neon_app
```

### Database Rollback

Migrations should be reversible:

```bash
# Apply migration
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Rollback to specific version
npm run db:rollback --to 005
```

---

## Health Checks

Every service exposes:

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Liveness (am I running?) | `200` or `503` |
| `GET /ready` | Readiness (can I serve?) | `200` or `503` |

```typescript
// src/routes/health.ts
import { Router } from 'express';
import { db } from '@/db';

const router = Router();

// Liveness: Is the process running?
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: Can I serve traffic?
router.get('/ready', async (req, res) => {
  try {
    // Check database
    await db.execute('SELECT 1');
    
    // Check other dependencies...
    
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

export default router;
```

---

## Deployment Checklist

### Before Deploying

- [ ] All tests passing in CI
- [ ] Image built and pushed to registry
- [ ] Database migrations tested
- [ ] Configuration/secrets set for target environment
- [ ] Rollback plan identified

### During Deployment

- [ ] Monitor health check status
- [ ] Watch application logs
- [ ] Verify key functionality works
- [ ] Check error rates in monitoring

### After Deployment

- [ ] Confirm all replicas healthy
- [ ] Verify metrics baseline normal
- [ ] Document version deployed
- [ ] Notify stakeholders if needed
