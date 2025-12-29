# Drizzle ORM Guide

## Overview

Drizzle is our standard ORM for PostgreSQL. It provides TypeScript-first schema definitions, clean SQL output, and excellent developer experience.

**Why Drizzle over alternatives:**
- TypeScript types generated from schema (no codegen step)
- SQL is visible and auditable (not hidden behind magic)
- Migrations are SQL files you can read
- Lightweight runtime, fast queries
- Great PostgreSQL feature support

---

## Installation & Setup

```bash
# Install dependencies
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Useful for seeing what SQL will run
  verbose: true,
  strict: true,
});
```

### Database Connection

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Connection pool settings
const client = postgres(connectionString, {
  max: 10,                    // Max connections in pool
  idle_timeout: 20,           // Close idle connections after 20s
  connect_timeout: 10,        // Timeout for new connections
});

export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});
```

---

## Schema Patterns

### Basic Table

```typescript
// src/db/schema.ts
import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Standard columns every table should have
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Business fields
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['admin', 'user', 'guest'] })
    .notNull()
    .default('user'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps (always include these)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),  // Soft delete
}, (table) => ({
  // Add indexes for common queries
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
}));
```

### Relations

```typescript
import { relations } from 'drizzle-orm';

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for query builder
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### Enums (PostgreSQL Native)

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

// Creates actual PostgreSQL enum type
export const statusEnum = pgEnum('status', [
  'pending',
  'active', 
  'completed',
  'cancelled',
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: statusEnum('status').notNull().default('pending'),
  // ...
});
```

---

## Query Patterns

### Basic CRUD

```typescript
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, or, isNull, desc, sql } from 'drizzle-orm';

// Create
const [newUser] = await db
  .insert(users)
  .values({
    email: 'user@example.com',
    displayName: 'Test User',
  })
  .returning();

// Read (single)
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// Read (list with conditions)
const activeUsers = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.role, 'user'),
      isNull(users.deletedAt),
    )
  )
  .orderBy(desc(users.createdAt))
  .limit(20)
  .offset(0);

// Update
const [updated] = await db
  .update(users)
  .set({ 
    displayName: 'New Name',
    updatedAt: new Date(),
  })
  .where(eq(users.id, userId))
  .returning();

// Soft Delete
await db
  .update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));
```

### Relations Query

```typescript
// Fetch user with their posts
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: {
      orderBy: desc(posts.createdAt),
      limit: 10,
    },
  },
});
```

### Partial Select (Performance)

```typescript
// Only select needed columns
const userEmails = await db
  .select({
    id: users.id,
    email: users.email,
  })
  .from(users)
  .where(eq(users.role, 'admin'));
```

### Transactions

```typescript
const result = await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email, displayName })
    .returning();
  
  await tx
    .insert(userSettings)
    .values({ userId: user.id, theme: 'dark' });
  
  return user;
});
```

### Raw SQL (When Needed)

```typescript
import { sql } from 'drizzle-orm';

// Complex query
const stats = await db.execute(sql`
  SELECT 
    date_trunc('day', created_at) as day,
    COUNT(*) as count
  FROM users
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY day
  ORDER BY day DESC
`);
```

---

## Migrations

### Generate Migration

```bash
# After changing schema.ts
npm run db:generate

# This creates a migration file like:
# src/db/migrations/0001_create_users.sql
```

### Apply Migrations

```bash
# Apply all pending migrations
npm run db:migrate
```

### Migration Best Practices

1. **Review generated SQL** before applying
2. **Test migrations** on a copy of production data
3. **Make migrations reversible** when possible
4. **One logical change per migration**
5. **Never edit applied migrations** — create new ones

### Manual Migration Adjustments

Sometimes Drizzle's generated migration needs tweaking:

```sql
-- 0002_add_user_preferences.sql

-- Generated by Drizzle (keep as-is or adjust)
ALTER TABLE users ADD COLUMN preferences jsonb;

-- Add your custom SQL
UPDATE users SET preferences = '{}' WHERE preferences IS NULL;
ALTER TABLE users ALTER COLUMN preferences SET NOT NULL;
ALTER TABLE users ALTER COLUMN preferences SET DEFAULT '{}';
```

---

## Best Practices

### Do

```typescript
// ✅ Use parameterized queries (Drizzle does this automatically)
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userInput));

// ✅ Use transactions for multiple writes
await db.transaction(async (tx) => {
  // multiple operations
});

// ✅ Select only needed columns
const names = await db
  .select({ name: users.displayName })
  .from(users);

// ✅ Add indexes for frequently queried columns
// (in schema definition)

// ✅ Use soft delete for compliance
await db
  .update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, id));
```

### Don't

```typescript
// ❌ Never use string interpolation
const user = await db.execute(sql`
  SELECT * FROM users WHERE email = '${email}'
`);

// ❌ Avoid SELECT * in production code
const users = await db.select().from(users);

// ❌ Don't forget to handle soft-deleted records
const users = await db.select().from(users);
// Should be:
const users = await db
  .select()
  .from(users)
  .where(isNull(users.deletedAt));

// ❌ Don't update without returning (when you need the result)
await db.update(users).set({ name }).where(eq(users.id, id));
// Should be:
const [updated] = await db
  .update(users)
  .set({ name })
  .where(eq(users.id, id))
  .returning();
```

---

## Troubleshooting

### "Column does not exist"

**Cause:** Schema changed but migration not applied.

```bash
# Generate and apply migration
npm run db:generate
npm run db:migrate
```

### "Relation already exists"

**Cause:** Trying to create a table that exists.

```bash
# Check migration status
npm run db:studio  # Opens Drizzle Studio

# If stuck, you may need to manually fix the migrations table
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations"
```

### Slow Queries

**Diagnosis:**

```typescript
// Enable query logging
const db = drizzle(client, { 
  schema,
  logger: true,  // Logs all queries with timing
});
```

**Common fixes:**
- Add missing indexes
- Use partial selects instead of SELECT *
- Add `.limit()` to prevent fetching too many rows
- Use `EXPLAIN ANALYZE` to understand query plan

### Type Errors with JSONB

**Problem:** TypeScript doesn't know the shape of JSONB columns.

**Solution:** Use `$type<>()` to specify the type:

```typescript
metadata: jsonb('metadata').$type<{
  preferences: { theme: string };
  settings: Record<string, unknown>;
}>(),
```

---

## Integration

### With Zod (Validation)

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '@/db/schema';

// Generate Zod schemas from Drizzle schema
export const insertUserSchema = createInsertSchema(users, {
  // Override/extend validations
  email: (schema) => schema.email.email(),
  displayName: (schema) => schema.displayName.min(1).max(100),
});

export const selectUserSchema = createSelectSchema(users);

// Use in routes
import { validate } from '@/middleware/validate';

router.post('/users', validate(insertUserSchema), async (req, res) => {
  // req.body is typed and validated
});
```

### With Express Request Context

```typescript
// Access db in request handlers
declare global {
  namespace Express {
    interface Request {
      db: typeof db;
    }
  }
}

app.use((req, res, next) => {
  req.db = db;
  next();
});
```

---

## Resources

- [Drizzle Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Discord](https://discord.gg/drizzle)
- [Drizzle GitHub](https://github.com/drizzle-team/drizzle-orm)
