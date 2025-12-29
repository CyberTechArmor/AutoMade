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
import {
  verifyCode as verifyTOTPCode,
  generateSetupData,
  generateBackupCodes,
} from '../../lib/totp.js';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
  MfaVerifyInput,
  BackupCodeInput,
} from './auth.schemas.js';

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

interface MfaRequiredResult {
  mfaRequired: true;
  mfaToken: string;
  user: {
    id: string;
    email: string;
  };
}

type LoginResult = AuthResult | MfaRequiredResult;

// Short-lived MFA token for verification step
const MFA_TOKEN_EXPIRY = '5m';

function generateMfaToken(userId: string): string {
  return jwt.sign(
    { userId, purpose: 'mfa' },
    config.jwt.secret,
    { expiresIn: MFA_TOKEN_EXPIRY }
  );
}

function verifyMfaToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; purpose: string };
    if (decoded.purpose !== 'mfa') {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

/**
 * Login with email and password
 * If MFA is enabled, returns mfaRequired: true with a temporary token
 * Otherwise, returns full auth tokens
 */
export async function login(
  input: LoginInput,
  ip: string,
  userAgent: string,
  requestId?: string
): Promise<LoginResult> {
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

  // Check if MFA is enabled
  if (user.mfaEnabled && user.mfaSecret) {
    // Return MFA required response with temporary token
    const mfaToken = generateMfaToken(user.id);

    return {
      mfaRequired: true,
      mfaToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  // No MFA - complete login
  return completeLogin(user, ip, userAgent, requestId);
}

/**
 * Complete login after successful password verification
 * Used internally after password-only or MFA verification
 */
async function completeLogin(
  user: typeof schema.users.$inferSelect,
  ip: string,
  userAgent: string,
  requestId?: string
): Promise<AuthResult> {
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

/**
 * Verify MFA code and complete login
 */
export async function verifyMfa(
  input: MfaVerifyInput,
  ip: string,
  userAgent: string,
  requestId?: string
): Promise<AuthResult> {
  // Verify MFA token
  const tokenData = verifyMfaToken(input.mfaToken);

  if (!tokenData) {
    throw new AuthenticationError('Invalid or expired MFA token');
  }

  // Get user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, tokenData.userId))
    .limit(1);

  if (!user || !user.mfaSecret) {
    throw new AuthenticationError('Invalid user or MFA not configured');
  }

  // Verify TOTP code
  const isValid = verifyTOTPCode(user.mfaSecret, input.code);

  if (!isValid) {
    await audit.login(user.id, ip, userAgent, false, requestId);
    throw new AuthenticationError('Invalid MFA code');
  }

  return completeLogin(user, ip, userAgent, requestId);
}

/**
 * Verify backup code and complete login
 */
export async function verifyBackupCode(
  input: BackupCodeInput,
  ip: string,
  userAgent: string,
  requestId?: string
): Promise<AuthResult> {
  // Verify MFA token
  const tokenData = verifyMfaToken(input.mfaToken);

  if (!tokenData) {
    throw new AuthenticationError('Invalid or expired MFA token');
  }

  // Get user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, tokenData.userId))
    .limit(1);

  if (!user || !user.mfaBackupCodes) {
    throw new AuthenticationError('Invalid user or no backup codes');
  }

  // Hash the provided backup code
  const codeHash = createHash('sha256').update(input.backupCode).digest('hex');

  // Check if code exists
  const codeIndex = user.mfaBackupCodes.indexOf(codeHash);

  if (codeIndex === -1) {
    await audit.login(user.id, ip, userAgent, false, requestId);
    throw new AuthenticationError('Invalid backup code');
  }

  // Remove used backup code
  const remainingCodes = [...user.mfaBackupCodes];
  remainingCodes.splice(codeIndex, 1);

  await db
    .update(schema.users)
    .set({
      mfaBackupCodes: remainingCodes,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  return completeLogin(user, ip, userAgent, requestId);
}

/**
 * Register a new user
 */
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

/**
 * Refresh access token
 */
export async function refresh(
  refreshToken: string,
  ip: string,
  userAgent: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  return rotateRefreshToken(refreshToken, userAgent, ip);
}

/**
 * Logout user (revoke all tokens)
 */
export async function logout(
  userId: string,
  ip: string,
  requestId?: string
): Promise<void> {
  await revokeAllUserTokens(userId);
  await audit.logout(userId, ip, requestId);
}

/**
 * Change password
 */
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

/**
 * Begin MFA setup - generates secret and QR code
 */
export async function beginMfaSetup(userId: string): Promise<{
  secret: string;
  qrCode: string;
  uri: string;
}> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User');
  }

  // Generate new secret
  const setupData = await generateSetupData(user.email);

  // Store secret temporarily (not enabled yet)
  await db
    .update(schema.users)
    .set({
      mfaSecret: setupData.secret,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  return {
    secret: setupData.secret,
    qrCode: setupData.qrCode,
    uri: setupData.uri,
  };
}

/**
 * Complete MFA setup - verify code and enable MFA
 */
export async function completeMfaSetup(
  userId: string,
  code: string,
  ip: string,
  requestId?: string
): Promise<{
  enabled: boolean;
  backupCodes: string[];
}> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user || !user.mfaSecret) {
    throw new Error('MFA setup not started');
  }

  // Verify the code
  const isValid = verifyTOTPCode(user.mfaSecret, code);

  if (!isValid) {
    throw new AuthenticationError('Invalid verification code');
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);
  const hashedBackupCodes = backupCodes.map(c =>
    createHash('sha256').update(c).digest('hex')
  );

  // Enable MFA
  await db
    .update(schema.users)
    .set({
      mfaEnabled: true,
      mfaBackupCodes: hashedBackupCodes,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  await audit.update(userId, 'user', userId, {}, { mfaEnabled: true }, ip, requestId);

  return {
    enabled: true,
    backupCodes,
  };
}

/**
 * Disable MFA
 */
export async function disableMfa(
  userId: string,
  password: string,
  ip: string,
  requestId?: string
): Promise<void> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    throw new AuthenticationError('Invalid password');
  }

  // Disable MFA
  await db
    .update(schema.users)
    .set({
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  await audit.update(userId, 'user', userId, {}, { mfaDisabled: true }, ip, requestId);
}

/**
 * Get current user profile
 */
export async function getCurrentUser(userId: string): Promise<{
  id: string;
  email: string;
  displayName: string;
  role: string;
  mfaEnabled: boolean;
  timezone: string;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
} | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}
