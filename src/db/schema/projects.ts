import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { clients } from './clients';
import { projectStageEnum } from './enums';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Client this project belongs to. */
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  /** Project name. */
  name: text('name').notNull(),

  /** One-line project description. */
  description: text('description'),

  /** Current project stage. */
  stage: projectStageEnum('stage').notNull().default('discovery'),

  /** Project start date. */
  startDate: timestamp('start_date', { withTimezone: true }),

  /** Target completion date. */
  targetDate: timestamp('target_date', { withTimezone: true }),

  /** Actual completion date. */
  completedDate: timestamp('completed_date', { withTimezone: true }),

  /** Project repository URL (GitHub). */
  repositoryUrl: text('repository_url'),

  /** Project documentation URL. */
  documentationUrl: text('documentation_url'),

  /** Production URL when deployed. */
  productionUrl: text('production_url'),

  /** Staging URL when deployed. */
  stagingUrl: text('staging_url'),

  /** Estimated hours for the project. */
  estimatedHours: integer('estimated_hours'),

  /** Actual hours spent. */
  actualHours: integer('actual_hours').notNull().default(0),

  /** Estimated cost. */
  estimatedCost: integer('estimated_cost'),

  /** Actual cost incurred. */
  actualCost: integer('actual_cost').notNull().default(0),

  /** Project overview data (discovery output). */
  overview: jsonb('overview').$type<{
    problem?: string;
    goals?: string[];
    nonGoals?: string[];
    constraints?: string[];
    successCriteria?: string[];
  }>(),

  /** Project tags for categorization. */
  tags: jsonb('tags').$type<string[]>().default([]),

  /** Custom metadata. */
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  /** Internal notes. */
  notes: text('notes'),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  clientIdx: index('projects_client_idx').on(table.clientId),
  stageIdx: index('projects_stage_idx').on(table.stage),
  deletedIdx: index('projects_deleted_idx').on(table.deletedAt),
}));

/** Project milestones for progress tracking. */
export const projectMilestones = pgTable('project_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Project this milestone belongs to. */
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  /** Milestone name. */
  name: text('name').notNull(),

  /** Milestone description. */
  description: text('description'),

  /** Target date for this milestone. */
  targetDate: timestamp('target_date', { withTimezone: true }),

  /** Actual completion date. */
  completedDate: timestamp('completed_date', { withTimezone: true }),

  /** Display order. */
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('project_milestones_project_idx').on(table.projectId),
  orderIdx: index('project_milestones_order_idx').on(table.projectId, table.sortOrder),
}));
