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
import { documentStateEnum } from './enums.js';

/** Versioned reference documents for projects. */
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Project this document belongs to. */
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  /** Document title. */
  title: text('title').notNull(),

  /** Document type/category. */
  type: text('type').notNull(), // 'requirements', 'design', 'api', 'architecture', etc.

  /** Current document state. */
  state: documentStateEnum('state').notNull().default('draft'),

  /** Document description. */
  description: text('description'),

  /** Latest version number. */
  currentVersion: integer('current_version').notNull().default(1),

  /** Whether this is visible to clients. */
  clientVisible: boolean('client_visible').notNull().default(false),

  /** Document tags for categorization. */
  tags: jsonb('tags').$type<string[]>().default([]),

  /** Custom metadata. */
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  projectIdx: index('documents_project_idx').on(table.projectId),
  typeIdx: index('documents_type_idx').on(table.type),
  stateIdx: index('documents_state_idx').on(table.state),
  deletedIdx: index('documents_deleted_idx').on(table.deletedAt),
}));

/** Document versions for history tracking. */
export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Parent document. */
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

  /** Version number. */
  version: integer('version').notNull(),

  /** Markdown content of this version. */
  content: text('content').notNull(),

  /** Author of this version. */
  authorId: uuid('author_id').references(() => users.id),

  /** Reason for this version. */
  changeReason: text('change_reason'),

  /** Comments on this version. */
  comments: jsonb('comments').$type<Array<{
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
  }>>().default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('document_versions_document_idx').on(table.documentId),
  versionIdx: index('document_versions_version_idx').on(table.documentId, table.version),
}));

/** File attachments for documents. */
export const documentAttachments = pgTable('document_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Document this attachment belongs to. */
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

  /** File name. */
  fileName: text('file_name').notNull(),

  /** File MIME type. */
  mimeType: text('mime_type').notNull(),

  /** File size in bytes. */
  fileSize: integer('file_size').notNull(),

  /** Storage URL (S3). */
  storageUrl: text('storage_url').notNull(),

  /** Uploader. */
  uploadedBy: uuid('uploaded_by').references(() => users.id),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('document_attachments_document_idx').on(table.documentId),
}));
