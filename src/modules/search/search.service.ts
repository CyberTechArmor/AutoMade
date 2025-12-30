import { db, schema } from '../../db/index.js';
import { eq, and, isNull, sql, or, ilike, desc } from 'drizzle-orm';

export interface SearchResult {
  id: string;
  type: 'client' | 'project' | 'session' | 'document';
  title: string;
  description: string | null;
  url: string;
  highlight?: string;
  metadata?: Record<string, unknown>;
  updatedAt: Date;
}

interface SearchOptions {
  query: string;
  types?: string[];
  page: number;
  limit: number;
}

export async function search(options: SearchOptions): Promise<{
  data: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { query, types, page, limit } = options;
  const offset = (page - 1) * limit;

  const searchQuery = `%${query.toLowerCase()}%`;
  const results: SearchResult[] = [];

  // Determine which types to search
  const searchTypes = types?.length ? types : ['clients', 'projects', 'sessions', 'documents'];

  // Search clients
  if (searchTypes.includes('clients')) {
    const clients = await db
      .select()
      .from(schema.clients)
      .where(
        and(
          isNull(schema.clients.deletedAt),
          or(
            ilike(schema.clients.name, searchQuery),
            sql`COALESCE(${schema.clients.contactEmail}, '') ILIKE ${searchQuery}`,
            sql`COALESCE(${schema.clients.contactName}, '') ILIKE ${searchQuery}`
          )
        )
      )
      .orderBy(desc(schema.clients.updatedAt))
      .limit(limit);

    results.push(
      ...clients.map((c) => ({
        id: c.id,
        type: 'client' as const,
        title: c.name,
        description: c.contactName || c.contactEmail,
        url: `/clients/${c.id}`,
        metadata: { email: c.contactEmail, contactName: c.contactName },
        updatedAt: c.updatedAt,
      }))
    );
  }

  // Search projects
  if (searchTypes.includes('projects')) {
    const projects = await db
      .select()
      .from(schema.projects)
      .where(
        and(
          isNull(schema.projects.deletedAt),
          or(
            ilike(schema.projects.name, searchQuery),
            sql`COALESCE(${schema.projects.description}, '') ILIKE ${searchQuery}`
          )
        )
      )
      .orderBy(desc(schema.projects.updatedAt))
      .limit(limit);

    results.push(
      ...projects.map((p) => ({
        id: p.id,
        type: 'project' as const,
        title: p.name,
        description: p.description,
        url: `/projects/${p.id}`,
        metadata: { stage: p.stage, clientId: p.clientId },
        updatedAt: p.updatedAt,
      }))
    );
  }

  // Search sessions
  if (searchTypes.includes('sessions')) {
    const sessions = await db
      .select()
      .from(schema.sessions)
      .where(
        and(
          isNull(schema.sessions.deletedAt),
          or(
            ilike(schema.sessions.title, searchQuery),
            sql`COALESCE(${schema.sessions.description}, '') ILIKE ${searchQuery}`
          )
        )
      )
      .orderBy(desc(schema.sessions.updatedAt))
      .limit(limit);

    results.push(
      ...sessions.map((s) => ({
        id: s.id,
        type: 'session' as const,
        title: s.title,
        description: s.description,
        url: `/sessions/${s.id}`,
        metadata: { state: s.state, projectId: s.projectId },
        updatedAt: s.updatedAt,
      }))
    );
  }

  // Search documents
  if (searchTypes.includes('documents')) {
    const documents = await db
      .select()
      .from(schema.documents)
      .where(
        and(
          isNull(schema.documents.deletedAt),
          or(
            ilike(schema.documents.title, searchQuery),
            sql`COALESCE(${schema.documents.description}, '') ILIKE ${searchQuery}`
          )
        )
      )
      .orderBy(desc(schema.documents.updatedAt))
      .limit(limit);

    results.push(
      ...documents.map((d) => ({
        id: d.id,
        type: 'document' as const,
        title: d.title,
        description: d.description,
        url: `/projects/${d.projectId}/documents/${d.id}`,
        metadata: { type: d.type, state: d.state, projectId: d.projectId },
        updatedAt: d.updatedAt,
      }))
    );
  }

  // Sort all results by updatedAt
  results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  // Apply pagination
  const total = results.length;
  const paginatedResults = results.slice(offset, offset + limit);

  return {
    data: paginatedResults,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Full-text search using PostgreSQL (for future use with search_index table)
export async function fullTextSearch(options: SearchOptions): Promise<{
  data: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { query, types, page, limit } = options;
  const offset = (page - 1) * limit;

  // Build conditions for types filter
  const typeConditions = types?.length
    ? or(...types.map((t) => eq(schema.searchIndex.resourceType, t)))
    : undefined;

  // Use PostgreSQL full-text search with to_tsquery
  const searchTerm = query
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map((term) => `${term}:*`)
    .join(' & ');

  const whereClause = typeConditions
    ? and(
        typeConditions,
        sql`to_tsvector('english', ${schema.searchIndex.title} || ' ' || COALESCE(${schema.searchIndex.content}, '')) @@ to_tsquery('english', ${searchTerm})`
      )
    : sql`to_tsvector('english', ${schema.searchIndex.title} || ' ' || COALESCE(${schema.searchIndex.content}, '')) @@ to_tsquery('english', ${searchTerm})`;

  const [indexResults, countResult] = await Promise.all([
    db
      .select()
      .from(schema.searchIndex)
      .where(whereClause)
      .orderBy(
        sql`ts_rank(to_tsvector('english', ${schema.searchIndex.title} || ' ' || COALESCE(${schema.searchIndex.content}, '')), to_tsquery('english', ${searchTerm})) DESC`
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.searchIndex)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  const results: SearchResult[] = indexResults.map((r) => ({
    id: r.resourceId,
    type: r.resourceType as 'client' | 'project' | 'session' | 'document',
    title: r.title,
    description: r.content,
    url: getResourceUrl(r.resourceType, r.resourceId, r.metadata),
    metadata: r.metadata ?? undefined,
    updatedAt: r.updatedAt,
  }));

  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function getResourceUrl(
  type: string,
  id: string,
  metadata?: Record<string, unknown> | null
): string {
  switch (type) {
    case 'client':
      return `/clients/${id}`;
    case 'project':
      return `/projects/${id}`;
    case 'session':
      return `/sessions/${id}`;
    case 'document':
      return metadata?.projectId
        ? `/projects/${metadata.projectId}/documents/${id}`
        : `/documents/${id}`;
    default:
      return `/${type}s/${id}`;
  }
}

// Index a resource in the search_index table
export async function indexResource(
  resourceType: string,
  resourceId: string,
  title: string,
  content?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Upsert the search index entry
  await db
    .insert(schema.searchIndex)
    .values({
      resourceType,
      resourceId,
      title,
      content,
      metadata,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.searchIndex.resourceType, schema.searchIndex.resourceId],
      set: {
        title,
        content,
        metadata,
        updatedAt: new Date(),
      },
    });
}

// Remove a resource from the search index
export async function removeFromIndex(
  resourceType: string,
  resourceId: string
): Promise<void> {
  await db
    .delete(schema.searchIndex)
    .where(
      and(
        eq(schema.searchIndex.resourceType, resourceType),
        eq(schema.searchIndex.resourceId, resourceId)
      )
    );
}

// Rebuild the entire search index
export async function rebuildIndex(types?: string[]): Promise<{
  indexed: number;
  types: string[];
}> {
  const indexTypes = types?.length ? types : ['clients', 'projects', 'sessions', 'documents'];
  let indexed = 0;

  if (indexTypes.includes('clients')) {
    const clients = await db
      .select()
      .from(schema.clients)
      .where(isNull(schema.clients.deletedAt));

    for (const client of clients) {
      await indexResource('client', client.id, client.name, client.contactName ?? undefined, {
        email: client.contactEmail,
        contactName: client.contactName,
      });
      indexed++;
    }
  }

  if (indexTypes.includes('projects')) {
    const projects = await db
      .select()
      .from(schema.projects)
      .where(isNull(schema.projects.deletedAt));

    for (const project of projects) {
      await indexResource('project', project.id, project.name, project.description ?? undefined, {
        stage: project.stage,
        clientId: project.clientId,
      });
      indexed++;
    }
  }

  if (indexTypes.includes('sessions')) {
    const sessions = await db
      .select()
      .from(schema.sessions)
      .where(isNull(schema.sessions.deletedAt));

    for (const session of sessions) {
      await indexResource('session', session.id, session.title, session.description ?? undefined, {
        state: session.state,
        projectId: session.projectId,
      });
      indexed++;
    }
  }

  if (indexTypes.includes('documents')) {
    const documents = await db
      .select()
      .from(schema.documents)
      .where(isNull(schema.documents.deletedAt));

    for (const doc of documents) {
      // Get latest version content
      const [version] = await db
        .select()
        .from(schema.documentVersions)
        .where(
          and(
            eq(schema.documentVersions.documentId, doc.id),
            eq(schema.documentVersions.version, doc.currentVersion)
          )
        )
        .limit(1);

      const content = [doc.description, version?.content].filter(Boolean).join(' ');

      await indexResource('document', doc.id, doc.title, content, {
        type: doc.type,
        state: doc.state,
        projectId: doc.projectId,
      });
      indexed++;
    }
  }

  return { indexed, types: indexTypes };
}
