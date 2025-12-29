import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    clientId: z.string().uuid(),
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    stage: z.enum(['discovery', 'design', 'development', 'deployment', 'operation', 'completed', 'on_hold']).optional(),
    startDate: z.string().datetime().optional(),
    targetDate: z.string().datetime().optional(),
    repositoryUrl: z.string().url().optional(),
    estimatedHours: z.number().int().positive().optional(),
    estimatedCost: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    stage: z.enum(['discovery', 'design', 'development', 'deployment', 'operation', 'completed', 'on_hold']).optional(),
    startDate: z.string().datetime().nullable().optional(),
    targetDate: z.string().datetime().nullable().optional(),
    completedDate: z.string().datetime().nullable().optional(),
    repositoryUrl: z.string().url().nullable().optional(),
    documentationUrl: z.string().url().nullable().optional(),
    productionUrl: z.string().url().nullable().optional(),
    stagingUrl: z.string().url().nullable().optional(),
    estimatedHours: z.number().int().positive().nullable().optional(),
    actualHours: z.number().int().nonnegative().optional(),
    estimatedCost: z.number().int().positive().nullable().optional(),
    actualCost: z.number().int().nonnegative().optional(),
    overview: z.object({
      problem: z.string().optional(),
      goals: z.array(z.string()).optional(),
      nonGoals: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      successCriteria: z.array(z.string()).optional(),
    }).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().nullable().optional(),
  }),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const listProjectsSchema = z.object({
  query: z.object({
    clientId: z.string().uuid().optional(),
    stage: z.enum(['discovery', 'design', 'development', 'deployment', 'operation', 'completed', 'on_hold']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const getProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
