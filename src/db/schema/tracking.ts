import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './users.js';
import { trackingTypeEnum, costSourceEnum } from './enums.js';

/** Time and progress tracking entries. */
export const trackingEntries = pgTable('tracking_entries', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Project this entry belongs to. */
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  /** Entry type. */
  type: trackingTypeEnum('type').notNull(),

  /** Entry description. */
  description: text('description').notNull(),

  /** Time entry: start time. */
  startTime: timestamp('start_time', { withTimezone: true }),

  /** Time entry: end time. */
  endTime: timestamp('end_time', { withTimezone: true }),

  /** Time entry: duration in minutes. */
  durationMinutes: integer('duration_minutes'),

  /** Whether this time is billable. */
  billable: boolean('billable').notNull().default(true),

  /** Progress percentage (0-100). */
  progressPercent: integer('progress_percent'),

  /** User who created this entry. */
  userId: uuid('user_id').references(() => users.id),

  /** Related session if from a session. */
  sessionId: uuid('session_id'),

  /** Related milestone if tracking milestone progress. */
  milestoneId: uuid('milestone_id'),

  /** Tags for categorization. */
  tags: jsonb('tags').$type<string[]>().default([]),

  /** Custom metadata. */
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('tracking_entries_project_idx').on(table.projectId),
  typeIdx: index('tracking_entries_type_idx').on(table.type),
  dateIdx: index('tracking_entries_date_idx').on(table.startTime),
  userIdx: index('tracking_entries_user_idx').on(table.userId),
}));

/** Cost entries for resource tracking. */
export const costEntries = pgTable('cost_entries', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Project this cost belongs to. */
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  /** Cost source. */
  source: costSourceEnum('source').notNull(),

  /** Cost description. */
  description: text('description').notNull(),

  /** Amount in cents. */
  amountCents: integer('amount_cents').notNull(),

  /** Currency code. */
  currency: text('currency').notNull().default('USD'),

  /** Related session if from a session. */
  sessionId: uuid('session_id'),

  /** External reference ID (e.g., Twilio call SID). */
  externalId: text('external_id'),

  /** Cost breakdown details. */
  breakdown: jsonb('breakdown').$type<{
    items?: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  }>(),

  /** Custom metadata. */
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // When this cost was incurred
  incurredAt: timestamp('incurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('cost_entries_project_idx').on(table.projectId),
  sourceIdx: index('cost_entries_source_idx').on(table.source),
  dateIdx: index('cost_entries_date_idx').on(table.incurredAt),
}));
