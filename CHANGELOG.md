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
- Socket.io for real-time session communication
- Docker configuration for deployment
- GitHub Actions CI/CD pipeline

## [0.1.0] - 2024-12-29

- Project initialized based on Fractionate Discovery Specification
