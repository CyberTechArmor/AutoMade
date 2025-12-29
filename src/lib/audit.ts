import crypto from 'crypto';
import { db, schema } from '../db/index.js';
import type { auditActionEnum } from '../db/schema/enums.js';

type AuditAction = typeof auditActionEnum.enumValues[number];

interface AuditEvent {
  actorId?: string;
  actorType: 'user' | 'system' | 'api_key';
  actorIp?: string;
  actorUserAgent?: string;
  sessionId?: string;
  action: AuditAction;
  outcome: 'success' | 'failure' | 'denied';
  resourceType?: string;
  resourceId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestMethod?: string;
  requestPath?: string;
  requestId?: string;
}

let lastHash: string | null = null;

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const timestamp = new Date();

  // Create hash chain for tamper evidence
  const content = JSON.stringify({
    ...event,
    timestamp: timestamp.toISOString(),
    previousHash: lastHash,
  });

  const hash = crypto.createHash('sha256').update(content).digest('hex');

  await db.insert(schema.auditLogs).values({
    ...event,
    timestamp,
    previousHash: lastHash,
    hash,
  });

  lastHash = hash;
}

// Convenience methods for common audit events
export const audit = {
  login: (userId: string, ip: string, userAgent: string, success: boolean, requestId?: string) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      actorUserAgent: userAgent,
      action: success ? 'login' : 'login_failed',
      outcome: success ? 'success' : 'failure',
      requestId,
    }),

  logout: (userId: string, ip: string, requestId?: string) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'logout',
      outcome: 'success',
      requestId,
    }),

  accessDenied: (userId: string, resourceType: string, resourceId: string, ip: string, requestId?: string) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'access_denied',
      outcome: 'denied',
      resourceType,
      resourceId,
      requestId,
    }),

  create: (
    userId: string,
    resourceType: string,
    resourceId: string,
    data: Record<string, unknown>,
    ip?: string,
    requestId?: string
  ) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'create',
      outcome: 'success',
      resourceType,
      resourceId,
      afterState: data,
      requestId,
    }),

  read: (
    userId: string,
    resourceType: string,
    resourceId: string,
    ip?: string,
    requestId?: string
  ) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'read',
      outcome: 'success',
      resourceType,
      resourceId,
      requestId,
    }),

  update: (
    userId: string,
    resourceType: string,
    resourceId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    ip?: string,
    requestId?: string
  ) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'update',
      outcome: 'success',
      resourceType,
      resourceId,
      beforeState: before,
      afterState: after,
      requestId,
    }),

  delete: (
    userId: string,
    resourceType: string,
    resourceId: string,
    before: Record<string, unknown>,
    ip?: string,
    requestId?: string
  ) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'delete',
      outcome: 'success',
      resourceType,
      resourceId,
      beforeState: before,
      requestId,
    }),

  export: (
    userId: string,
    resourceType: string,
    scope: Record<string, unknown>,
    ip?: string,
    requestId?: string
  ) =>
    logAuditEvent({
      actorId: userId,
      actorType: 'user',
      actorIp: ip,
      action: 'export',
      outcome: 'success',
      resourceType,
      metadata: scope,
      requestId,
    }),
};
