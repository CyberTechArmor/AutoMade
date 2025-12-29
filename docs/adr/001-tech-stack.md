# ADR-001: Technology Stack Selection

## Status
Accepted

## Context
AutoMade is a self-hosted web application for conducting LLM-facilitated discovery sessions and managing project lifecycle. We need to select technologies that:

1. Support real-time communication (voice, video, text)
2. Handle LLM integrations with fallback providers
3. Enable HIPAA-ready security architecture
4. Allow for single-server deployment with future scaling

## Decision
We have selected the following technology stack based on the Fractionate Development Standard:

### Backend
- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript 5.x (strict mode)
- **Framework**: Express with middleware pattern
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Cache/Queue**: Redis 7 with BullMQ
- **Validation**: Zod
- **Authentication**: JWT + Refresh tokens with Argon2id

### Frontend (planned)
- React 18 with Vite
- TailwindCSS
- Zustand for state management
- React Query for server state

### Infrastructure
- Docker containers
- GitHub Actions for CI/CD
- Traefik for reverse proxy (production)

### LLM Integrations
- Primary: Claude (Anthropic)
- Fallbacks: OpenAI GPT-4, Google Gemini

### Real-time Communication
- Socket.io for WebSocket communication
- LiveKit for WebRTC (voice/video)

## Consequences

### Positive
- TypeScript provides type safety and better developer experience
- Drizzle ORM offers type-safe database queries without magic
- Express is battle-tested and well-documented
- Docker enables consistent deployment
- LLM fallback chain ensures reliability

### Negative
- Node.js has limitations for CPU-intensive tasks
- LiveKit adds external dependency for WebRTC
- Drizzle is newer than Prisma (smaller ecosystem)

## Alternatives Considered

### Prisma instead of Drizzle
- Rejected due to binary engine complexity and migrations verbosity
- Drizzle provides cleaner SQL and lighter runtime

### Fastify instead of Express
- Considered for performance benefits
- Express chosen for familiarity and ecosystem maturity

### tRPC
- Would provide end-to-end type safety
- Rejected to maintain REST API flexibility for third-party integrations
