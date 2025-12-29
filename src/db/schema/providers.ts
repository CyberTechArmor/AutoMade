import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Service provider types
 */
export const providerTypeEnum = pgEnum('provider_type', [
  'llm',           // Language models (Claude, GPT, Gemini)
  'voice',         // Voice synthesis (ElevenLabs)
  'transcription', // Speech-to-text
  'storage',       // S3-compatible storage
  'webrtc',        // LiveKit
  'sms',           // Twilio
  'email',         // Email services
]);

/**
 * Specific service identifiers
 */
export const serviceIdentifierEnum = pgEnum('service_identifier', [
  // LLM providers
  'anthropic',
  'openai',
  'google_ai',
  // Voice providers
  'elevenlabs',
  // WebRTC
  'livekit',
  // Storage
  's3',
  // Communication
  'twilio',
  'sendgrid',
  'smtp',
]);

/**
 * Service providers configuration
 * Stores API keys and settings for external services
 */
export const serviceProviders = pgTable('service_providers', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Display name for this provider configuration */
  name: text('name').notNull(),

  /** Provider type category */
  type: providerTypeEnum('type').notNull(),

  /** Specific service identifier */
  service: serviceIdentifierEnum('service').notNull(),

  /** Whether this provider is enabled */
  enabled: boolean('enabled').notNull().default(true),

  /** Whether this is the primary provider for its type */
  isPrimary: boolean('is_primary').notNull().default(false),

  /** Priority for fallback ordering (lower = higher priority) */
  priority: integer('priority').notNull().default(100),

  /**
   * Encrypted credentials/configuration
   * Structure varies by service type:
   * - LLM: { apiKey, model?, baseUrl? }
   * - Voice: { apiKey, voiceId? }
   * - Storage: { endpoint, accessKey, secretKey, bucket, region }
   * - WebRTC: { apiKey, apiSecret, url }
   * - SMS: { accountSid, authToken, phoneNumber }
   */
  credentials: jsonb('credentials').notNull().$type<Record<string, string>>(),

  /**
   * Additional configuration options
   * - LLM: { defaultModel, maxTokens, temperature }
   * - Voice: { defaultVoice, stability, similarityBoost }
   */
  config: jsonb('config').$type<Record<string, unknown>>(),

  /** Last time this provider was successfully used */
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

  /** Last error message if provider failed */
  lastError: text('last_error'),

  /** Last time an error occurred */
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),

  /** Usage statistics */
  stats: jsonb('stats').$type<{
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    totalTokens?: number;
    totalCost?: number;
  }>(),

  /** Who created this provider config */
  createdBy: uuid('created_by').references(() => users.id),

  /** Who last updated this provider config */
  updatedBy: uuid('updated_by').references(() => users.id),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  typeIdx: index('service_providers_type_idx').on(table.type),
  serviceIdx: index('service_providers_service_idx').on(table.service),
  enabledIdx: index('service_providers_enabled_idx').on(table.enabled),
  priorityIdx: index('service_providers_priority_idx').on(table.type, table.priority),
  deletedIdx: index('service_providers_deleted_idx').on(table.deletedAt),
}));

/**
 * Provider usage logs for tracking and billing
 */
export const providerUsageLogs = pgTable('provider_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Which provider was used */
  providerId: uuid('provider_id').notNull().references(() => serviceProviders.id, { onDelete: 'cascade' }),

  /** What session/project this was for (optional) */
  sessionId: uuid('session_id'),
  projectId: uuid('project_id'),

  /** Request details */
  requestType: text('request_type').notNull(), // 'chat', 'completion', 'transcription', etc.

  /** Tokens used (for LLM) */
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),

  /** Duration in milliseconds */
  durationMs: integer('duration_ms'),

  /** Cost in USD (if calculable) */
  cost: text('cost'),

  /** Whether request was successful */
  success: boolean('success').notNull(),

  /** Error message if failed */
  errorMessage: text('error_message'),

  /** Model used (for LLM) */
  model: text('model'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('provider_usage_logs_provider_idx').on(table.providerId),
  sessionIdx: index('provider_usage_logs_session_idx').on(table.sessionId),
  projectIdx: index('provider_usage_logs_project_idx').on(table.projectId),
  createdIdx: index('provider_usage_logs_created_idx').on(table.createdAt),
}));
