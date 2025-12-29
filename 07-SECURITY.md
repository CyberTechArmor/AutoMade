# 07 - Security

**Purpose:** Define security requirements, authentication patterns, encryption standards, and compliance checklists. Security is not optional—it's built in from the start.

---

## Security Principles

### Defense in Depth

No single security control is sufficient. Layer defenses:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DEFENSE LAYERS                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Network          Firewall, TLS, rate limiting                         │
│       ↓                                                                 │
│  Authentication   Who are you? (JWT, sessions)                         │
│       ↓                                                                 │
│  Authorization    What can you do? (RBAC, permissions)                 │
│       ↓                                                                 │
│  Input            Validation, sanitization                             │
│       ↓                                                                 │
│  Application      Secure coding, dependency scanning                   │
│       ↓                                                                 │
│  Data             Encryption at rest, minimization                     │
│       ↓                                                                 │
│  Audit            Logging, monitoring, alerting                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Least Privilege

Grant minimum permissions required. Default to no access.

### Fail Secure

When something breaks, fail to a safe state (deny access, not grant access).

---

## Authentication

### JWT + Refresh Token Pattern

All projects use this authentication approach:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOKEN LIFECYCLE                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Access Token                                                           │
│  ├── Short-lived (15 minutes)                                          │
│  ├── Stateless (server doesn't store)                                  │
│  ├── Sent in Authorization header                                      │
│  └── Contains: userId, roles, expiry                                   │
│                                                                         │
│  Refresh Token                                                          │
│  ├── Longer-lived (7 days)                                             │
│  ├── Stateful (stored in database)                                     │
│  ├── Sent in httpOnly cookie                                           │
│  ├── Rotated on each use (old token invalidated)                       │
│  └── Revocable (logout invalidates)                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/modules/auth/auth.service.ts
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { db } from '@/db';
import { users, refreshTokens } from '@/db/schema';
import { config } from '@/config';

interface TokenPayload {
  userId: string;
  roles: string[];
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '15m',
    issuer: config.jwt.issuer,
  });
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(refreshTokens).values({
    userId,
    token: await hashToken(token),
    expiresAt,
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const hashedToken = await hashToken(oldToken);
  
  // Find and delete old token
  const [existing] = await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.token, hashedToken))
    .returning();

  if (!existing || existing.expiresAt < new Date()) {
    return null;
  }

  // Issue new tokens
  const user = await getUserById(existing.userId);
  const accessToken = generateAccessToken({ 
    userId: user.id, 
    roles: [user.role] 
  });
  const refreshToken = await generateRefreshToken(user.id);

  return { accessToken, refreshToken };
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
```

### Password Requirements

```typescript
// src/lib/password.ts
import argon2 from 'argon2';
import { z } from 'zod';

// Password policy
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine(
    (p) => /[A-Z]/.test(p),
    'Password must contain an uppercase letter'
  )
  .refine(
    (p) => /[a-z]/.test(p),
    'Password must contain a lowercase letter'
  )
  .refine(
    (p) => /[0-9]/.test(p),
    'Password must contain a number'
  );

// Argon2id with recommended parameters
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Session Management

```typescript
// Session configuration
const SESSION_CONFIG = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  inactivityTimeout: '30m',  // HIPAA requirement
  absoluteTimeout: '24h',     // Maximum session length
};
```

### Multi-Factor Authentication

For HIPAA compliance or high-security contexts:

```typescript
// TOTP (Time-based One-Time Password)
import { authenticator } from 'otplib';

export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

export function verifyTOTP(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

export function generateTOTPUri(
  secret: string, 
  email: string, 
  issuer: string
): string {
  return authenticator.keyuri(email, issuer, secret);
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

```typescript
// src/lib/rbac.ts
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  // User management
  'users:create': [ROLES.ADMIN],
  'users:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'users:update': [ROLES.ADMIN, ROLES.MANAGER],
  'users:delete': [ROLES.ADMIN],
  
  // Content
  'messages:create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER],
  'messages:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.USER, ROLES.GUEST],
  'messages:delete': [ROLES.ADMIN, ROLES.MANAGER],
  
  // Settings
  'settings:read': [ROLES.ADMIN, ROLES.MANAGER],
  'settings:update': [ROLES.ADMIN],
} as const;

export function hasPermission(role: Role, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
  return allowedRoles?.includes(role) ?? false;
}
```

### Authorization Middleware

```typescript
// src/middleware/authorize.ts
import { RequestHandler } from 'express';
import { hasPermission } from '@/lib/rbac';

export function authorize(permission: string): RequestHandler {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      });
    }
    
    if (!hasPermission(user.role, permission)) {
      // Log authorization failure (for audit)
      req.log.warn({ 
        userId: user.id, 
        permission, 
        action: 'authorization_failed' 
      });
      
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }
    
    next();
  };
}
```

---

## Encryption

### Data at Rest

```typescript
// src/lib/crypto.ts
import sodium from 'sodium-native';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(plaintext: string): string {
  const nonce = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES);
  sodium.randombytes_buf(nonce);
  
  const message = Buffer.from(plaintext);
  const ciphertext = Buffer.allocUnsafe(
    message.length + sodium.crypto_secretbox_MACBYTES
  );
  
  sodium.crypto_secretbox_easy(ciphertext, message, nonce, KEY);
  
  // Return nonce + ciphertext as base64
  return Buffer.concat([nonce, ciphertext]).toString('base64');
}

export function decrypt(encrypted: string): string {
  const combined = Buffer.from(encrypted, 'base64');
  
  const nonce = combined.subarray(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = combined.subarray(sodium.crypto_secretbox_NONCEBYTES);
  
  const plaintext = Buffer.allocUnsafe(
    ciphertext.length - sodium.crypto_secretbox_MACBYTES
  );
  
  if (!sodium.crypto_secretbox_open_easy(plaintext, ciphertext, nonce, KEY)) {
    throw new Error('Decryption failed');
  }
  
  return plaintext.toString();
}
```

### Data in Transit

All communications use TLS 1.3:

```yaml
# Traefik TLS configuration
tls:
  options:
    default:
      minVersion: VersionTLS13
      cipherSuites:
        - TLS_AES_128_GCM_SHA256
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
```

### Key Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│  KEY HIERARCHY                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Master Key (KEK - Key Encryption Key)                                 │
│  ├── Stored in: Docker secrets / Vault                                 │
│  ├── Rotated: Annually or on compromise                                │
│  └── Used to encrypt: Data Encryption Keys                             │
│                                                                         │
│  Data Encryption Keys (DEK)                                            │
│  ├── Stored in: Database (encrypted by KEK)                            │
│  ├── Rotated: Quarterly                                                │
│  └── Used to encrypt: Sensitive data fields                            │
│                                                                         │
│  JWT Signing Key                                                        │
│  ├── Stored in: Docker secrets / Vault                                 │
│  ├── Rotated: Annually or on compromise                                │
│  └── Used for: Signing access tokens                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Input Validation

### Validation Middleware

```typescript
// src/middleware/validate.ts
import { RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema): RequestHandler {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
```

### SQL Injection Prevention

Always use parameterized queries (Drizzle does this automatically):

```typescript
// Good - parameterized
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, email));

// NEVER do this - string concatenation
const user = await db.execute(`
  SELECT * FROM users WHERE email = '${email}'
`);
```

### XSS Prevention

- Validate input with Zod
- Use React's built-in escaping
- Set Content-Security-Policy headers

```typescript
// CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
  );
  next();
});
```

---

## Audit Logging

### Requirements

HIPAA and SOC 2 require answering: **"Who did what, to which data, when, and from where?"**

### Audit Schema

```typescript
// src/db/schema/audit.ts
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // When
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  
  // Who
  actorId: uuid('actor_id'),
  actorType: text('actor_type').notNull(), // 'user', 'system', 'api_key'
  actorIp: text('actor_ip'),
  sessionId: text('session_id'),
  
  // What
  action: text('action').notNull(), // 'user.login', 'message.create', etc.
  outcome: text('outcome').notNull(), // 'success', 'failure', 'denied'
  
  // Which resource
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),
  
  // Context
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  metadata: jsonb('metadata'),
  
  // Tamper evidence
  previousHash: text('previous_hash'),
  hash: text('hash').notNull(),
}, (table) => ({
  actorIdx: index('audit_actor_idx').on(table.actorId),
  timestampIdx: index('audit_timestamp_idx').on(table.timestamp),
  actionIdx: index('audit_action_idx').on(table.action),
  resourceIdx: index('audit_resource_idx').on(table.resourceType, table.resourceId),
}));
```

### Audit Service

```typescript
// src/lib/audit.ts
import crypto from 'crypto';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';

interface AuditEvent {
  actorId?: string;
  actorType: 'user' | 'system' | 'api_key';
  actorIp?: string;
  sessionId?: string;
  action: string;
  outcome: 'success' | 'failure' | 'denied';
  resourceType?: string;
  resourceId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

let lastHash: string | null = null;

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  // Create hash chain for tamper evidence
  const content = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
    previousHash: lastHash,
  });
  
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  await db.insert(auditLogs).values({
    ...event,
    previousHash: lastHash,
    hash,
  });

  lastHash = hash;
}

// Convenience methods
export const audit = {
  login: (userId: string, ip: string, success: boolean) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'auth.login',
      outcome: success ? 'success' : 'failure',
    }),
    
  accessResource: (userId: string, resourceType: string, resourceId: string) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      action: `${resourceType}.read`,
      outcome: 'success',
      resourceType,
      resourceId,
    }),
    
  modifyResource: (
    userId: string, 
    resourceType: string, 
    resourceId: string,
    before: unknown,
    after: unknown
  ) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      action: `${resourceType}.update`,
      outcome: 'success',
      resourceType,
      resourceId,
      beforeState: before as Record<string, unknown>,
      afterState: after as Record<string, unknown>,
    }),
};
```

### Audit Requirements by Event

| Event Type | Must Log |
|------------|----------|
| Authentication | User ID, IP, success/fail, MFA used |
| Authorization failure | User ID, resource, permission denied |
| Data access | User ID, resource type, resource ID |
| Data modification | User ID, before/after state |
| Admin actions | User ID, action, target |
| Configuration changes | User ID, setting, before/after |
| Data export | User ID, scope, timestamp |

---

## Compliance Checklists

### HIPAA Security Rule

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Access Control** | | |
| Unique user identification | UUID per user, no shared accounts | ☐ |
| Emergency access procedure | Admin override with audit log | ☐ |
| Automatic logoff | 30-minute inactivity timeout | ☐ |
| Encryption | AES-256-GCM at rest, TLS 1.3 in transit | ☐ |
| **Audit Controls** | | |
| Audit logs | All access/modification logged | ☐ |
| Audit log protection | Append-only, hash-chained | ☐ |
| Audit log retention | 6 years minimum | ☐ |
| **Integrity Controls** | | |
| Data validation | Zod schemas on all input | ☐ |
| Error handling | No PHI in error messages | ☐ |
| **Transmission Security** | | |
| TLS required | TLS 1.3, no fallback | ☐ |
| **Administrative** | | |
| Risk assessment | Documented annually | ☐ |
| Workforce training | Security training required | ☐ |
| Incident response | Procedure documented | ☐ |

### GDPR Requirements

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Lawful basis | Consent or legitimate interest documented | ☐ |
| Right to access | Data export endpoint | ☐ |
| Right to rectification | User can update their data | ☐ |
| Right to erasure | Hard delete with grace period | ☐ |
| Right to portability | JSON export of user data | ☐ |
| Data minimization | Only collect what's needed | ☐ |
| Storage limitation | Retention policy enforced | ☐ |
| Breach notification | 72-hour notification procedure | ☐ |

### SOC 2 Type II (Trust Services Criteria)

| Category | Controls | Status |
|----------|----------|--------|
| **Security** | | |
| CC6.1 | Logical access controls | ☐ |
| CC6.2 | Access provisioning/deprovisioning | ☐ |
| CC6.3 | Role-based access | ☐ |
| CC6.6 | Encryption of data | ☐ |
| **Availability** | | |
| A1.1 | Capacity management | ☐ |
| A1.2 | Recovery procedures | ☐ |
| **Confidentiality** | | |
| C1.1 | Confidential information protection | ☐ |
| C1.2 | Disposal of confidential data | ☐ |

---

## Security Checklist

### Every Project

- [ ] Authentication implemented with JWT + refresh tokens
- [ ] Password hashing with Argon2id
- [ ] Input validation with Zod on all endpoints
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS configured restrictively
- [ ] Security headers set (CSP, X-Frame-Options, etc.)
- [ ] No secrets in code or logs
- [ ] Audit logging implemented
- [ ] Dependency scanning in CI

### Production Deployment

- [ ] TLS 1.3 configured
- [ ] Rate limiting enabled
- [ ] Firewall rules configured
- [ ] Database not publicly accessible
- [ ] Secrets in Docker secrets / Vault
- [ ] Monitoring and alerting configured
- [ ] Backup encryption verified
- [ ] Incident response plan documented

### Compliance Mode (HIPAA/GDPR)

- [ ] Compliance mode set at initialization
- [ ] Audit log retention configured (6 years for HIPAA)
- [ ] Data retention policy implemented
- [ ] User consent mechanism (GDPR)
- [ ] Data export functionality
- [ ] Emergency access procedure documented
- [ ] Business Associate Agreements (HIPAA)
