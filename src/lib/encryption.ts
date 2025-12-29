import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from config or derive from secret
 */
function getKey(): Buffer {
  const keySource = config.encryption.key || config.jwt.secret;

  if (!keySource) {
    throw new Error('No encryption key configured. Set ENCRYPTION_KEY or JWT_SECRET.');
  }

  // If it looks like a hex string of correct length, use directly
  if (/^[a-f0-9]{64}$/i.test(keySource)) {
    return Buffer.from(keySource, 'hex');
  }

  // Otherwise derive a key using scrypt
  const salt = Buffer.from('automade-encryption-salt-v1');
  return scryptSync(keySource, salt, 32);
}

/**
 * Encrypt a string value
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine: iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypt a string value
 * Input: base64(iv + authTag + ciphertext)
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, 'base64');

  // Extract parts
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt an object (JSON stringified)
 */
export function encryptObject(obj: unknown): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt an object
 */
export function decryptObject<T = unknown>(ciphertext: string): T {
  const json = decrypt(ciphertext);
  return JSON.parse(json) as T;
}

/**
 * Check if a string is encrypted (basic heuristic)
 */
export function isEncrypted(value: string): boolean {
  // Encrypted values are base64 and at least 32 bytes (iv + authTag)
  if (value.length < 44) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}
