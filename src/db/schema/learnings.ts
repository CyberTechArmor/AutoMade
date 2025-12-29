import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './users.js';

/** Learnings and institutional knowledge capture. */
export const learnings = pgTable('learnings', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Project this learning is associated with (optional for general learnings). */
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),

  /** Learning title. */
  title: text('title').notNull(),

  /** Freeform content. */
  content: text('content').notNull(),

  /** Structured fields for pattern recognition. */
  structured: jsonb('structured').$type<{
    whatWeTried?: string;
    outcome?: 'success' | 'partial' | 'failure';
    whyItWorked?: string;
    whyItFailed?: string;
    recommendation?: string;
    category?: string;
  }>(),

  /** Tags for categorization and search. */
  tags: jsonb('tags').$type<string[]>().default([]),

  /** Whether this learning is globally applicable. */
  isGlobal: boolean('is_global').notNull().default(false),

  /** Author of this learning. */
  authorId: uuid('author_id').references(() => users.id),

  /** Related session if from a session. */
  sessionId: uuid('session_id'),

  /** Custom metadata. */
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  projectIdx: index('learnings_project_idx').on(table.projectId),
  tagsIdx: index('learnings_tags_idx').on(table.tags),
  globalIdx: index('learnings_global_idx').on(table.isGlobal),
  deletedIdx: index('learnings_deleted_idx').on(table.deletedAt),
}));

/** Quick notes for async capture. */
export const quickNotes = pgTable('quick_notes', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Project this note belongs to. */
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  /** Note type. */
  type: text('type').notNull(), // 'text', 'voice', 'link', 'file'

  /** Text content or transcription. */
  content: text('content'),

  /** URL for links. */
  url: text('url'),

  /** File URL for uploads. */
  fileUrl: text('file_url'),

  /** File name for uploads. */
  fileName: text('file_name'),

  /** Voice memo duration in seconds. */
  duration: text('duration'),

  /** Auto-generated preview for links. */
  linkPreview: jsonb('link_preview').$type<{
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  }>(),

  /** Author of this note. */
  authorId: uuid('author_id').references(() => users.id),

  /** Whether voice memo has been transcribed. */
  transcribed: boolean('transcribed').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('quick_notes_project_idx').on(table.projectId),
  typeIdx: index('quick_notes_type_idx').on(table.type),
}));
