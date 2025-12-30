import { z } from 'zod';

export const createTimeEntrySchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  body: z.object({
    entryDate: z.string().datetime(),
    hours: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Hours must be a valid decimal number'),
    description: z.string().optional(),
    milestoneId: z.string().uuid().optional(),
    billable: z.boolean().optional().default(true),
  }),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

export const updateTimeEntrySchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    entryId: z.string().uuid(),
  }),
  body: z.object({
    entryDate: z.string().datetime().optional(),
    hours: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    description: z.string().nullable().optional(),
    milestoneId: z.string().uuid().nullable().optional(),
    billable: z.boolean().optional(),
  }),
});

export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

export const listTimeEntriesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    milestoneId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const getTimeEntrySchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    entryId: z.string().uuid(),
  }),
});

export const getProjectMetricsSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const createCostEntrySchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  body: z.object({
    source: z.enum(['manual', 'twilio', 'elevenlabs', 'anthropic', 'openai', 'google', 'livekit', 'other']),
    description: z.string().min(1),
    amountCents: z.number().int().positive(),
    currency: z.string().length(3).optional().default('USD'),
    incurredAt: z.string().datetime(),
    sessionId: z.string().uuid().optional(),
    externalId: z.string().optional(),
    breakdown: z.object({
      items: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        total: z.number(),
      })).optional(),
    }).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type CreateCostEntryInput = z.infer<typeof createCostEntrySchema>;

export const listCostEntriesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  query: z.object({
    source: z.enum(['manual', 'twilio', 'elevenlabs', 'anthropic', 'openai', 'google', 'livekit', 'other']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
