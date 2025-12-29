import argon2 from 'argon2';
import { z } from 'zod';

// Password policy
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine(
    (p) => /[A-Z]/.test(p),
    'Password must contain an uppercase letter'
  )
  .refine(
    (p) => /[a-z]/.test(p),
    'Password must contain a lowercase letter'
  )
  .refine(
    (p) => /[0-9]/.test(p),
    'Password must contain a number'
  );

// Argon2id with recommended parameters
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
