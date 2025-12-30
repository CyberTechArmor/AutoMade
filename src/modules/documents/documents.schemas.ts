import { z } from 'zod';

export const createDocumentSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200),
    type: z.enum(['requirements', 'design', 'api', 'architecture', 'user_guide', 'technical', 'other']),
    description: z.string().optional(),
    content: z.string().min(1),
    clientVisible: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    type: z.enum(['requirements', 'design', 'api', 'architecture', 'user_guide', 'technical', 'other']).optional(),
    description: z.string().nullable().optional(),
    state: z.enum(['draft', 'review', 'approved', 'archived']).optional(),
    clientVisible: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const createVersionSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
  body: z.object({
    content: z.string().min(1),
    changeReason: z.string().optional(),
  }),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;

export const listDocumentsSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
  query: z.object({
    type: z.enum(['requirements', 'design', 'api', 'architecture', 'user_guide', 'technical', 'other']).optional(),
    state: z.enum(['draft', 'review', 'approved', 'archived']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const getDocumentSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
});

export const getVersionSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    documentId: z.string().uuid(),
    version: z.coerce.number().int().positive(),
  }),
});

export const addCommentSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    documentId: z.string().uuid(),
    version: z.coerce.number().int().positive(),
  }),
  body: z.object({
    content: z.string().min(1).max(2000),
  }),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const uploadAttachmentSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
});

export const deleteAttachmentSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
    documentId: z.string().uuid(),
    attachmentId: z.string().uuid(),
  }),
});
