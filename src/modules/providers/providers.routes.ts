import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireRole } from '../../lib/rbac.js';
import * as providerService from './providers.service.js';
import {
  createProviderSchema,
  updateProviderSchema,
  getProviderSchema,
  listProvidersSchema,
  testProviderSchema,
  deleteProviderSchema,
} from './providers.schemas.js';

const router = Router();

// All provider routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['admin', 'super_admin']));

/**
 * GET /api/providers
 * List all service providers
 */
router.get(
  '/',
  validate(listProvidersSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await providerService.listProviders({
        type: req.query.type as string | undefined,
        service: req.query.service as string | undefined,
        enabled: req.query.enabled as 'true' | 'false' | undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/providers/:id
 * Get a specific provider
 */
router.get(
  '/:id',
  validate(getProviderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await providerService.getProviderById(req.params.id);

      if (!provider) {
        res.status(404).json({ error: 'Provider not found' });
        return;
      }

      res.json(provider);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/providers
 * Create a new service provider
 */
router.post(
  '/',
  validate(createProviderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await providerService.createProvider(
        req.body,
        req.user!.userId,
        req.ip,
        req.requestId
      );

      res.status(201).json(provider);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/providers/:id
 * Update a service provider
 */
router.patch(
  '/:id',
  validate(updateProviderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await providerService.updateProvider(
        req.params.id,
        req.body,
        req.user!.userId,
        req.ip,
        req.requestId
      );

      res.json(provider);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/providers/:id
 * Delete a service provider
 */
router.delete(
  '/:id',
  validate(deleteProviderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await providerService.deleteProvider(
        req.params.id,
        req.user!.userId,
        req.ip,
        req.requestId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/providers/:id/test
 * Test a provider's connection/credentials
 */
router.post(
  '/:id/test',
  validate(testProviderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await providerService.testProvider(req.params.id);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
