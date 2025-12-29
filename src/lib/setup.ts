import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from './password.js';
import { generateSecret, generatePassword, generateBackupCodes, generateQRCode } from './totp.js';
import { logger } from './logger.js';
import { createHash } from 'node:crypto';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

const SETUP_FILE = '/data/automade/.setup-complete';
const CONFIG_FILE = '/data/automade/config.json';

export interface SetupConfig {
  domain: string;
  adminEmail: string;
  letsEncryptEmail?: string;
  completedAt?: string;
}

export interface SetupResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  credentials: {
    password: string;
    totpSecret: string;
    totpQRCode: string;
    backupCodes: string[];
  };
  config: SetupConfig;
}

/**
 * Check if the system has been set up
 */
export async function isSetupComplete(): Promise<boolean> {
  return existsSync(SETUP_FILE);
}

/**
 * Get the setup configuration
 */
export async function getSetupConfig(): Promise<SetupConfig | null> {
  if (!existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as SetupConfig;
  } catch {
    return null;
  }
}

/**
 * Initialize the system with a super admin user
 * This is called during first-time setup via the upstall script
 */
export async function initializeSystem(config: {
  domain: string;
  adminEmail: string;
}): Promise<SetupResult> {
  // Check if already set up
  if (await isSetupComplete()) {
    throw new Error('System is already set up. Use the update function instead.');
  }

  const { domain, adminEmail } = config;

  // Validate inputs
  if (!domain || !adminEmail) {
    throw new Error('Domain and admin email are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(adminEmail)) {
    throw new Error('Invalid email format');
  }

  // Generate credentials
  const password = generatePassword(20);
  const totpSecret = generateSecret();
  const backupCodes = generateBackupCodes(10);
  const totpQRCode = await generateQRCode(totpSecret, adminEmail);

  // Hash password
  const passwordHash = await hashPassword(password);

  // Hash backup codes for storage
  const hashedBackupCodes = backupCodes.map(code =>
    createHash('sha256').update(code).digest('hex')
  );

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail.toLowerCase()))
    .limit(1);

  let user;

  if (existingUser) {
    // Update existing user to super_admin
    [user] = await db
      .update(schema.users)
      .set({
        passwordHash,
        role: 'super_admin',
        mfaSecret: totpSecret,
        mfaEnabled: true,
        mfaBackupCodes: hashedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existingUser.id))
      .returning();
  } else {
    // Create new super admin user
    [user] = await db
      .insert(schema.users)
      .values({
        email: adminEmail.toLowerCase(),
        passwordHash,
        displayName: 'Super Admin',
        role: 'super_admin',
        mfaSecret: totpSecret,
        mfaEnabled: true,
        mfaBackupCodes: hashedBackupCodes,
      })
      .returning();
  }

  if (!user) {
    throw new Error('Failed to create super admin user');
  }

  // Save configuration
  const setupConfig: SetupConfig = {
    domain,
    adminEmail: adminEmail.toLowerCase(),
    letsEncryptEmail: adminEmail.toLowerCase(),
    completedAt: new Date().toISOString(),
  };

  // Ensure directory exists
  const configDir = dirname(CONFIG_FILE);
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  await writeFile(CONFIG_FILE, JSON.stringify(setupConfig, null, 2));

  // Mark setup as complete
  const setupDir = dirname(SETUP_FILE);
  if (!existsSync(setupDir)) {
    await mkdir(setupDir, { recursive: true });
  }
  await writeFile(SETUP_FILE, new Date().toISOString());

  logger.info({ email: user.email }, 'System initialized with super admin user');

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    credentials: {
      password,
      totpSecret,
      totpQRCode,
      backupCodes,
    },
    config: setupConfig,
  };
}

/**
 * Generate new credentials for a user (admin function)
 */
export async function regenerateCredentials(userId: string): Promise<{
  password: string;
  totpSecret: string;
  totpQRCode: string;
  backupCodes: string[];
}> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Generate new credentials
  const password = generatePassword(20);
  const totpSecret = generateSecret();
  const backupCodes = generateBackupCodes(10);
  const totpQRCode = await generateQRCode(totpSecret, user.email);

  // Hash password
  const passwordHash = await hashPassword(password);

  // Hash backup codes for storage
  const hashedBackupCodes = backupCodes.map(code =>
    createHash('sha256').update(code).digest('hex')
  );

  // Update user
  await db
    .update(schema.users)
    .set({
      passwordHash,
      mfaSecret: totpSecret,
      mfaEnabled: true,
      mfaBackupCodes: hashedBackupCodes,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  logger.info({ userId }, 'Credentials regenerated for user');

  return {
    password,
    totpSecret,
    totpQRCode,
    backupCodes,
  };
}

/**
 * Get system status
 */
export async function getSystemStatus(): Promise<{
  isSetup: boolean;
  config: SetupConfig | null;
  userCount: number;
  version: string;
}> {
  const isSetup = await isSetupComplete();
  const config = await getSetupConfig();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);

  const userCount = result[0]?.count ?? 0;

  return {
    isSetup,
    config,
    userCount: Number(userCount),
    version: process.env.npm_package_version || '0.1.0',
  };
}
