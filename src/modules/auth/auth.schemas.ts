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
