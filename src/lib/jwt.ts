import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { config } from '../config/index.js';
import { db, schema } from '../db/index.js';
import { eq, and, isNull, lt } from 'drizzle-orm';

interface TokenPayload {
  userId: string;
  role: string;
}

interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
  iss: string;
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

  const value = parseInt(match[1] ?? '0', 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Invalid expiry unit: ${unit}`);
  }
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry,
    issuer: config.jwt.issuer,
  });
}

export function verifyAccessToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
    }) as DecodedToken;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function generateRefreshToken(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ token: string; family: string }> {
  const token = randomBytes(32).toString('hex');
  const family = crypto.randomUUID();
  const expiresInSeconds = parseExpiry(config.jwt.refreshExpiry);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await db.insert(schema.refreshTokens).values({
    userId,
    tokenHash: hashToken(token),
    family,
    expiresAt,
    userAgent,
    ipAddress,
  });

  return { token, family };
}

export async function rotateRefreshToken(
  oldToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: string;
} | null> {
  const tokenHash = hashToken(oldToken);

  // Find the token
  const [existing] = await db
    .select()
    .from(schema.refreshTokens)
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!existing) {
    return null;
  }

  // Check if token is expired or revoked
  if (existing.revoked || existing.expiresAt < new Date()) {
    // Token reuse detected - revoke the whole family
    if (existing.revoked) {
      await db
        .update(schema.refreshTokens)
        .set({ revoked: true, revokedAt: new Date() })
        .where(eq(schema.refreshTokens.family, existing.family));
    }
    return null;
  }

  // Revoke old token
  await db
    .update(schema.refreshTokens)
    .set({ revoked: true, revokedAt: new Date() })
    .where(eq(schema.refreshTokens.id, existing.id));

  // Get user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, existing.userId),
        isNull(schema.users.deletedAt)
      )
    )
    .limit(1);

  if (!user) {
    return null;
  }

  // Generate new tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const newToken = randomBytes(32).toString('hex');
  const expiresInSeconds = parseExpiry(config.jwt.refreshExpiry);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(newToken),
    family: existing.family, // Keep same family for rotation tracking
    expiresAt,
    userAgent,
    ipAddress,
  });

  return {
    accessToken,
    refreshToken: newToken,
    userId: user.id,
    role: user.role,
  };
}

export async function revokeRefreshTokenFamily(family: string): Promise<void> {
  await db
    .update(schema.refreshTokens)
    .set({ revoked: true, revokedAt: new Date() })
    .where(eq(schema.refreshTokens.family, family));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(schema.refreshTokens)
    .set({ revoked: true, revokedAt: new Date() })
    .where(eq(schema.refreshTokens.userId, userId));
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db
    .delete(schema.refreshTokens)
    .where(lt(schema.refreshTokens.expiresAt, new Date()))
    .returning();

  return result.length;
}
