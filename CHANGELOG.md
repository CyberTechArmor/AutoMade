# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure following Fractionate Development Standard
- Database schema with Drizzle ORM for:
  - Users and authentication
  - Clients and organizations
  - Projects with lifecycle management
  - Discovery sessions with real-time transcription
  - Documents with versioning
  - Tracking entries for time and costs
  - Learnings capture
  - Audit logging for HIPAA compliance
- Backend API with:
  - Authentication (login, register, refresh tokens)
  - Project management (CRUD operations)
  - Session management with LLM facilitation
- LLM integration with fallback chain (Claude → OpenAI → Google)
- Docker configuration for deployment
- GitHub Actions CI/CD pipeline

### Changed
- Socket.io now handles only notifications and UI state synchronization
- Real-time voice/video moved to LiveKit for better WebRTC support

### Security
- MFA/TOTP support with backup codes
- Two-step login flow (password → TOTP verification)
- Auto-generated secure passwords for initial setup

## [0.2.0] - 2024-12-29

### Added
- LiveKit integration for real-time voice/video sessions
  - Room creation and management
  - Participant token generation
  - Session room status tracking
- TOTP-based multi-factor authentication
  - QR code generation for authenticator apps
  - Backup codes for account recovery
  - MFA setup and verification flow
- Upstall script for easy installation and updates
  - Single script for fresh install or update
  - Automatic secret generation
  - Let's Encrypt SSL certificate setup
  - Super admin account creation with auto-generated credentials
- Traefik reverse proxy configuration
  - Automatic HTTPS with Let's Encrypt
  - Security headers (HSTS, X-Frame-Options, etc.)
  - Docker-based deployment
- Setup service for initial system configuration
  - Domain and admin email configuration
  - Auto-generated password and TOTP secret
  - Backup codes generation

### Changed
- Socket.io refactored to handle only:
  - Real-time notifications
  - UI state synchronization across devices
  - Presence indicators
  - Typing indicators
- Authentication service updated for MFA flow
- Docker Compose split into development and production configurations

### Security
- Passwords auto-generated with 20+ character length
- TOTP secrets stored securely
- Backup codes hashed with SHA-256
- Let's Encrypt for automatic SSL certificates

## [0.1.0] - 2024-12-29

- Project initialized based on Fractionate Discovery Specification
