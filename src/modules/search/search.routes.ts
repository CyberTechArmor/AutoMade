import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import { requireRole, ROLES } from '../../lib/rbac.js';
import { searchSchema, reindexSchema } from './search.schemas.js';
import * as searchService from './search.service.js';

const router = Router();

/**
 * GET /search
 * Global search across all resources
 */
router.get(
  '/',
  authenticate,
  authorize('search:read'),
  validate(searchSchema),
  async (req, res, next) => {
    try {
      const types = req.query.types
        ? (req.query.types as string).split(',').map((t) => t.trim())
        : undefined;

      const result = await searchService.search({
        query: req.query.q as string,
        types,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /search/reindex
 * Rebuild search index (admin only)
 */
router.post(
  '/reindex',
  authenticate,
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  validate(reindexSchema),
  async (req, res, next) => {
    try {
      const result = await searchService.rebuildIndex(req.body.types);

      res.json({
        message: 'Search index rebuilt successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
