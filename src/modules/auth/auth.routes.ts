import { Router } from 'express';
import { validate, authenticate } from '../../middleware/index.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  mfaVerifySchema,
  mfaSetupSchema,
  backupCodeSchema,
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

    // Check if MFA is required
    if ('mfaRequired' in result && result.mfaRequired) {
      res.json({
        mfaRequired: true,
        mfaToken: result.mfaToken,
        user: result.user,
      });
      return;
    }

    // Type assertion: if not MFA required, must be AuthResult
    const authResult = result as { user: { id: string; email: string; displayName: string; role: string }; accessToken: string; refreshToken: string };
    res.json({
      user: authResult.user,
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
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
      res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Refresh token is required',
      });
      return;
    }

    const result = await authService.refresh(
      refreshToken,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown'
    );

    if (!result) {
      res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Invalid or expired refresh token',
      });
      return;
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
      res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/mfa/verify
 * Verify TOTP code during login
 */
router.post('/mfa/verify', validate(mfaVerifySchema), async (req, res, next) => {
  try {
    const result = await authService.verifyMfa(
      req.body,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
      req.requestId
    );

    res.json({
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
 * POST /auth/mfa/backup
 * Use backup code during login
 */
router.post('/mfa/backup', validate(backupCodeSchema), async (req, res, next) => {
  try {
    const result = await authService.verifyBackupCode(
      req.body,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
      req.requestId
    );

    res.json({
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
 * POST /auth/mfa/setup
 * Begin MFA setup (requires authentication)
 */
router.post('/mfa/setup', authenticate, async (req, res, next) => {
  try {
    const result = await authService.beginMfaSetup(req.user!.id);

    res.json({
      secret: result.secret,
      qrCode: result.qrCode,
      uri: result.uri,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/mfa/setup/complete
 * Complete MFA setup by verifying code
 */
router.post(
  '/mfa/setup/complete',
  authenticate,
  validate(mfaSetupSchema),
  async (req, res, next) => {
    try {
      const result = await authService.completeMfaSetup(
        req.user!.id,
        req.body.code,
        req.ip ?? 'unknown',
        req.requestId
      );

      res.json({
        enabled: result.enabled,
        backupCodes: result.backupCodes,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/mfa/disable
 * Disable MFA (requires password confirmation)
 */
router.post('/mfa/disable', authenticate, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Password is required to disable MFA',
      });
      return;
    }

    await authService.disableMfa(
      req.user!.id,
      password,
      req.ip ?? 'unknown',
      req.requestId
    );

    res.json({ message: 'MFA disabled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
