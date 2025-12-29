# Contributing

## Development Setup

```bash
# Prerequisites
# - Node.js 22+
# - Docker and Docker Compose

# Clone repository
git clone https://github.com/fractionate/automade.git
cd automade

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development services (PostgreSQL, Redis)
docker compose -f docker-compose.dev.yml up -d

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev
```

## Development Standard

This project follows the [Fractionate Development Standard](https://github.com/fractionate/dev-standard).

Before contributing, please review:
- [Build Standards](https://github.com/fractionate/dev-standard/blob/main/04-BUILD.md)
- [Security Requirements](https://github.com/fractionate/dev-standard/blob/main/07-SECURITY.md)

## Workflow

1. Create a branch from `main`
2. Make changes following the development standard
3. Write/update tests
4. Run linting and type checking: `npm run lint && npm run typecheck`
5. Run tests: `npm run test`
6. Submit PR with description of changes
7. Address review feedback
8. Merge after approval

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Maintenance

Example: `feat: add session summarization with Claude`

## Code Style

- TypeScript strict mode enabled
- Use Zod for all input validation
- Use Drizzle ORM for database operations
- Follow existing patterns in the codebase
- Add JSDoc comments for public functions
- Keep functions focused and small

## Testing

- Write tests for new features
- Maintain test coverage
- Use Vitest for testing
- Mock external services in tests
