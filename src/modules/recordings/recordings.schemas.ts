import { z } from 'zod';

export const listRecordingsSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  }),
  query: z.object({
    trackType: z.enum(['combined', 'video', 'audio']).optional(),
  }),
});

export const getRecordingSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
    recordingId: z.string().uuid(),
  }),
});

export const createRecordingSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  }),
  body: z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    trackType: z.enum(['combined', 'video', 'audio']),
    duration: z.number().int().positive().optional(),
    participantId: z.string().optional(),
    participantName: z.string().optional(),
    egressId: z.string().optional(),
  }),
});

export type CreateRecordingInput = z.infer<typeof createRecordingSchema>;

export const deleteRecordingSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
    recordingId: z.string().uuid(),
  }),
});

export const getTranscriptSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  }),
  query: z.object({
    format: z.enum(['json', 'text', 'vtt', 'srt']).optional().default('json'),
  }),
});
