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
- Real-time voice/video/text communication via LiveKit
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
- JWT + refresh token authentication with MFA/TOTP
- Role-based access control (RBAC)
- Encryption at rest and in transit
- Automatic SSL with Let's Encrypt

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22 LTS |
| Language | TypeScript 5.x (strict) |
| Backend | Express |
| Real-time | Socket.io (notifications), LiveKit (voice/video) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache/Queue | Redis 7 + BullMQ |
| Validation | Zod |
| LLM | Claude (primary), OpenAI, Google AI (fallbacks) |
| WebRTC | LiveKit |
| Deployment | Docker, Nginx, Let's Encrypt |

## Quick Start

### Production Installation (Recommended)

The easiest way to install AutoMade is using the upstall script:

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/AutoMade/main/scripts/upstall.sh | sudo bash
```

The script will prompt you for:
- **Domain** (e.g., `automade.example.com`)
- **Admin Email** (super admin, also used for Let's Encrypt)

The script will:
1. Install all dependencies (Docker, etc.)
2. Generate secure secrets
3. Configure Nginx with Let's Encrypt SSL
4. Create the super admin account with auto-generated credentials
5. Display the login credentials (save them securely!)

### Update Existing Installation

```bash
cd /opt/automade
sudo ./scripts/upstall.sh update
```

### Development Setup

```bash
# Clone repository
git clone https://github.com/CyberTechArmor/AutoMade.git
cd AutoMade

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

## Authentication Flow

AutoMade uses a two-step authentication flow with MFA:

1. **Step 1**: User enters email and password
   - If valid and MFA is enabled, returns `mfaRequired: true` with a temporary token
   - If MFA is not enabled, returns access tokens directly

2. **Step 2**: User enters TOTP code from authenticator app
   - Verifies the code against the user's MFA secret
   - Returns access and refresh tokens on success

### Initial Setup

When AutoMade is first installed:
- A super admin account is created with the provided email
- Password is auto-generated (20+ characters)
- TOTP secret is auto-generated with QR code
- 10 backup codes are generated for account recovery

**Important**: Save the initial credentials securely! They are only shown once.

## API Endpoints

### Service Providers (Admin)
Manage AI and external service API keys from the admin panel:
- `GET /api/providers` - List all service providers
- `POST /api/providers` - Add a new provider (LLM, voice, storage, etc.)
- `GET /api/providers/:id` - Get provider details
- `PATCH /api/providers/:id` - Update provider settings/credentials
- `DELETE /api/providers/:id` - Remove a provider
- `POST /api/providers/:id/test` - Test provider connection

Supported provider types:
- **LLM**: Anthropic (Claude), OpenAI (GPT), Google AI (Gemini)
- **Voice**: ElevenLabs
- **WebRTC**: LiveKit
- **Storage**: S3-compatible
- **SMS**: Twilio
- **Email**: SendGrid, SMTP

### Authentication
- `POST /api/auth/login` - Authenticate user (step 1)
- `POST /api/auth/mfa/verify` - Verify MFA code (step 2)
- `POST /api/auth/mfa/backup` - Verify backup code
- `POST /api/auth/register` - Register new user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate tokens
- `GET /api/auth/me` - Get current user
- `POST /api/auth/mfa/setup` - Begin MFA setup
- `POST /api/auth/mfa/complete` - Complete MFA setup
- `POST /api/auth/mfa/disable` - Disable MFA

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
- `POST /api/sessions/:id/room` - Create LiveKit room
- `GET /api/sessions/:id/room/token` - Get participant token

### Real-time (Socket.io)
Socket.io is used for notifications and UI synchronization:
- `subscribe` - Subscribe to entity updates
- `unsubscribe` - Unsubscribe from updates
- `presence:update` - Update presence status
- `typing:start` / `typing:stop` - Typing indicators

### Real-time Voice/Video (LiveKit)
LiveKit handles all voice and video communication:
- Sessions get a dedicated room
- Participants receive access tokens
- Supports data channels for in-session messaging

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
│   │   ├── livekit.ts   # LiveKit integration
│   │   ├── llm.ts       # LLM integration
│   │   ├── logger.ts    # Pino logger
│   │   ├── password.ts  # Password hashing
│   │   ├── rbac.ts      # Role-based access control
│   │   ├── setup.ts     # Initial setup
│   │   ├── socket.ts    # Socket.io handlers
│   │   └── totp.ts      # MFA/TOTP utilities
│   ├── middleware/      # Express middleware
│   ├── modules/         # Feature modules
│   │   ├── auth/        # Authentication
│   │   ├── projects/    # Project management
│   │   └── sessions/    # Discovery sessions
│   ├── routes/          # Route definitions
│   └── server.ts        # Application entry point
├── scripts/
│   └── upstall.sh       # Install/update script
├── tests/               # Test files
├── docs/                # Documentation
│   └── adr/             # Architecture Decision Records
├── docker-compose.yml       # Base Docker config
├── docker-compose.prod.yml  # Production with Nginx + SSL
├── docker-compose.dev.yml   # Development config
└── Dockerfile               # Multi-stage Docker build
```

## Documentation

- [Architecture Decisions](docs/adr/)
- [Development Standard](https://github.com/fractionate/dev-standard)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

Key variables:
- `DOMAIN` - Your domain for production (e.g., automade.example.com)
- `ACME_EMAIL` - Email for Let's Encrypt certificates
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing (auto-generated in production)
- `ANTHROPIC_API_KEY` - Claude API key (primary LLM)
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` - LiveKit credentials

## License

Proprietary - Fractionate LLC

---

*This project follows the [Fractionate Development Standard](https://github.com/fractionate/dev-standard).*
