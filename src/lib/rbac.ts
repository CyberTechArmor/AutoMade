import type { RequestHandler } from 'express';
import { ForbiddenError } from './errors.js';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CLIENT: 'client',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Permission definitions
export const PERMISSIONS = {
  // User management
  'users:create': [ROLES.ADMIN],
  'users:read': [ROLES.ADMIN, ROLES.MANAGER],
  'users:read:own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
  'users:update': [ROLES.ADMIN],
  'users:update:own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
  'users:delete': [ROLES.ADMIN],

  // Client management
  'clients:create': [ROLES.ADMIN, ROLES.MANAGER],
  'clients:read': [ROLES.ADMIN, ROLES.MANAGER],
  'clients:read:own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
  'clients:update': [ROLES.ADMIN, ROLES.MANAGER],
  'clients:delete': [ROLES.ADMIN],

  // Project management
  'projects:create': [ROLES.ADMIN, ROLES.MANAGER],
  'projects:read': [ROLES.ADMIN, ROLES.MANAGER],
  'projects:read:own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
  'projects:update': [ROLES.ADMIN, ROLES.MANAGER],
  'projects:delete': [ROLES.ADMIN],

  // Session management
  'sessions:create': [ROLES.ADMIN, ROLES.MANAGER],
  'sessions:read': [ROLES.ADMIN, ROLES.MANAGER],
  'sessions:read:own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
  'sessions:update': [ROLES.ADMIN, ROLES.MANAGER],
  'sessions:delete': [ROLES.ADMIN],
  'sessions:facilitate': [ROLES.ADMIN, ROLES.MANAGER],

  // Document management
  'documents:create': [ROLES.ADMIN, ROLES.MANAGER],
  'documents:read': [ROLES.ADMIN, ROLES.MANAGER],
  'documents:read:published': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
  'documents:update': [ROLES.ADMIN, ROLES.MANAGER],
  'documents:delete': [ROLES.ADMIN],
  'documents:publish': [ROLES.ADMIN, ROLES.MANAGER],

  // Tracking
  'tracking:create': [ROLES.ADMIN, ROLES.MANAGER],
  'tracking:read': [ROLES.ADMIN, ROLES.MANAGER],
  'tracking:read:own': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
  'tracking:update': [ROLES.ADMIN, ROLES.MANAGER],
  'tracking:delete': [ROLES.ADMIN],

  // Learnings
  'learnings:create': [ROLES.ADMIN, ROLES.MANAGER],
  'learnings:read': [ROLES.ADMIN, ROLES.MANAGER],
  'learnings:update': [ROLES.ADMIN, ROLES.MANAGER],
  'learnings:delete': [ROLES.ADMIN],

  // Audit logs
  'audit:read': [ROLES.ADMIN],

  // System settings
  'settings:read': [ROLES.ADMIN, ROLES.MANAGER],
  'settings:update': [ROLES.ADMIN],

  // Milestones
  'milestones:create': [ROLES.ADMIN, ROLES.MANAGER],
  'milestones:read': [ROLES.ADMIN, ROLES.MANAGER],
  'milestones:update': [ROLES.ADMIN, ROLES.MANAGER],
  'milestones:delete': [ROLES.ADMIN],

  // Metrics and time tracking
  'metrics:create': [ROLES.ADMIN, ROLES.MANAGER],
  'metrics:read': [ROLES.ADMIN, ROLES.MANAGER],
  'metrics:update': [ROLES.ADMIN, ROLES.MANAGER],
  'metrics:delete': [ROLES.ADMIN],

  // Recordings
  'recordings:create': [ROLES.ADMIN, ROLES.MANAGER],
  'recordings:read': [ROLES.ADMIN, ROLES.MANAGER],
  'recordings:delete': [ROLES.ADMIN],

  // Calendar
  'calendar:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],

  // Search
  'search:read': [ROLES.ADMIN, ROLES.MANAGER, ROLES.CLIENT],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  // Super admin always has permission
  if (role === ROLES.SUPER_ADMIN) {
    return true;
  }
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles?.includes(role as never) ?? false;
}

export function requiresOwnership(permission: Permission): boolean {
  return permission.endsWith(':own') || permission.endsWith(':published');
}

export function getBasePermission(permission: Permission): string {
  return permission.replace(/:own$/, '').replace(/:published$/, '');
}

/**
 * Middleware to require specific roles
 */
export function requireRole(allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;

    if (!user) {
      throw new ForbiddenError('Authentication required');
    }

    // Super admin always has access
    if (user.role === ROLES.SUPER_ADMIN) {
      next();
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`This action requires one of: ${allowedRoles.join(', ')}`);
    }

    next();
  };
}
