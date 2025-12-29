import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { auditActionEnum } from './enums.js';

/** Audit log for HIPAA compliance - append-only, hash-chained. */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // When
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),

  // Who
  actorId: uuid('actor_id'),
  actorType: text('actor_type').notNull(), // 'user', 'system', 'api_key'
  actorIp: text('actor_ip'),
  actorUserAgent: text('actor_user_agent'),
  sessionId: text('session_id'),

  // What
  action: auditActionEnum('action').notNull(),
  outcome: text('outcome').notNull(), // 'success', 'failure', 'denied'

  // Which resource
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),

  // Context
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // Request details
  requestMethod: text('request_method'),
  requestPath: text('request_path'),
  requestId: text('request_id'),

  // Tamper evidence (hash chain)
  previousHash: text('previous_hash'),
  hash: text('hash').notNull(),
}, (table) => ({
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
  actorIdx: index('audit_logs_actor_idx').on(table.actorId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
}));

/** System events and notifications. */
export const systemEvents = pgTable('system_events', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Event type. */
  type: text('type').notNull(), // 'session.started', 'project.created', etc.

  /** Event severity. */
  severity: text('severity').notNull(), // 'info', 'warning', 'error', 'critical'

  /** Event title. */
  title: text('title').notNull(),

  /** Event description. */
  description: text('description'),

  /** Related resource type. */
  resourceType: text('resource_type'),

  /** Related resource ID. */
  resourceId: uuid('resource_id'),

  /** Event payload. */
  payload: jsonb('payload').$type<Record<string, unknown>>(),

  /** Whether this event has been acknowledged. */
  acknowledged: text('acknowledged').notNull().default('false'),

  /** Who acknowledged this event. */
  acknowledgedBy: uuid('acknowledged_by'),

  /** When this event was acknowledged. */
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('system_events_type_idx').on(table.type),
  severityIdx: index('system_events_severity_idx').on(table.severity),
  resourceIdx: index('system_events_resource_idx').on(table.resourceType, table.resourceId),
  acknowledgedIdx: index('system_events_acknowledged_idx').on(table.acknowledged),
}));

/** Notifications for users. */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** User to receive this notification. */
  userId: uuid('user_id').notNull(),

  /** Notification type. */
  type: text('type').notNull(), // 'session.scheduled', 'document.published', etc.

  /** Notification channel. */
  channel: text('channel').notNull(), // 'in_app', 'email', 'push'

  /** Notification title. */
  title: text('title').notNull(),

  /** Notification body. */
  body: text('body'),

  /** Action URL. */
  actionUrl: text('action_url'),

  /** Whether this notification has been read. */
  read: text('read').notNull().default('false'),

  /** When this notification was read. */
  readAt: timestamp('read_at', { withTimezone: true }),

  /** Whether this notification has been sent (for email/push). */
  sent: text('sent').notNull().default('false'),

  /** When this notification was sent. */
  sentAt: timestamp('sent_at', { withTimezone: true }),

  /** Notification payload. */
  payload: jsonb('payload').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  typeIdx: index('notifications_type_idx').on(table.type),
  readIdx: index('notifications_read_idx').on(table.userId, table.read),
}));
