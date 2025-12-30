import { z } from 'zod';

export const listEventsSchema = z.object({
  query: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    projectId: z.string().uuid().optional(),
    type: z.enum(['session', 'milestone', 'deadline', 'meeting', 'other']).optional(),
  }),
});

export type ListEventsInput = z.infer<typeof listEventsSchema>;

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    start: z.string().datetime(),
    end: z.string().datetime().optional(),
    allDay: z.boolean().optional().default(false),
    type: z.enum(['session', 'milestone', 'deadline', 'meeting', 'other']),
    projectId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    milestoneId: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  params: z.object({
    eventId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().nullable().optional(),
    allDay: z.boolean().optional(),
    type: z.enum(['session', 'milestone', 'deadline', 'meeting', 'other']).optional(),
    projectId: z.string().uuid().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const getEventSchema = z.object({
  params: z.object({
    eventId: z.string().uuid(),
  }),
});
