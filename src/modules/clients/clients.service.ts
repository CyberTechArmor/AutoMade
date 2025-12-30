import { db, schema } from '../../db/index.js';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import type { CreateClientInput, UpdateClientInput } from './clients.schemas.js';

interface ListClientsOptions {
  page: number;
  limit: number;
}

export async function listClients(options: ListClientsOptions): Promise<{
  data: Array<typeof schema.clients.$inferSelect>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions = [isNull(schema.clients.deletedAt)];
  const whereClause = and(...conditions);
  const offset = (options.page - 1) * options.limit;

  const [clients, countResult] = await Promise.all([
    db
      .select()
      .from(schema.clients)
      .where(whereClause)
      .orderBy(desc(schema.clients.updatedAt))
      .limit(options.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.clients)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: clients,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function getClientById(id: string): Promise<typeof schema.clients.$inferSelect | null> {
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.id, id), isNull(schema.clients.deletedAt)))
    .limit(1);

  return client ?? null;
}

export async function getClientWithDetails(id: string): Promise<{
  client: typeof schema.clients.$inferSelect;
  projects: Array<typeof schema.projects.$inferSelect>;
  projectCount: number;
} | null> {
  const client = await getClientById(id);

  if (!client) {
    return null;
  }

  const projects = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.clientId, id), isNull(schema.projects.deletedAt)))
    .orderBy(desc(schema.projects.updatedAt));

  return {
    client,
    projects,
    projectCount: projects.length,
  };
}

export async function createClient(
  input: CreateClientInput,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.clients.$inferSelect> {
  const [client] = await db
    .insert(schema.clients)
    .values(input)
    .returning();

  if (!client) {
    throw new Error('Failed to create client');
  }

  await audit.create(userId, 'client', client.id, { name: client.name }, ip, requestId);

  return client;
}

export async function updateClient(
  id: string,
  input: UpdateClientInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<typeof schema.clients.$inferSelect> {
  const existing = await getClientById(id);

  if (!existing) {
    throw new NotFoundError('Client');
  }

  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(schema.clients)
    .set(updateData)
    .where(eq(schema.clients.id, id))
    .returning();

  if (!updated) {
    throw new Error('Failed to update client');
  }

  await audit.update(userId, 'client', id, existing, updated, ip, requestId);

  return updated;
}

export async function deleteClient(
  id: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const existing = await getClientById(id);

  if (!existing) {
    throw new NotFoundError('Client');
  }

  // Soft delete
  await db
    .update(schema.clients)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.clients.id, id));

  await audit.delete(userId, 'client', id, existing, ip, requestId);
}
