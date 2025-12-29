import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { AuthenticationError, ForbiddenError } from '../lib/errors.js';
import { hasPermission, type Permission, type Role } from '../lib/rbac.js';
import { audit } from '../lib/audit.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
      requestId?: string;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    throw new AuthenticationError('Invalid or expired token');
  }

  req.user = {
    id: decoded.userId,
    role: decoded.role as Role,
  };

  next();
};

export function authorize(permission: Permission): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!hasPermission(user.role, permission)) {
      // Log authorization failure for audit
      void audit.accessDenied(
        user.id,
        permission.split(':')[0] ?? 'unknown',
        'permission_check',
        req.ip ?? 'unknown',
        req.requestId
      );

      throw new ForbiddenError(`Insufficient permissions for ${permission}`);
    }

    next();
  };
}

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyAccessToken(token);

    if (decoded) {
      req.user = {
        id: decoded.userId,
        role: decoded.role as Role,
      };
    }
  }

  next();
};
