import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** User's email address. Used for login and notifications. */
  email: text('email').notNull().unique(),

  /** Argon2id hash of user's password. Never store plaintext. */
  passwordHash: text('password_hash').notNull(),

  /** User's display name. Shown in UI. */
  displayName: text('display_name').notNull(),

  /** Role for authorization. See RBAC documentation. */
  role: userRoleEnum('role').notNull().default('client'),

  /** TOTP secret for MFA (encrypted). */
  mfaSecret: text('mfa_secret'),

  /** Whether MFA is enabled for this user. */
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),

  /** Hashed MFA backup codes for recovery. */
  mfaBackupCodes: jsonb('mfa_backup_codes').$type<string[]>(),

  /** User's timezone for scheduling. */
  timezone: text('timezone').notNull().default('America/New_York'),

  /** User's avatar URL. */
  avatarUrl: text('avatar_url'),

  /** Last successful login timestamp. */
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

  /** Number of failed login attempts (reset on success). */
  failedLoginAttempts: text('failed_login_attempts').notNull().default('0'),

  /** Lockout expiry if too many failed attempts. */
  lockedUntil: timestamp('locked_until', { withTimezone: true }),

  /** Email verification status. */
  emailVerified: boolean('email_verified').notNull().default(false),

  /** Email verification token. */
  emailVerificationToken: text('email_verification_token'),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  deletedIdx: index('users_deleted_idx').on(table.deletedAt),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** User who owns this token. */
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  /** Hashed refresh token. */
  tokenHash: text('token_hash').notNull(),

  /** Token family for rotation tracking. */
  family: uuid('family').notNull(),

  /** When this token expires. */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  /** Client user agent for security tracking. */
  userAgent: text('user_agent'),

  /** Client IP address. */
  ipAddress: text('ip_address'),

  /** Whether this token has been revoked. */
  revoked: boolean('revoked').notNull().default(false),

  /** When this token was revoked. */
  revokedAt: timestamp('revoked_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('refresh_tokens_user_idx').on(table.userId),
  tokenIdx: index('refresh_tokens_token_idx').on(table.tokenHash),
  familyIdx: index('refresh_tokens_family_idx').on(table.family),
  expiresIdx: index('refresh_tokens_expires_idx').on(table.expiresAt),
}));
