import { z } from 'zod';

export const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1).max(500),
    types: z.string().optional(), // comma-separated: clients,projects,sessions,documents
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});

export type SearchInput = z.infer<typeof searchSchema>;

export const reindexSchema = z.object({
  body: z.object({
    types: z.array(z.enum(['clients', 'projects', 'sessions', 'documents'])).optional(),
  }),
});

export type ReindexInput = z.infer<typeof reindexSchema>;
