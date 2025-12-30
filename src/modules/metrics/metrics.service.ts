import { db, schema } from '../../db/index.js';
import { eq, and, isNull, desc, sql, gte, lte } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import type {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  CreateCostEntryInput,
} from './metrics.schemas.js';

interface ListTimeEntriesOptions {
  projectId: string;
  startDate?: string;
  endDate?: string;
  milestoneId?: string;
  page: number;
  limit: number;
}

export async function listTimeEntries(options: ListTimeEntriesOptions): Promise<{
  data: Array<typeof schema.timeEntries.$inferSelect>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions = [eq(schema.timeEntries.projectId, options.projectId)];

  if (options.startDate) {
    conditions.push(gte(schema.timeEntries.entryDate, new Date(options.startDate)));
  }
  if (options.endDate) {
    conditions.push(lte(schema.timeEntries.entryDate, new Date(options.endDate)));
  }
  if (options.milestoneId) {
    conditions.push(eq(schema.timeEntries.milestoneId, options.milestoneId));
  }

  const whereClause = and(...conditions);
  const offset = (options.page - 1) * options.limit;

  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(schema.timeEntries)
      .where(whereClause)
      .orderBy(desc(schema.timeEntries.entryDate))
      .limit(options.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.timeEntries)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: entries,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function getTimeEntryById(
  projectId: string,
  entryId: string
): Promise<typeof schema.timeEntries.$inferSelect | null> {
  const [entry] = await db
    .select()
    .from(schema.timeEntries)
    .where(
      and(
        eq(schema.timeEntries.id, entryId),
        eq(schema.timeEntries.projectId, projectId)
      )
    )
    .limit(1);

  return entry ?? null;
}

export async function createTimeEntry(
  projectId: string,
  input: CreateTimeEntryInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.timeEntries.$inferSelect> {
  // Verify project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project');
  }

  const [entry] = await db
    .insert(schema.timeEntries)
    .values({
      projectId,
      userId,
      entryDate: new Date(input.entryDate),
      hours: input.hours,
      description: input.description,
      milestoneId: input.milestoneId,
      billable: input.billable ?? true,
    })
    .returning();

  if (!entry) {
    throw new Error('Failed to create time entry');
  }

  // Update project actual hours
  const hoursToAdd = parseFloat(input.hours);
  await db
    .update(schema.projects)
    .set({
      actualHours: sql`${schema.projects.actualHours} + ${Math.round(hoursToAdd)}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, projectId));

  await audit.create(userId, 'time_entry', entry.id, { projectId, hours: input.hours }, ip, requestId);

  return entry;
}

export async function updateTimeEntry(
  projectId: string,
  entryId: string,
  input: UpdateTimeEntryInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.timeEntries.$inferSelect> {
  const existing = await getTimeEntryById(projectId, entryId);

  if (!existing) {
    throw new NotFoundError('Time entry');
  }

  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  if (input.entryDate !== undefined) {
    updateData.entryDate = new Date(input.entryDate);
  }

  const [updated] = await db
    .update(schema.timeEntries)
    .set(updateData)
    .where(eq(schema.timeEntries.id, entryId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update time entry');
  }

  // Update project hours if hours changed
  if (input.hours && input.hours !== existing.hours) {
    const hoursDiff = parseFloat(input.hours) - parseFloat(existing.hours);
    await db
      .update(schema.projects)
      .set({
        actualHours: sql`${schema.projects.actualHours} + ${Math.round(hoursDiff)}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId));
  }

  await audit.update(userId, 'time_entry', entryId, existing, updated, ip, requestId);

  return updated;
}

export async function deleteTimeEntry(
  projectId: string,
  entryId: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const existing = await getTimeEntryById(projectId, entryId);

  if (!existing) {
    throw new NotFoundError('Time entry');
  }

  await db
    .delete(schema.timeEntries)
    .where(eq(schema.timeEntries.id, entryId));

  // Subtract hours from project
  const hoursToSubtract = parseFloat(existing.hours);
  await db
    .update(schema.projects)
    .set({
      actualHours: sql`GREATEST(0, ${schema.projects.actualHours} - ${Math.round(hoursToSubtract)})`,
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, projectId));

  await audit.delete(userId, 'time_entry', entryId, existing, ip, requestId);
}

interface ProjectMetricsOptions {
  projectId: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectMetrics {
  totalHours: number;
  billableHours: number;
  totalCost: number;
  costBreakdown: {
    source: string;
    amount: number;
    percentage: number;
  }[];
  hoursOverTime: {
    date: string;
    hours: number;
  }[];
  milestoneProgress: {
    total: number;
    completed: number;
    progress: number;
  };
  estimatedVsActual: {
    estimatedHours: number | null;
    actualHours: number;
    estimatedCost: number | null;
    actualCost: number;
  };
}

export async function getProjectMetrics(options: ProjectMetricsOptions): Promise<ProjectMetrics> {
  // Verify project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, options.projectId), isNull(schema.projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Build time entries conditions
  const timeConditions = [eq(schema.timeEntries.projectId, options.projectId)];
  if (options.startDate) {
    timeConditions.push(gte(schema.timeEntries.entryDate, new Date(options.startDate)));
  }
  if (options.endDate) {
    timeConditions.push(lte(schema.timeEntries.entryDate, new Date(options.endDate)));
  }

  // Build cost conditions
  const costConditions = [eq(schema.costEntries.projectId, options.projectId)];
  if (options.startDate) {
    costConditions.push(gte(schema.costEntries.incurredAt, new Date(options.startDate)));
  }
  if (options.endDate) {
    costConditions.push(lte(schema.costEntries.incurredAt, new Date(options.endDate)));
  }

  // Get time entries
  const timeEntries = await db
    .select()
    .from(schema.timeEntries)
    .where(and(...timeConditions));

  // Get cost entries
  const costEntries = await db
    .select()
    .from(schema.costEntries)
    .where(and(...costConditions));

  // Get milestones
  const milestones = await db
    .select()
    .from(schema.projectMilestones)
    .where(eq(schema.projectMilestones.projectId, options.projectId));

  // Calculate totals
  const totalHours = timeEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
  const billableHours = timeEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + parseFloat(e.hours), 0);

  const totalCost = costEntries.reduce((sum, e) => sum + e.amountCents, 0);

  // Cost breakdown by source
  const costBySource = costEntries.reduce((acc, entry) => {
    acc[entry.source] = (acc[entry.source] || 0) + entry.amountCents;
    return acc;
  }, {} as Record<string, number>);

  const costBreakdown = Object.entries(costBySource).map(([source, amount]) => ({
    source,
    amount,
    percentage: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0,
  }));

  // Hours over time (grouped by date)
  const hoursByDate = timeEntries.reduce((acc, entry) => {
    const date = entry.entryDate.toISOString().split('T')[0]!;
    acc[date] = (acc[date] || 0) + parseFloat(entry.hours);
    return acc;
  }, {} as Record<string, number>);

  const hoursOverTime = Object.entries(hoursByDate)
    .map(([date, hours]) => ({ date, hours }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Milestone progress
  const completedMilestones = milestones.filter((m) => m.completedDate !== null).length;

  return {
    totalHours,
    billableHours,
    totalCost,
    costBreakdown,
    hoursOverTime,
    milestoneProgress: {
      total: milestones.length,
      completed: completedMilestones,
      progress: milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0,
    },
    estimatedVsActual: {
      estimatedHours: project.estimatedHours,
      actualHours: project.actualHours,
      estimatedCost: project.estimatedCost,
      actualCost: project.actualCost,
    },
  };
}

// Cost entries functions
interface ListCostEntriesOptions {
  projectId: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export async function listCostEntries(options: ListCostEntriesOptions): Promise<{
  data: Array<typeof schema.costEntries.$inferSelect>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions = [eq(schema.costEntries.projectId, options.projectId)];

  if (options.source) {
    conditions.push(eq(schema.costEntries.source, options.source as typeof schema.costEntries.source.enumValues[number]));
  }
  if (options.startDate) {
    conditions.push(gte(schema.costEntries.incurredAt, new Date(options.startDate)));
  }
  if (options.endDate) {
    conditions.push(lte(schema.costEntries.incurredAt, new Date(options.endDate)));
  }

  const whereClause = and(...conditions);
  const offset = (options.page - 1) * options.limit;

  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(schema.costEntries)
      .where(whereClause)
      .orderBy(desc(schema.costEntries.incurredAt))
      .limit(options.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.costEntries)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: entries,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function createCostEntry(
  projectId: string,
  input: CreateCostEntryInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.costEntries.$inferSelect> {
  // Verify project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project');
  }

  const [entry] = await db
    .insert(schema.costEntries)
    .values({
      projectId,
      source: input.source,
      description: input.description,
      amountCents: input.amountCents,
      currency: input.currency ?? 'USD',
      incurredAt: new Date(input.incurredAt),
      sessionId: input.sessionId,
      externalId: input.externalId,
      breakdown: input.breakdown,
      metadata: input.metadata,
    })
    .returning();

  if (!entry) {
    throw new Error('Failed to create cost entry');
  }

  // Update project actual cost
  await db
    .update(schema.projects)
    .set({
      actualCost: sql`${schema.projects.actualCost} + ${input.amountCents}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, projectId));

  await audit.create(userId, 'cost_entry', entry.id, { projectId, amount: input.amountCents }, ip, requestId);

  return entry;
}
