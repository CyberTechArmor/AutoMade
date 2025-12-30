import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    type: z.enum(['voice', 'video', 'text', 'hybrid']).default('video'),
    scheduledAt: z.string().datetime().optional(),
    isAutonomous: z.boolean().default(true),
    config: z.object({
      maxDuration: z.number().int().positive().optional(),
      recordingEnabled: z.boolean().optional(),
      transcriptionEnabled: z.boolean().optional(),
      llmModel: z.string().optional(),
      voiceId: z.string().optional(),
    }).optional(),
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>['body'];

export const updateSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    type: z.enum(['voice', 'video', 'text', 'hybrid']).optional(),
    state: z.enum(['scheduled', 'pending', 'in_progress', 'paused', 'completed', 'cancelled']).optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    config: z.object({
      maxDuration: z.number().int().positive().optional(),
      recordingEnabled: z.boolean().optional(),
      transcriptionEnabled: z.boolean().optional(),
      llmModel: z.string().optional(),
      voiceId: z.string().optional(),
    }).optional(),
    output: z.object({
      summary: z.string().optional(),
      keyInsights: z.array(z.string()).optional(),
      actionItems: z.array(z.string()).optional(),
      nextSteps: z.array(z.string()).optional(),
    }).optional(),
  }),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const listSessionsSchema = z.object({
  query: z.object({
    projectId: z.string().uuid().optional(),
    state: z.enum(['scheduled', 'pending', 'in_progress', 'paused', 'completed', 'cancelled']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const getSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const addTranscriptSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    speakerId: z.string(),
    speakerType: z.enum(['human', 'llm']),
    speakerName: z.string().optional(),
    content: z.string(),
    timestampMs: z.number().int().nonnegative(),
    confidence: z.string().optional(),
    flagged: z.boolean().optional(),
    flagReason: z.string().optional(),
  }),
});

export type AddTranscriptInput = z.infer<typeof addTranscriptSchema>;

export const sessionMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    content: z.string().min(1),
  }),
});

export type SessionMessageInput = z.infer<typeof sessionMessageSchema>;

export const generateTokenSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    canPublish: z.boolean().optional().default(true),
    canSubscribe: z.boolean().optional().default(true),
  }),
});

export type GenerateTokenInput = z.infer<typeof generateTokenSchema>;
