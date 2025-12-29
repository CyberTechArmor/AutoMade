import { Router } from 'express';
import { validate, authenticate } from '../../middleware/index.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './auth.schemas.js';
import * as authService from './auth.service.js';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user and receive tokens
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(
      req.body,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
      req.requestId
    );

    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(
      req.body,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
      req.requestId
    );

    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Refresh token is required',
      });
    }

    const result = await authService.refresh(
      refreshToken,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown'
    );

    if (!result) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Invalid or expired refresh token',
      });
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 * Logout and invalidate all tokens
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(
      req.user!.id,
      req.ip ?? 'unknown',
      req.requestId
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      await authService.changePassword(
        req.user!.id,
        req.body,
        req.ip ?? 'unknown',
        req.requestId
      );

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { db, schema } = await import('../../db/index.js');
    const { eq } = await import('drizzle-orm');

    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        role: schema.users.role,
        mfaEnabled: schema.users.mfaEnabled,
        timezone: schema.users.timezone,
        avatarUrl: schema.users.avatarUrl,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, req.user!.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
