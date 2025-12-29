import { z } from 'zod';
import { passwordSchema } from '../../lib/password.js';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    displayName: z.string().min(1).max(100),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];

// MFA verification schema (used after password authentication)
export const mfaVerifySchema = z.object({
  body: z.object({
    mfaToken: z.string().min(1, 'MFA token is required'),
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
  }),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>['body'];

// MFA setup schema (for enabling MFA on existing account)
export const mfaSetupSchema = z.object({
  body: z.object({
    code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
  }),
});

export type MfaSetupInput = z.infer<typeof mfaSetupSchema>['body'];

// Backup code verification schema
export const backupCodeSchema = z.object({
  body: z.object({
    mfaToken: z.string().min(1, 'MFA token is required'),
    backupCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid backup code format'),
  }),
});

export type BackupCodeInput = z.infer<typeof backupCodeSchema>['body'];
