import { db, schema } from '../../db/index.js';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { audit } from '../../lib/audit.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { logger } from '../../lib/logger.js';
import type {
  CreateProviderInput,
  UpdateProviderInput,
} from './providers.schemas.js';
import { validateCredentials } from './providers.schemas.js';

// Type for provider from database
type Provider = typeof schema.serviceProviders.$inferSelect;

// Public provider type (without sensitive credentials)
interface PublicProvider {
  id: string;
  name: string;
  type: string;
  service: string;
  enabled: boolean;
  isPrimary: boolean;
  priority: number;
  hasCredentials: boolean;
  config: Record<string, unknown> | null;
  lastUsedAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  stats: Provider['stats'];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert provider to public format (hide sensitive credentials)
 */
function toPublicProvider(provider: Provider): PublicProvider {
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    service: provider.service,
    enabled: provider.enabled,
    isPrimary: provider.isPrimary,
    priority: provider.priority,
    hasCredentials: provider.credentials !== null && Object.keys(provider.credentials).length > 0,
    config: provider.config,
    lastUsedAt: provider.lastUsedAt,
    lastError: provider.lastError,
    lastErrorAt: provider.lastErrorAt,
    stats: provider.stats,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

/**
 * List all providers
 */
export async function listProviders(options: {
  type?: string;
  service?: string;
  enabled?: 'true' | 'false';
  page: number;
  limit: number;
}): Promise<{
  data: PublicProvider[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions = [isNull(schema.serviceProviders.deletedAt)];

  if (options.type) {
    conditions.push(eq(schema.serviceProviders.type, options.type as typeof schema.serviceProviders.type.enumValues[number]));
  }

  if (options.service) {
    conditions.push(eq(schema.serviceProviders.service, options.service as typeof schema.serviceProviders.service.enumValues[number]));
  }

  if (options.enabled !== undefined) {
    conditions.push(eq(schema.serviceProviders.enabled, options.enabled === 'true'));
  }

  const whereClause = and(...conditions);
  const offset = (options.page - 1) * options.limit;

  const [providers, countResult] = await Promise.all([
    db
      .select()
      .from(schema.serviceProviders)
      .where(whereClause)
      .orderBy(asc(schema.serviceProviders.priority), desc(schema.serviceProviders.createdAt))
      .limit(options.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.serviceProviders)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: providers.map(toPublicProvider),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

/**
 * Get provider by ID
 */
export async function getProviderById(id: string): Promise<PublicProvider | null> {
  const [provider] = await db
    .select()
    .from(schema.serviceProviders)
    .where(and(eq(schema.serviceProviders.id, id), isNull(schema.serviceProviders.deletedAt)))
    .limit(1);

  return provider ? toPublicProvider(provider) : null;
}

/**
 * Get provider with credentials (internal use only)
 */
export async function getProviderWithCredentials(id: string): Promise<Provider | null> {
  const [provider] = await db
    .select()
    .from(schema.serviceProviders)
    .where(and(eq(schema.serviceProviders.id, id), isNull(schema.serviceProviders.deletedAt)))
    .limit(1);

  if (!provider) {
    return null;
  }

  // Decrypt credentials
  try {
    const decryptedCredentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(provider.credentials)) {
      decryptedCredentials[key] = decrypt(value);
    }
    return { ...provider, credentials: decryptedCredentials };
  } catch (error) {
    logger.error({ error, providerId: id }, 'Failed to decrypt provider credentials');
    return null;
  }
}

/**
 * Get enabled providers by type, ordered by priority
 */
export async function getProvidersByType(
  type: typeof schema.serviceProviders.type.enumValues[number]
): Promise<Provider[]> {
  const providers = await db
    .select()
    .from(schema.serviceProviders)
    .where(
      and(
        eq(schema.serviceProviders.type, type),
        eq(schema.serviceProviders.enabled, true),
        isNull(schema.serviceProviders.deletedAt)
      )
    )
    .orderBy(asc(schema.serviceProviders.priority));

  // Decrypt credentials for each provider
  return Promise.all(
    providers.map(async (provider) => {
      try {
        const decryptedCredentials: Record<string, string> = {};
        for (const [key, value] of Object.entries(provider.credentials)) {
          decryptedCredentials[key] = decrypt(value);
        }
        return { ...provider, credentials: decryptedCredentials };
      } catch {
        logger.error({ providerId: provider.id }, 'Failed to decrypt provider credentials');
        return provider;
      }
    })
  );
}

/**
 * Get primary provider for a type
 */
export async function getPrimaryProvider(
  type: typeof schema.serviceProviders.type.enumValues[number]
): Promise<Provider | null> {
  const [provider] = await db
    .select()
    .from(schema.serviceProviders)
    .where(
      and(
        eq(schema.serviceProviders.type, type),
        eq(schema.serviceProviders.isPrimary, true),
        eq(schema.serviceProviders.enabled, true),
        isNull(schema.serviceProviders.deletedAt)
      )
    )
    .limit(1);

  if (!provider) {
    // Fall back to first enabled provider by priority
    const [fallback] = await db
      .select()
      .from(schema.serviceProviders)
      .where(
        and(
          eq(schema.serviceProviders.type, type),
          eq(schema.serviceProviders.enabled, true),
          isNull(schema.serviceProviders.deletedAt)
        )
      )
      .orderBy(asc(schema.serviceProviders.priority))
      .limit(1);

    if (!fallback) {
      return null;
    }

    return getProviderWithCredentials(fallback.id);
  }

  return getProviderWithCredentials(provider.id);
}

/**
 * Create a new provider
 */
export async function createProvider(
  input: CreateProviderInput,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<PublicProvider> {
  // Validate credentials for the specific type
  const validation = validateCredentials(input.type, input.service, input.credentials);
  if (!validation.valid) {
    throw new ValidationError(validation.errors?.join(', ') || 'Invalid credentials');
  }

  // Encrypt credentials
  const encryptedCredentials: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.credentials)) {
    encryptedCredentials[key] = encrypt(value);
  }

  // If setting as primary, unset other primary providers of same type
  if (input.isPrimary) {
    await db
      .update(schema.serviceProviders)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.serviceProviders.type, input.type),
          eq(schema.serviceProviders.isPrimary, true),
          isNull(schema.serviceProviders.deletedAt)
        )
      );
  }

  const [provider] = await db
    .insert(schema.serviceProviders)
    .values({
      name: input.name,
      type: input.type,
      service: input.service,
      enabled: input.enabled,
      isPrimary: input.isPrimary,
      priority: input.priority,
      credentials: encryptedCredentials,
      config: input.config || null,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  if (!provider) {
    throw new Error('Failed to create provider');
  }

  await audit.create(userId, 'service_provider', provider.id, { name: provider.name, type: provider.type, service: provider.service }, ip, requestId);

  logger.info({ providerId: provider.id, type: provider.type, service: provider.service }, 'Service provider created');

  return toPublicProvider(provider);
}

/**
 * Update a provider
 */
export async function updateProvider(
  id: string,
  input: UpdateProviderInput['body'],
  userId: string,
  ip?: string,
  requestId?: string
): Promise<PublicProvider> {
  const existing = await db
    .select()
    .from(schema.serviceProviders)
    .where(and(eq(schema.serviceProviders.id, id), isNull(schema.serviceProviders.deletedAt)))
    .limit(1)
    .then(rows => rows[0]);

  if (!existing) {
    throw new NotFoundError('Service provider');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedBy: userId,
  };

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.enabled !== undefined) {
    updateData.enabled = input.enabled;
  }

  if (input.priority !== undefined) {
    updateData.priority = input.priority;
  }

  if (input.config !== undefined) {
    updateData.config = input.config;
  }

  // Handle credentials update
  if (input.credentials !== undefined) {
    const validation = validateCredentials(existing.type, existing.service, input.credentials);
    if (!validation.valid) {
      throw new ValidationError(validation.errors?.join(', ') || 'Invalid credentials');
    }

    const encryptedCredentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.credentials)) {
      encryptedCredentials[key] = encrypt(value);
    }
    updateData.credentials = encryptedCredentials;
  }

  // Handle primary status change
  if (input.isPrimary !== undefined) {
    if (input.isPrimary && !existing.isPrimary) {
      // Unset other primary providers of same type
      await db
        .update(schema.serviceProviders)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.serviceProviders.type, existing.type),
            eq(schema.serviceProviders.isPrimary, true),
            isNull(schema.serviceProviders.deletedAt)
          )
        );
    }
    updateData.isPrimary = input.isPrimary;
  }

  const [updated] = await db
    .update(schema.serviceProviders)
    .set(updateData)
    .where(eq(schema.serviceProviders.id, id))
    .returning();

  if (!updated) {
    throw new Error('Failed to update provider');
  }

  await audit.update(userId, 'service_provider', id, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, ip, requestId);

  logger.info({ providerId: id }, 'Service provider updated');

  return toPublicProvider(updated);
}

/**
 * Delete a provider (soft delete)
 */
export async function deleteProvider(
  id: string,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<void> {
  const existing = await db
    .select()
    .from(schema.serviceProviders)
    .where(and(eq(schema.serviceProviders.id, id), isNull(schema.serviceProviders.deletedAt)))
    .limit(1)
    .then(rows => rows[0]);

  if (!existing) {
    throw new NotFoundError('Service provider');
  }

  await db
    .update(schema.serviceProviders)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(schema.serviceProviders.id, id));

  await audit.delete(userId, 'service_provider', id, { name: existing.name }, ip, requestId);

  logger.info({ providerId: id }, 'Service provider deleted');
}

/**
 * Test a provider's credentials
 */
export async function testProvider(id: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const provider = await getProviderWithCredentials(id);

  if (!provider) {
    throw new NotFoundError('Service provider');
  }

  const startTime = Date.now();

  try {
    switch (provider.service) {
      case 'anthropic': {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: provider.credentials.apiKey });
        await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        });
        break;
      }

      case 'openai': {
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: provider.credentials.apiKey });
        await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        });
        break;
      }

      case 'google_ai': {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(provider.credentials.apiKey!);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        await model.generateContent('Hi');
        break;
      }

      case 'livekit': {
        const { RoomServiceClient } = await import('livekit-server-sdk');
        const url = provider.credentials.url;
        const apiKey = provider.credentials.apiKey;
        const apiSecret = provider.credentials.apiSecret;
        if (!url || !apiKey || !apiSecret) {
          throw new Error('LiveKit credentials incomplete');
        }
        const client = new RoomServiceClient(url, apiKey, apiSecret);
        await client.listRooms();
        break;
      }

      default:
        return {
          success: true,
          message: `Provider ${provider.service} does not support connection testing`,
        };
    }

    const latencyMs = Date.now() - startTime;

    // Update last used timestamp
    await db
      .update(schema.serviceProviders)
      .set({
        lastUsedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.serviceProviders.id, id));

    return {
      success: true,
      message: 'Connection successful',
      latencyMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update error info
    await db
      .update(schema.serviceProviders)
      .set({
        lastError: errorMessage,
        lastErrorAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.serviceProviders.id, id));

    logger.error({ error, providerId: id }, 'Provider test failed');

    return {
      success: false,
      message: errorMessage,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Log provider usage
 */
export async function logProviderUsage(
  providerId: string,
  data: {
    sessionId?: string;
    projectId?: string;
    requestType: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    cost?: string;
    success: boolean;
    errorMessage?: string;
    model?: string;
  }
): Promise<void> {
  await db.insert(schema.providerUsageLogs).values({
    providerId,
    ...data,
  });

  // Update provider last used timestamp
  await db
    .update(schema.serviceProviders)
    .set({
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.serviceProviders.id, providerId));
}

/**
 * Get provider usage statistics
 */
export async function getProviderUsage(
  providerId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageLatencyMs: number;
  usageByDay: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  usageByModel: Array<{
    model: string;
    requests: number;
    tokens: number;
  }>;
}> {
  const conditions = [eq(schema.providerUsageLogs.providerId, providerId)];

  if (options.startDate) {
    conditions.push(sql`${schema.providerUsageLogs.createdAt} >= ${options.startDate}`);
  }
  if (options.endDate) {
    conditions.push(sql`${schema.providerUsageLogs.createdAt} <= ${options.endDate}`);
  }

  const logs = await db
    .select()
    .from(schema.providerUsageLogs)
    .where(and(...conditions))
    .orderBy(desc(schema.providerUsageLogs.createdAt));

  const totalRequests = logs.length;
  const successfulRequests = logs.filter(l => l.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const totalInputTokens = logs.reduce((sum, l) => sum + (l.inputTokens || 0), 0);
  const totalOutputTokens = logs.reduce((sum, l) => sum + (l.outputTokens || 0), 0);
  const totalCost = logs.reduce((sum, l) => sum + parseFloat(l.cost || '0'), 0);
  const totalLatency = logs.reduce((sum, l) => sum + (l.durationMs || 0), 0);
  const averageLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

  // Group by day
  const byDay = logs.reduce((acc, log) => {
    const date = log.createdAt.toISOString().split('T')[0]!;
    if (!acc[date]) {
      acc[date] = { requests: 0, tokens: 0, cost: 0 };
    }
    acc[date].requests++;
    acc[date].tokens += (log.inputTokens || 0) + (log.outputTokens || 0);
    acc[date].cost += parseFloat(log.cost || '0');
    return acc;
  }, {} as Record<string, { requests: number; tokens: number; cost: number }>);

  const usageByDay = Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group by model
  const byModel = logs.reduce((acc, log) => {
    const model = log.model || 'unknown';
    if (!acc[model]) {
      acc[model] = { requests: 0, tokens: 0 };
    }
    acc[model].requests++;
    acc[model].tokens += (log.inputTokens || 0) + (log.outputTokens || 0);
    return acc;
  }, {} as Record<string, { requests: number; tokens: number }>);

  const usageByModel = Object.entries(byModel)
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.requests - a.requests);

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    averageLatencyMs,
    usageByDay,
    usageByModel,
  };
}

/**
 * Rotate provider API key
 */
export async function rotateProviderKey(
  id: string,
  newCredentials: Record<string, string>,
  userId: string,
  ip?: string,
  requestId?: string
): Promise<PublicProvider> {
  const existing = await db
    .select()
    .from(schema.serviceProviders)
    .where(and(eq(schema.serviceProviders.id, id), isNull(schema.serviceProviders.deletedAt)))
    .limit(1)
    .then(rows => rows[0]);

  if (!existing) {
    throw new NotFoundError('Service provider');
  }

  // Validate new credentials
  const validation = validateCredentials(existing.type, existing.service, newCredentials);
  if (!validation.valid) {
    throw new ValidationError(validation.errors?.join(', ') || 'Invalid credentials');
  }

  // Encrypt new credentials
  const encryptedCredentials: Record<string, string> = {};
  for (const [key, value] of Object.entries(newCredentials)) {
    encryptedCredentials[key] = encrypt(value);
  }

  const [updated] = await db
    .update(schema.serviceProviders)
    .set({
      credentials: encryptedCredentials,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(schema.serviceProviders.id, id))
    .returning();

  if (!updated) {
    throw new Error('Failed to rotate provider key');
  }

  await audit.update(
    userId,
    'service_provider',
    id,
    { action: 'key_rotation', oldCredentials: '[REDACTED]' },
    { action: 'key_rotation', newCredentials: '[REDACTED]' },
    ip,
    requestId
  );

  logger.info({ providerId: id }, 'Provider API key rotated');

  return toPublicProvider(updated);
}

/**
 * Get aggregated usage for all providers
 */
export async function getAllProvidersUsage(
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<Array<{
  providerId: string;
  providerName: string;
  type: string;
  service: string;
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalCost: number;
}>> {
  const conditions = [isNull(schema.serviceProviders.deletedAt)];

  const providers = await db
    .select()
    .from(schema.serviceProviders)
    .where(and(...conditions));

  const usagePromises = providers.map(async (provider) => {
    const usage = await getProviderUsage(provider.id, options);
    return {
      providerId: provider.id,
      providerName: provider.name,
      type: provider.type,
      service: provider.service,
      totalRequests: usage.totalRequests,
      successfulRequests: usage.successfulRequests,
      totalTokens: usage.totalInputTokens + usage.totalOutputTokens,
      totalCost: usage.totalCost,
    };
  });

  return Promise.all(usagePromises);
}
