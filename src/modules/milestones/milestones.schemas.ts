import { z } from 'zod';

export const createMilestoneSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    targetDate: z.string().datetime().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    milestoneId: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    targetDate: z.string().datetime().nullable().optional(),
    completedDate: z.string().datetime().nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export const listMilestonesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
});

export const getMilestoneSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    milestoneId: z.string().uuid(),
  }),
});

export const reorderMilestonesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  body: z.object({
    milestoneIds: z.array(z.string().uuid()).min(1),
  }),
});

export type ReorderMilestonesInput = z.infer<typeof reorderMilestonesSchema>;
