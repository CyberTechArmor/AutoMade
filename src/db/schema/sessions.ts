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
import { projects } from './projects';
import { users } from './users';
import { sessionStateEnum, sessionTypeEnum, llmProviderEnum } from './enums';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Project this session belongs to. */
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  /** Session title. */
  title: text('title').notNull(),

  /** Session description. */
  description: text('description'),

  /** Session type (voice, video, text, hybrid). */
  type: sessionTypeEnum('type').notNull().default('video'),

  /** Current session state. */
  state: sessionStateEnum('state').notNull().default('scheduled'),

  /** Scheduled start time. */
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),

  /** Actual start time. */
  startedAt: timestamp('started_at', { withTimezone: true }),

  /** End time. */
  endedAt: timestamp('ended_at', { withTimezone: true }),

  /** Duration in seconds. */
  duration: integer('duration'),

  /** Session facilitator (null if LLM-facilitated autonomously). */
  facilitatorId: uuid('facilitator_id').references(() => users.id),

  /** Whether this is an autonomous LLM-facilitated session. */
  isAutonomous: boolean('is_autonomous').notNull().default(true),

  /** LLM provider used for this session. */
  llmProvider: llmProviderEnum('llm_provider').default('anthropic'),

  /** Discovery prompt template used. */
  promptTemplate: text('prompt_template'),

  /** LiveKit room name for WebRTC. */
  livekitRoom: text('livekit_room'),

  /** Recording URL after completion. */
  recordingUrl: text('recording_url'),

  /** Session configuration. */
  config: jsonb('config').$type<{
    maxDuration?: number;
    recordingEnabled?: boolean;
    transcriptionEnabled?: boolean;
    llmModel?: string;
    voiceId?: string;
  }>(),

  /** Session output/summary. */
  output: jsonb('output').$type<{
    summary?: string;
    keyInsights?: string[];
    actionItems?: string[];
    nextSteps?: string[];
  }>(),

  /** Quality metrics for the session. */
  quality: jsonb('quality').$type<{
    infrastructureScore?: number;
    comprehensionScore?: number;
    clarificationCount?: number;
    flaggedItems?: string[];
  }>(),

  /** Custom metadata. */
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  projectIdx: index('sessions_project_idx').on(table.projectId),
  stateIdx: index('sessions_state_idx').on(table.state),
  scheduledIdx: index('sessions_scheduled_idx').on(table.scheduledAt),
  deletedIdx: index('sessions_deleted_idx').on(table.deletedAt),
}));

/** Session participants. */
export const sessionParticipants = pgTable('session_participants', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Session this participant is in. */
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),

  /** User if registered, null for email-only participants. */
  userId: uuid('user_id').references(() => users.id),

  /** Participant email (for attribution). */
  email: text('email').notNull(),

  /** Participant display name. */
  displayName: text('display_name'),

  /** When participant joined. */
  joinedAt: timestamp('joined_at', { withTimezone: true }),

  /** When participant left. */
  leftAt: timestamp('left_at', { withTimezone: true }),

  /** Participant role in the session. */
  role: text('role').notNull().default('participant'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('session_participants_session_idx').on(table.sessionId),
  userIdx: index('session_participants_user_idx').on(table.userId),
  emailIdx: index('session_participants_email_idx').on(table.email),
}));

/** Real-time session transcripts. */
export const sessionTranscripts = pgTable('session_transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Session this transcript belongs to. */
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),

  /** Who spoke (participant ID or 'llm' for LLM). */
  speakerId: text('speaker_id').notNull(),

  /** Speaker type. */
  speakerType: text('speaker_type').notNull(), // 'human', 'llm'

  /** Speaker display name. */
  speakerName: text('speaker_name'),

  /** Transcript content. */
  content: text('content').notNull(),

  /** Timestamp within the session (milliseconds from start). */
  timestampMs: integer('timestamp_ms').notNull(),

  /** Confidence score for transcription (0-1). */
  confidence: text('confidence'),

  /** Whether this was flagged for review. */
  flagged: boolean('flagged').notNull().default(false),

  /** Flag reason if flagged. */
  flagReason: text('flag_reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('session_transcripts_session_idx').on(table.sessionId),
  timestampIdx: index('session_transcripts_timestamp_idx').on(table.sessionId, table.timestampMs),
}));
