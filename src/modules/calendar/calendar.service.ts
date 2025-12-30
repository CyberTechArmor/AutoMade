import { db, schema } from '../../db/index.js';
import { eq, and, isNull, gte, lte, or } from 'drizzle-orm';
import { audit } from '../../lib/audit.js';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  type: 'session' | 'milestone' | 'deadline' | 'meeting' | 'other';
  projectId: string | null;
  projectName?: string;
  sessionId?: string;
  milestoneId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface ListEventsOptions {
  start: Date;
  end: Date;
  projectId?: string;
  type?: string;
}

export async function listEvents(options: ListEventsOptions): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  // Get scheduled sessions within date range
  const sessionConditions = [
    isNull(schema.sessions.deletedAt),
    gte(schema.sessions.scheduledAt, options.start),
    lte(schema.sessions.scheduledAt, options.end),
  ];

  if (options.projectId) {
    sessionConditions.push(eq(schema.sessions.projectId, options.projectId));
  }

  if (!options.type || options.type === 'session') {
    const sessions = await db
      .select({
        session: schema.sessions,
        project: schema.projects,
      })
      .from(schema.sessions)
      .leftJoin(schema.projects, eq(schema.sessions.projectId, schema.projects.id))
      .where(and(...sessionConditions));

    events.push(
      ...sessions.map((s) => ({
        id: s.session.id,
        title: s.session.title,
        description: s.session.description,
        start: s.session.scheduledAt!,
        end: s.session.endedAt,
        allDay: false,
        type: 'session' as const,
        projectId: s.session.projectId,
        projectName: s.project?.name,
        sessionId: s.session.id,
        createdAt: s.session.createdAt,
        updatedAt: s.session.updatedAt,
      }))
    );
  }

  // Get milestone target dates within date range
  const milestoneConditions = [
    gte(schema.projectMilestones.targetDate, options.start),
    lte(schema.projectMilestones.targetDate, options.end),
  ];

  if (options.projectId) {
    milestoneConditions.push(eq(schema.projectMilestones.projectId, options.projectId));
  }

  if (!options.type || options.type === 'milestone' || options.type === 'deadline') {
    const milestones = await db
      .select({
        milestone: schema.projectMilestones,
        project: schema.projects,
      })
      .from(schema.projectMilestones)
      .leftJoin(schema.projects, eq(schema.projectMilestones.projectId, schema.projects.id))
      .where(and(...milestoneConditions));

    events.push(
      ...milestones.map((m) => ({
        id: m.milestone.id,
        title: `Milestone: ${m.milestone.name}`,
        description: m.milestone.description,
        start: m.milestone.targetDate!,
        end: null,
        allDay: true,
        type: (m.milestone.completedDate ? 'milestone' : 'deadline') as 'milestone' | 'deadline',
        projectId: m.milestone.projectId,
        projectName: m.project?.name,
        milestoneId: m.milestone.id,
        metadata: { completed: !!m.milestone.completedDate },
        createdAt: m.milestone.createdAt,
        updatedAt: m.milestone.updatedAt,
      }))
    );
  }

  // Sort by start date
  events.sort((a, b) => a.start.getTime() - b.start.getTime());

  return events;
}

// For custom calendar events (meetings, deadlines, etc.)
// This would require a calendar_events table, but for now we're aggregating from existing data

export async function getSessionsByDateRange(
  start: Date,
  end: Date,
  projectId?: string
): Promise<Array<typeof schema.sessions.$inferSelect>> {
  const conditions = [
    isNull(schema.sessions.deletedAt),
    or(
      and(gte(schema.sessions.scheduledAt, start), lte(schema.sessions.scheduledAt, end)),
      and(gte(schema.sessions.startedAt, start), lte(schema.sessions.startedAt, end))
    ),
  ];

  if (projectId) {
    conditions.push(eq(schema.sessions.projectId, projectId));
  }

  return db
    .select()
    .from(schema.sessions)
    .where(and(...conditions));
}

export async function getMilestonesByDateRange(
  start: Date,
  end: Date,
  projectId?: string
): Promise<Array<typeof schema.projectMilestones.$inferSelect>> {
  const conditions = [
    gte(schema.projectMilestones.targetDate, start),
    lte(schema.projectMilestones.targetDate, end),
  ];

  if (projectId) {
    conditions.push(eq(schema.projectMilestones.projectId, projectId));
  }

  return db
    .select()
    .from(schema.projectMilestones)
    .where(and(...conditions));
}

// Get upcoming events for a project (next 7 days)
export async function getUpcomingEvents(
  projectId: string,
  days: number = 7
): Promise<CalendarEvent[]> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);

  return listEvents({ start, end, projectId });
}
