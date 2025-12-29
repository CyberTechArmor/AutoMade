import { db, schema } from '../../db/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
} from '../../lib/jwt.js';
import { audit } from '../../lib/audit.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../../lib/errors.js';
import type { LoginInput, RegisterInput, ChangePasswordInput } from './auth.schemas.js';

interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export async function login(
  input: LoginInput,
  ip: string,
  userAgent: string,
  requestId?: string
): Promise<AuthResult> {
  // Find user by email
  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.email, input.email.toLowerCase()),
        isNull(schema.users.deletedAt)
      )
    )
    .limit(1);

  if (!user) {
    await audit.login('unknown', ip, userAgent, false, requestId);
    throw new AuthenticationError('Invalid email or password');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit.login(user.id, ip, userAgent, false, requestId);
    throw new AuthenticationError('Account is temporarily locked. Please try again later.');
  }

  // Verify password
  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    // Increment failed login attempts
    const attempts = parseInt(user.failedLoginAttempts, 10) + 1;
    const updates: Partial<typeof user> = {
      failedLoginAttempts: attempts.toString(),
    };

    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, user.id));

    await audit.login(user.id, ip, userAgent, false, requestId);
    throw new AuthenticationError('Invalid email or password');
  }

  // Reset failed attempts and update last login
  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: '0',
      lockedUntil: null,
      lastLoginAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { token: refreshToken } = await generateRefreshToken(
    user.id,
    userAgent,
    ip
  );

  await audit.login(user.id, ip, userAgent, true, requestId);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function register(
  input: RegisterInput,
  ip: string,
  userAgent: string,
  requestId?: string
): Promise<AuthResult> {
  // Check if email already exists
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, input.email.toLowerCase()))
    .limit(1);

  if (existing) {
    throw new ConflictError('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const [user] = await db
    .insert(schema.users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash,
      displayName: input.displayName,
      role: 'client', // New users are clients by default
    })
    .returning();

  if (!user) {
    throw new Error('Failed to create user');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { token: refreshToken } = await generateRefreshToken(
    user.id,
    userAgent,
    ip
  );

  await audit.create(user.id, 'user', user.id, { email: user.email }, ip, requestId);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(
  refreshToken: string,
  ip: string,
  userAgent: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  return rotateRefreshToken(refreshToken, userAgent, ip);
}

export async function logout(
  userId: string,
  ip: string,
  requestId?: string
): Promise<void> {
  await revokeAllUserTokens(userId);
  await audit.logout(userId, ip, requestId);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  ip: string,
  requestId?: string
): Promise<void> {
  // Get user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const isValid = await verifyPassword(input.currentPassword, user.passwordHash);

  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await hashPassword(input.newPassword);

  // Update password
  await db
    .update(schema.users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  // Revoke all refresh tokens (force re-login on other devices)
  await revokeAllUserTokens(userId);

  await audit.update(userId, 'user', userId, {}, { passwordChanged: true }, ip, requestId);
}
