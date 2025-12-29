import { db, schema } from '../../db/index.js';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas.js';

interface ListProjectsOptions {
  clientId?: string;
  stage?: string;
  page: number;
  limit: number;
}

export async function listProjects(options: ListProjectsOptions): Promise<{
  data: Array<typeof schema.projects.$inferSelect>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions = [isNull(schema.projects.deletedAt)];

  if (options.clientId) {
    conditions.push(eq(schema.projects.clientId, options.clientId));
  }

  if (options.stage) {
    conditions.push(eq(schema.projects.stage, options.stage as typeof schema.projects.stage.enumValues[number]));
  }

  const whereClause = and(...conditions);
  const offset = (options.page - 1) * options.limit;

  const [projects, countResult] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(whereClause)
      .orderBy(desc(schema.projects.updatedAt))
      .limit(options.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.projects)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: projects,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function getProjectById(id: string): Promise<typeof schema.projects.$inferSelect | null> {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), isNull(schema.projects.deletedAt)))
    .limit(1);

  return project ?? null;
}

export async function getProjectWithDetails(id: string): Promise<{
  project: typeof schema.projects.$inferSelect;
  client: typeof schema.clients.$inferSelect | null;
  milestones: Array<typeof schema.projectMilestones.$inferSelect>;
  recentSessions: Array<typeof schema.sessions.$inferSelect>;
} | null> {
  const project = await getProjectById(id);

  if (!project) {
    return null;
  }

  const [client, milestones, recentSessions] = await Promise.all([
    db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, project.clientId))
      .limit(1)
      .then(rows => rows[0] ?? null),
    db
      .select()
      .from(schema.projectMilestones)
      .where(eq(schema.projectMilestones.projectId, id))
      .orderBy(schema.projectMilestones.sortOrder),
    db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.projectId, id), isNull(schema.sessions.deletedAt)))
      .orderBy(desc(schema.sessions.createdAt))
      .limit(5),
  ]);

  return { project, client, milestones, recentSessions };
}

export async function createProject(
  input: CreateProjectInput,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.projects.$inferSelect> {
  const [project] = await db
    .insert(schema.projects)
    .values({
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    })
    .returning();

  if (!project) {
    throw new Error('Failed to create project');
  }

  await audit.create(userId, 'project', project.id, { name: project.name }, ip, requestId);

  return project;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.projects.$inferSelect> {
  const existing = await getProjectById(id);

  if (!existing) {
    throw new NotFoundError('Project');
  }

  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  // Handle date conversions
  if (input.startDate !== undefined) {
    updateData.startDate = input.startDate ? new Date(input.startDate) : null;
  }
  if (input.targetDate !== undefined) {
    updateData.targetDate = input.targetDate ? new Date(input.targetDate) : null;
  }
  if (input.completedDate !== undefined) {
    updateData.completedDate = input.completedDate ? new Date(input.completedDate) : null;
  }

  const [updated] = await db
    .update(schema.projects)
    .set(updateData)
    .where(eq(schema.projects.id, id))
    .returning();

  if (!updated) {
    throw new Error('Failed to update project');
  }

  await audit.update(userId, 'project', id, existing, updated, ip, requestId);

  return updated;
}

export async function deleteProject(
  id: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const existing = await getProjectById(id);

  if (!existing) {
    throw new NotFoundError('Project');
  }

  // Soft delete
  await db
    .update(schema.projects)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, id));

  await audit.delete(userId, 'project', id, existing, ip, requestId);
}

export async function getProjectsByClient(clientId: string): Promise<Array<typeof schema.projects.$inferSelect>> {
  return db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.clientId, clientId), isNull(schema.projects.deletedAt)))
    .orderBy(desc(schema.projects.updatedAt));
}
