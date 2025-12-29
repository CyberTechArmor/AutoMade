# AutoMade

> Automated Development System for LLM-facilitated discovery sessions and project lifecycle management

## Status

🟢 **Development** — Core functionality implemented

## Overview

AutoMade is a self-hosted web application designed for Fractionate to:

- **Conduct LLM-facilitated discovery sessions** with clients (voice, video, or text)
- **Manage project lifecycle** from discovery through delivery
- **Build institutional knowledge** through captured learnings
- **Provide clients visibility** into their projects via a dedicated portal

## Features

### Discovery Sessions
- Real-time voice/video/text communication
- Autonomous LLM facilitation (Claude with fallbacks)
- Live transcription and summarization
- Session recording and playback

### Project Management
- Project lifecycle tracking (Discovery → Design → Development → Deploy → Operate)
- Milestone management
- Progress and cost tracking
- Document versioning

### Client Portal
- Project overview and progress visibility
- Published document access
- Session scheduling and participation

### Compliance & Security
- HIPAA-ready architecture with audit logging
- JWT + refresh token authentication
- Role-based access control (RBAC)
- Encryption at rest and in transit

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22 LTS |
| Language | TypeScript 5.x (strict) |
| Backend | Express, Socket.io |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache/Queue | Redis 7 + BullMQ |
| Validation | Zod |
| LLM | Claude (primary), OpenAI, Google AI (fallbacks) |
| WebRTC | LiveKit |
| Deployment | Docker, Docker Compose |

## Quick Start

### Prerequisites
- Node.js 22+
- Docker and Docker Compose

### Development Setup

```bash
# Clone repository
git clone https://github.com/fractionate/automade.git
cd automade

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development services
docker compose -f docker-compose.dev.yml up -d

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev
```

### Production Deployment

```bash
# Build and start all services
docker compose up -d

# Run migrations
docker compose exec api npm run db:migrate
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate tokens
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/start` - Start session
- `POST /api/sessions/:id/end` - End session
- `POST /api/sessions/:id/message` - Send message (get LLM response)
- `GET /api/sessions/:id/transcripts` - Get transcripts

### Real-time (Socket.io)
- `session:join` - Join a session room
- `session:message` - Send message with streaming response
- `session:typing` - Typing indicator

## Project Structure

```
automade/
├── src/
│   ├── config/          # Configuration
│   ├── db/
│   │   ├── schema/      # Drizzle schema definitions
│   │   └── migrations/  # Database migrations
│   ├── lib/             # Shared utilities
│   │   ├── audit.ts     # Audit logging
│   │   ├── errors.ts    # Error classes
│   │   ├── jwt.ts       # JWT utilities
│   │   ├── llm.ts       # LLM integration
│   │   ├── logger.ts    # Pino logger
│   │   ├── password.ts  # Password hashing
│   │   ├── rbac.ts      # Role-based access control
│   │   └── socket.ts    # Socket.io handlers
│   ├── middleware/      # Express middleware
│   ├── modules/         # Feature modules
│   │   ├── auth/        # Authentication
│   │   ├── projects/    # Project management
│   │   └── sessions/    # Discovery sessions
│   ├── routes/          # Route definitions
│   └── server.ts        # Application entry point
├── tests/               # Test files
├── docs/                # Documentation
│   └── adr/             # Architecture Decision Records
├── docker-compose.yml   # Production Docker config
├── docker-compose.dev.yml # Development Docker config
└── Dockerfile           # Multi-stage Docker build
```

## Documentation

- [Architecture Decisions](docs/adr/)
- [Development Standard](https://github.com/fractionate/dev-standard)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `ANTHROPIC_API_KEY` - Claude API key (primary LLM)
- `OPENAI_API_KEY` - OpenAI API key (fallback)

## License

Proprietary - Fractionate LLC

---

*This project follows the [Fractionate Development Standard](https://github.com/fractionate/dev-standard).*
