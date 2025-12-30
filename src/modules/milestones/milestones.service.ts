import { db, schema } from '../../db/index.js';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
  ReorderMilestonesInput,
} from './milestones.schemas.js';

export async function listMilestones(
  projectId: string
): Promise<Array<typeof schema.projectMilestones.$inferSelect>> {
  // Verify project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project');
  }

  return db
    .select()
    .from(schema.projectMilestones)
    .where(eq(schema.projectMilestones.projectId, projectId))
    .orderBy(asc(schema.projectMilestones.sortOrder));
}

export async function getMilestoneById(
  projectId: string,
  milestoneId: string
): Promise<typeof schema.projectMilestones.$inferSelect | null> {
  const [milestone] = await db
    .select()
    .from(schema.projectMilestones)
    .where(
      and(
        eq(schema.projectMilestones.id, milestoneId),
        eq(schema.projectMilestones.projectId, projectId)
      )
    )
    .limit(1);

  return milestone ?? null;
}

export async function createMilestone(
  projectId: string,
  input: CreateMilestoneInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.projectMilestones.$inferSelect> {
  // Verify project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Get the next sort order if not specified
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const existingMilestones = await db
      .select()
      .from(schema.projectMilestones)
      .where(eq(schema.projectMilestones.projectId, projectId))
      .orderBy(asc(schema.projectMilestones.sortOrder));

    sortOrder = existingMilestones.length;
  }

  const [milestone] = await db
    .insert(schema.projectMilestones)
    .values({
      projectId,
      name: input.name,
      description: input.description,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      sortOrder,
    })
    .returning();

  if (!milestone) {
    throw new Error('Failed to create milestone');
  }

  await audit.create(userId, 'milestone', milestone.id, { name: milestone.name, projectId }, ip, requestId);

  return milestone;
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: UpdateMilestoneInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.projectMilestones.$inferSelect> {
  const existing = await getMilestoneById(projectId, milestoneId);

  if (!existing) {
    throw new NotFoundError('Milestone');
  }

  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  // Handle date conversions
  if (input.targetDate !== undefined) {
    updateData.targetDate = input.targetDate ? new Date(input.targetDate) : null;
  }
  if (input.completedDate !== undefined) {
    updateData.completedDate = input.completedDate ? new Date(input.completedDate) : null;
  }

  const [updated] = await db
    .update(schema.projectMilestones)
    .set(updateData)
    .where(eq(schema.projectMilestones.id, milestoneId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update milestone');
  }

  await audit.update(userId, 'milestone', milestoneId, existing, updated, ip, requestId);

  return updated;
}

export async function deleteMilestone(
  projectId: string,
  milestoneId: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const existing = await getMilestoneById(projectId, milestoneId);

  if (!existing) {
    throw new NotFoundError('Milestone');
  }

  await db
    .delete(schema.projectMilestones)
    .where(eq(schema.projectMilestones.id, milestoneId));

  await audit.delete(userId, 'milestone', milestoneId, existing, ip, requestId);
}

export async function reorderMilestones(
  projectId: string,
  milestoneIds: string[],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<Array<typeof schema.projectMilestones.$inferSelect>> {
  // Verify project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Update sort order for each milestone
  await db.transaction(async (tx) => {
    for (let i = 0; i < milestoneIds.length; i++) {
      await tx
        .update(schema.projectMilestones)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(schema.projectMilestones.id, milestoneIds[i]!),
            eq(schema.projectMilestones.projectId, projectId)
          )
        );
    }
  });

  // Return updated milestones
  const milestones = await listMilestones(projectId);

  await audit.update(userId, 'milestone_order', projectId, {}, { milestoneIds }, ip, requestId);

  return milestones;
}

export async function getMilestoneProgress(projectId: string): Promise<{
  total: number;
  completed: number;
  progress: number;
}> {
  const milestones = await listMilestones(projectId);
  const completed = milestones.filter((m) => m.completedDate !== null).length;

  return {
    total: milestones.length,
    completed,
    progress: milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0,
  };
}
