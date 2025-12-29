# 04 - Build

**Purpose:** Define how code is written, structured, tested, and documented. Consistency here means any developer can navigate any project.

---

## Project Structure

Every project follows this structure:

```
project-name/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   │   └── 001-database.md
│   └── api.md                  # Additional API documentation
├── src/
│   ├── config/
│   │   └── index.ts            # Configuration loading
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema definitions
│   │   ├── migrations/         # Generated migrations
│   │   └── index.ts            # Database connection
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schemas.ts # Zod schemas
│   │   │   └── auth.test.ts
│   │   └── users/
│   │       ├── users.routes.ts
│   │       ├── users.service.ts
│   │       ├── users.schemas.ts
│   │       └── users.test.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── error-handler.ts
│   │   └── request-logger.ts
│   ├── lib/
│   │   └── ...                 # Shared utilities
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Entry point
├── tests/
│   ├── setup.ts                # Test configuration
│   └── integration/            # Integration tests
├── .env.example                # Example environment variables
├── .gitignore
├── docker-compose.yml          # Local development
├── Dockerfile
├── drizzle.config.ts
├── eslint.config.js
├── openapi.yaml                # API specification
├── package.json
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

### Module Structure

Each feature is a module containing:

```
modules/users/
├── users.routes.ts     # Route definitions, thin handlers
├── users.service.ts    # Business logic
├── users.schemas.ts    # Zod schemas for validation
├── users.types.ts      # TypeScript types (if needed beyond Zod inference)
└── users.test.ts       # Unit + integration tests
```

**Why modules?**
- Feature code is colocated (don't scatter across folders)
- Easy to find everything related to a feature
- Modules can be extracted to separate services if needed

---

## Code Style

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Non-negotiable settings:**
- `strict: true` — Catches real bugs
- `noUncheckedIndexedAccess: true` — Array/object access is safely typed

### ESLint Configuration

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true }
      ],
    },
  },
);
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `user-service.ts` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase | `createUser` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `UserResponse` |
| Schemas (Zod) | camelCase + Schema | `createUserSchema` |
| Database tables | snake_case (plural) | `users`, `chat_rooms` |
| Database columns | snake_case | `created_at`, `user_id` |

---

## Patterns

### Route Handlers

Keep route handlers thin. They validate input, call services, format output.

```typescript
// users.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import * as userService from './users.service';
import { createUserSchema, updateUserSchema } from './users.schemas';

const router = Router();

router.post(
  '/',
  authenticate,
  validate(createUserSchema),
  async (req, res, next) => {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        code: 'NOT_FOUND', 
        message: 'User not found' 
      });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Service Layer

Business logic lives in services. Services are pure functions when possible.

```typescript
// users.service.ts
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/crypto';
import type { CreateUserInput } from './users.schemas';

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    })
    .returning();
  
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  return user ?? null;
}
```

### Validation Schemas

Use Zod for validation. Infer TypeScript types from schemas.

```typescript
// users.schemas.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    displayName: z.string().min(1).max(100),
    password: z.string().min(12).max(128),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    displayName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### Error Handling

Centralized error handler. Throw typed errors from services.

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, 'Validation failed', details);
  }
}
```

```typescript
// middleware/error-handler.ts
import { ErrorRequestHandler } from 'express';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Log unexpected errors
  logger.error({ err, req: { method: req.method, url: req.url } }, 
    'Unhandled error');

  // Don't leak internal details
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
};
```

---

## Testing

### Test Types

| Type | Purpose | Location | Run Frequency |
|------|---------|----------|---------------|
| Unit | Test functions in isolation | `*.test.ts` next to source | Every commit |
| Integration | Test API endpoints | `tests/integration/` | Every commit |
| Contract | Validate API matches spec | CI pipeline | Every commit |
| E2E | Full user flows | Separate repo/process | Before release |

### Test Structure

```typescript
// users.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createUser, getUserById } from './users.service';
import { db } from '@/db';
import { users } from '@/db/schema';

describe('UserService', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(users);
  });

  describe('createUser', () => {
    it('creates a user with hashed password', async () => {
      const input = {
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'securepassword123',
      };

      const user = await createUser(input);

      expect(user.email).toBe(input.email);
      expect(user.displayName).toBe(input.displayName);
      expect(user.passwordHash).not.toBe(input.password);
      expect(user.id).toBeDefined();
    });

    it('throws on duplicate email', async () => {
      const input = {
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'securepassword123',
      };

      await createUser(input);

      await expect(createUser(input)).rejects.toThrow();
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { db } from '@/db';
import { users } from '@/db/schema';

describe('POST /users', () => {
  beforeAll(async () => {
    await db.delete(users);
  });

  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'securepassword123',
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.passwordHash).toBeUndefined(); // Not exposed
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        email: 'not-an-email',
        displayName: 'Test User',
        password: 'securepassword123',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

---

## Documentation

### README Requirements

Every project README must include:

```markdown
# Project Name

One-paragraph description.

## Quick Start

\`\`\`bash
# Prerequisites: Docker, Node 22

# Clone and setup
git clone <repo>
cd <project>
cp .env.example .env

# Start dependencies
docker compose up -d

# Install and run
npm ci
npm run dev
\`\`\`

## API Documentation

API docs available at `http://localhost:3000/docs` when running.

OpenAPI spec: `openapi.yaml`

## Development

### Commands
- `npm run dev` — Start development server
- `npm run test` — Run tests
- `npm run lint` — Lint code
- `npm run build` — Build for production

### Project Structure
[Brief explanation of key directories]

## Deployment

See [05-DEPLOY.md](../dev-standard/05-DEPLOY.md) for deployment process.

## Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DATABASE_URL | PostgreSQL connection | Yes | — |
| JWT_SECRET | Token signing key | Yes | — |
| ... | ... | ... | ... |
```

### Inline Documentation

Document why, not what. The code shows what.

```typescript
// Bad: Documents what code does (obvious)
// Increment counter by 1
counter++;

// Good: Documents why
// Rate limiting requires tracking requests per window.
// Reset counter at window boundary, not on each request.
counter++;
```

### OpenAPI First

The OpenAPI spec is the primary API documentation. Keep it updated.

Validate spec matches implementation in CI:

```yaml
# .github/workflows/ci.yml
- name: Validate OpenAPI spec
  run: npm run validate:api
```

---

## Build Checklist

Before merging any PR:

- [ ] Code follows project structure
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] New code has tests (aim for 80%+ coverage of business logic)
- [ ] OpenAPI spec updated if endpoints changed
- [ ] README updated if setup changed
- [ ] No secrets committed
- [ ] No `console.log` (use logger)
