# CI Fixes and Development Best Practices

This document outlines all challenges resolved during CI pipeline fixes for the AutoMade project. Use these learnings to inform development standards and prevent similar issues.

---

## Table of Contents

1. [ESLint Configuration Issues](#1-eslint-configuration-issues)
2. [TypeScript Strict Mode Challenges](#2-typescript-strict-mode-challenges)
3. [Third-Party Library API Changes](#3-third-party-library-api-changes)
4. [Express.js Route Handler Patterns](#4-expressjs-route-handler-patterns)
5. [Test Configuration](#5-test-configuration)
6. [Database Query Patterns](#6-database-query-patterns)
7. [Role-Based Access Control](#7-role-based-access-control)

---

## 1. ESLint Configuration Issues

### Problem: Config files not included in TypeScript project

ESLint with `typescript-eslint/strictTypeChecked` requires all linted files to be part of the TypeScript project.

**Error:**
```
drizzle.config.ts: Parsing error: ESLint was configured to run on `<tsconfigRootDir>/drizzle.config.ts` using `parserOptions.project`
```

**Solution:** Add config files to ESLint's ignore list:

```javascript
// eslint.config.js
export default tseslint.config({
  ignores: [
    'dist/**',
    'drizzle.config.ts',
    'eslint.config.js',
    'vitest.config.ts',
    'tests/**',
  ],
});
```

### Problem: Unused variables and imports

Strict ESLint catches all unused declarations.

**Best Practice:**
- Remove unused imports immediately
- Use `_` prefix for intentionally unused parameters (e.g., `_res` in middleware)
- Run `npm run lint` locally before committing

**Common culprits:**
- Imported functions that were refactored out
- Variables declared for future use
- Destructured values not all used

---

## 2. TypeScript Strict Mode Challenges

### Problem: `noUncheckedIndexedAccess` with arrays

When `noUncheckedIndexedAccess` is enabled, array index access returns `T | undefined`.

**Error:**
```typescript
const byte = bytes[i]; // Type is 'number | undefined'
password += charset[byte % charset.length]; // Error: byte might be undefined
```

**Solution:** Always check for undefined:

```typescript
for (let i = 0; i < length; i++) {
  const byte = bytes[i];
  if (byte !== undefined) {
    password += charset[byte % charset.length];
  }
}
```

### Problem: Database query results may be undefined

Single-row queries return arrays where first element may not exist.

**Error:**
```typescript
const [user] = await db.select().from(users).where(eq(users.id, id));
// user is possibly undefined
```

**Solution:** Use nullish coalescing or explicit checks:

```typescript
const result = await db.select({ count: sql<number>`count(*)` }).from(users);
const userCount = result[0]?.count ?? 0;
```

### Problem: Request parameters possibly undefined

Express route params are typed as `string | undefined` in strict mode.

**Error:**
```typescript
req.params.id // Type: string | undefined
```

**Solution:** Use non-null assertion when validation middleware guarantees existence:

```typescript
// After validate(getProjectSchema) middleware runs, id is guaranteed
const project = await projectService.getProject(req.params.id!);
```

### Problem: Optional properties in request object

`req.ip` and similar properties may be undefined.

**Solution:** Use nullish coalescing:

```typescript
// For string parameters that accept undefined
req.ip ?? undefined

// For parameters requiring a string value
req.ip ?? 'unknown'
```

---

## 3. Third-Party Library API Changes

### Problem: JWT `expiresIn` type requirements

The `jsonwebtoken` library expects numeric seconds, not string durations in strict typing.

**Error:**
```typescript
jwt.sign(payload, secret, { expiresIn: '15m' }); // Type error in strict mode
```

**Solution:** Parse duration strings to seconds:

```typescript
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Invalid expiry unit: ${unit}`);
  }
}

jwt.sign(payload, secret, { expiresIn: parseExpiry('15m') });
```

### Problem: LiveKit SDK API changes

The `livekit-server-sdk` has evolved its API signatures.

**Issues encountered:**

1. **`token.toJwt()` returns Promise:**
```typescript
// Wrong
return token.toJwt();

// Correct
return await token.toJwt();
```

2. **`sendData` API signature changed:**
```typescript
// Old API
await service.sendData(roomName, payload, DataPacket_Kind.RELIABLE, destinationIdentities);

// New API
await service.sendData(
  roomName,
  payload,
  DataPacket_Kind.RELIABLE,
  { destinationSids: destinationIdentities, topic: 'app-data' }
);
```

### Problem: OTPAuth Secret constructor

The `otpauth` library changed how secrets are created.

**Error:**
```typescript
Secret.fromUint8Array(bytes); // Method doesn't exist
```

**Solution:** Use the constructor with buffer:

```typescript
import { Secret } from 'otpauth';
import { randomBytes } from 'node:crypto';

export function generateSecret(): string {
  const bytes = randomBytes(20);
  // Convert Buffer to ArrayBuffer
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
  const secret = new Secret({ buffer: arrayBuffer });
  return secret.base32;
}
```

---

## 4. Express.js Route Handler Patterns

### Problem: Void return from route handlers

ESLint `@typescript-eslint/no-confusing-void-expression` flags void returns.

**Error:**
```typescript
router.get('/', (req, res) => {
  return res.json(data); // Confusing void expression
});
```

**Solution:** Don't return response calls, just execute them:

```typescript
router.get('/', (req, res) => {
  res.json(data);
  return; // Explicit return if needed for early exit
});
```

### Problem: Early returns in route handlers

When sending error responses early, ensure no code follows.

**Pattern:**
```typescript
router.get('/:id', async (req, res, next) => {
  try {
    const result = await service.getById(req.params.id!);

    if (!result) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });
      return; // Important: prevent further execution
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

### Problem: Union types in service responses

When a service can return different response shapes (e.g., MFA flow vs regular auth):

**Solution:** Use type guards and assertions:

```typescript
const result = await authService.login(credentials);

// Type guard for MFA response
if ('mfaRequired' in result && result.mfaRequired) {
  res.json({
    mfaRequired: true,
    mfaToken: result.mfaToken,
    user: result.user,
  });
  return;
}

// Type assertion for regular auth response
const authResult = result as {
  user: { id: string; email: string; displayName: string; role: string };
  accessToken: string;
  refreshToken: string;
};
res.json(authResult);
```

---

## 5. Test Configuration

### Problem: No test files found

Vitest exits with code 1 when no test files match the configured patterns.

**Solution:** Ensure at least one test file exists:

```typescript
// src/lib/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('should hash and verify a password', async () => {
    const password = 'testPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testPassword123!';
    const wrongPassword = 'wrongPassword456!';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'testPassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});
```

**Best Practice:** Always include at least basic unit tests for core utilities.

---

## 6. Database Query Patterns

### Problem: Count queries with Drizzle ORM

Getting counts requires careful typing.

**Solution:**

```typescript
import { sql } from 'drizzle-orm';

const result = await db
  .select({ count: sql<number>`count(*)` })
  .from(schema.users);

const userCount = result[0]?.count ?? 0;
```

---

## 7. Role-Based Access Control

### Problem: Missing role in enum

When adding new roles like `super_admin`, update all locations.

**Checklist:**

1. **Database enum:**
```typescript
// src/db/schema/enums.ts
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin',
  'manager',
  'client',
]);
```

2. **RBAC constants:**
```typescript
// src/lib/rbac.ts
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CLIENT: 'client',
} as const;
```

3. **Role middleware:**
```typescript
export function requireRole(allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) {
      throw new ForbiddenError('Authentication required');
    }
    // Super admin bypasses role checks
    if (user.role === ROLES.SUPER_ADMIN) {
      next();
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`);
    }
    next();
  };
}
```

4. **Route usage:**
```typescript
router.use(requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]));
```

---

## Summary Checklist

Before committing, verify:

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] All array accesses handle undefined
- [ ] All optional request properties use nullish coalescing
- [ ] Route handlers use explicit returns after sending responses
- [ ] Third-party library APIs match current versions
- [ ] New roles are added to all RBAC locations
- [ ] At least one test file exists for vitest
- [ ] package-lock.json is committed

---

## Quick Reference: Common Fixes

| Issue | Fix |
|-------|-----|
| `bytes[i]` possibly undefined | `if (byte !== undefined) { ... }` |
| `req.params.id` possibly undefined | `req.params.id!` after validation |
| `req.ip` possibly undefined | `req.ip ?? undefined` or `req.ip ?? 'unknown'` |
| `result[0]` possibly undefined | `result[0]?.property ?? defaultValue` |
| JWT expiresIn type error | Parse string to numeric seconds |
| `token.toJwt()` sync call | `await token.toJwt()` |
| Void expression return | Remove `return` before `res.json()` |
| No test files | Create at least one `.test.ts` file |
