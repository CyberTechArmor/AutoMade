import { db, schema } from '../../db/index.js';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { storage, storagePaths } from '../../lib/storage.js';
import { randomUUID } from 'crypto';
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateVersionInput,
  AddCommentInput,
} from './documents.schemas.js';
import { Readable } from 'stream';

interface ListDocumentsOptions {
  projectId: string;
  type?: string;
  state?: string;
  page: number;
  limit: number;
}

export async function listDocuments(options: ListDocumentsOptions): Promise<{
  data: Array<typeof schema.documents.$inferSelect>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions = [
    eq(schema.documents.projectId, options.projectId),
    isNull(schema.documents.deletedAt),
  ];

  if (options.type) {
    conditions.push(eq(schema.documents.type, options.type));
  }

  if (options.state) {
    conditions.push(eq(schema.documents.state, options.state as typeof schema.documents.state.enumValues[number]));
  }

  const whereClause = and(...conditions);
  const offset = (options.page - 1) * options.limit;

  const [documents, countResult] = await Promise.all([
    db
      .select()
      .from(schema.documents)
      .where(whereClause)
      .orderBy(desc(schema.documents.updatedAt))
      .limit(options.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.documents)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: documents,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function getDocumentById(
  projectId: string,
  documentId: string
): Promise<typeof schema.documents.$inferSelect | null> {
  const [document] = await db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.id, documentId),
        eq(schema.documents.projectId, projectId),
        isNull(schema.documents.deletedAt)
      )
    )
    .limit(1);

  return document ?? null;
}

export async function getDocumentWithVersions(
  projectId: string,
  documentId: string
): Promise<{
  document: typeof schema.documents.$inferSelect;
  versions: Array<typeof schema.documentVersions.$inferSelect>;
  attachments: Array<typeof schema.documentAttachments.$inferSelect>;
} | null> {
  const document = await getDocumentById(projectId, documentId);

  if (!document) {
    return null;
  }

  const [versions, attachments] = await Promise.all([
    db
      .select()
      .from(schema.documentVersions)
      .where(eq(schema.documentVersions.documentId, documentId))
      .orderBy(desc(schema.documentVersions.version)),
    db
      .select()
      .from(schema.documentAttachments)
      .where(eq(schema.documentAttachments.documentId, documentId))
      .orderBy(desc(schema.documentAttachments.createdAt)),
  ]);

  return { document, versions, attachments };
}

export async function getDocumentVersion(
  projectId: string,
  documentId: string,
  version: number
): Promise<typeof schema.documentVersions.$inferSelect | null> {
  // First verify the document exists and belongs to the project
  const document = await getDocumentById(projectId, documentId);
  if (!document) {
    return null;
  }

  const [docVersion] = await db
    .select()
    .from(schema.documentVersions)
    .where(
      and(
        eq(schema.documentVersions.documentId, documentId),
        eq(schema.documentVersions.version, version)
      )
    )
    .limit(1);

  return docVersion ?? null;
}

export async function createDocument(
  projectId: string,
  input: CreateDocumentInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.documents.$inferSelect> {
  // Verify project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Create document and initial version in a transaction
  const result = await db.transaction(async (tx) => {
    const [document] = await tx
      .insert(schema.documents)
      .values({
        projectId,
        title: input.title,
        type: input.type,
        description: input.description,
        clientVisible: input.clientVisible ?? false,
        tags: input.tags ?? [],
        metadata: input.metadata,
        currentVersion: 1,
        state: 'draft',
      })
      .returning();

    if (!document) {
      throw new Error('Failed to create document');
    }

    // Create initial version
    await tx.insert(schema.documentVersions).values({
      documentId: document.id,
      version: 1,
      content: input.content,
      authorId: userId,
      changeReason: 'Initial version',
    });

    return document;
  });

  await audit.create(userId, 'document', result.id, { title: result.title, projectId }, ip, requestId);

  return result;
}

export async function updateDocument(
  projectId: string,
  documentId: string,
  input: UpdateDocumentInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.documents.$inferSelect> {
  const existing = await getDocumentById(projectId, documentId);

  if (!existing) {
    throw new NotFoundError('Document');
  }

  const [updated] = await db
    .update(schema.documents)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(schema.documents.id, documentId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update document');
  }

  await audit.update(userId, 'document', documentId, existing, updated, ip, requestId);

  return updated;
}

export async function createVersion(
  projectId: string,
  documentId: string,
  input: CreateVersionInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.documentVersions.$inferSelect> {
  const document = await getDocumentById(projectId, documentId);

  if (!document) {
    throw new NotFoundError('Document');
  }

  const newVersion = document.currentVersion + 1;

  const result = await db.transaction(async (tx) => {
    // Update document's current version
    await tx
      .update(schema.documents)
      .set({
        currentVersion: newVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.documents.id, documentId));

    // Create new version
    const [version] = await tx
      .insert(schema.documentVersions)
      .values({
        documentId,
        version: newVersion,
        content: input.content,
        authorId: userId,
        changeReason: input.changeReason,
      })
      .returning();

    if (!version) {
      throw new Error('Failed to create version');
    }

    return version;
  });

  await audit.create(userId, 'document_version', result.id, { documentId, version: newVersion }, ip, requestId);

  return result;
}

export async function addComment(
  projectId: string,
  documentId: string,
  version: number,
  input: AddCommentInput['body'],
  userId: string
): Promise<typeof schema.documentVersions.$inferSelect> {
  const docVersion = await getDocumentVersion(projectId, documentId, version);

  if (!docVersion) {
    throw new NotFoundError('Document version');
  }

  // Look up the user's name
  const [user] = await db
    .select({ displayName: schema.users.displayName, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const userName = user?.displayName || user?.email || userId;

  const newComment = {
    id: randomUUID(),
    authorId: userId,
    authorName: userName,
    content: input.content,
    timestamp: new Date().toISOString(),
  };

  const existingComments = docVersion.comments ?? [];

  const [updated] = await db
    .update(schema.documentVersions)
    .set({
      comments: [...existingComments, newComment],
    })
    .where(eq(schema.documentVersions.id, docVersion.id))
    .returning();

  if (!updated) {
    throw new Error('Failed to add comment');
  }

  return updated;
}

export async function deleteDocument(
  projectId: string,
  documentId: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const existing = await getDocumentById(projectId, documentId);

  if (!existing) {
    throw new NotFoundError('Document');
  }

  // Soft delete
  await db
    .update(schema.documents)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.documents.id, documentId));

  await audit.delete(userId, 'document', documentId, existing, ip, requestId);
}

export async function uploadAttachment(
  projectId: string,
  documentId: string,
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  },
  userId: string
): Promise<typeof schema.documentAttachments.$inferSelect> {
  const document = await getDocumentById(projectId, documentId);

  if (!document) {
    throw new NotFoundError('Document');
  }

  // Upload to storage
  const storagePath = storagePaths.documents(
    projectId,
    documentId,
    document.currentVersion,
    file.originalname
  );

  const storageResult = await storage.upload(storagePath, file.buffer);

  // Create attachment record
  const [attachment] = await db
    .insert(schema.documentAttachments)
    .values({
      documentId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storageUrl: storagePath,
      uploadedBy: userId,
    })
    .returning();

  if (!attachment) {
    throw new Error('Failed to create attachment record');
  }

  return attachment;
}

export async function getAttachment(
  projectId: string,
  documentId: string,
  attachmentId: string
): Promise<{
  attachment: typeof schema.documentAttachments.$inferSelect;
  stream: Readable;
} | null> {
  const document = await getDocumentById(projectId, documentId);

  if (!document) {
    return null;
  }

  const [attachment] = await db
    .select()
    .from(schema.documentAttachments)
    .where(
      and(
        eq(schema.documentAttachments.id, attachmentId),
        eq(schema.documentAttachments.documentId, documentId)
      )
    )
    .limit(1);

  if (!attachment) {
    return null;
  }

  const stream = await storage.download(attachment.storageUrl);

  return { attachment, stream };
}

export async function deleteAttachment(
  projectId: string,
  documentId: string,
  attachmentId: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const document = await getDocumentById(projectId, documentId);

  if (!document) {
    throw new NotFoundError('Document');
  }

  const [attachment] = await db
    .select()
    .from(schema.documentAttachments)
    .where(
      and(
        eq(schema.documentAttachments.id, attachmentId),
        eq(schema.documentAttachments.documentId, documentId)
      )
    )
    .limit(1);

  if (!attachment) {
    throw new NotFoundError('Attachment');
  }

  // Delete from storage
  await storage.delete(attachment.storageUrl);

  // Delete record
  await db
    .delete(schema.documentAttachments)
    .where(eq(schema.documentAttachments.id, attachmentId));

  await audit.delete(userId, 'document_attachment', attachmentId, attachment, ip, requestId);
}
