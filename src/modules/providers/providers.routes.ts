import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireRole, ROLES } from '../../lib/rbac.js';
import * as providerService from './providers.service.js';
import {
  createProviderSchema,
  updateProviderSchema,
  getProviderSchema,
  listProvidersSchema,
  testProviderSchema,
  deleteProviderSchema,
  getProviderUsageSchema,
  getAllProvidersUsageSchema,
  rotateProviderKeySchema,
} from './providers.schemas.js';

const router = Router();

// All provider routes require authentication and admin role
router.use(authenticate);
router.use(requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]));

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
      const provider = await providerService.getProviderById(req.params.id!);

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
        req.user!.id,
        req.ip ?? undefined,
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
        req.params.id!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
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
        req.params.id!,
        req.user!.id,
        req.ip ?? undefined,
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
      const result = await providerService.testProvider(req.params.id!);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/providers/usage
 * Get aggregated usage for all providers
 */
router.get(
  '/usage',
  validate(getAllProvidersUsageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await providerService.getAllProvidersUsage({
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      });

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/providers/:id/usage
 * Get usage statistics for a specific provider
 */
router.get(
  '/:id/usage',
  validate(getProviderUsageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await providerService.getProviderUsage(req.params.id!, {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/providers/:id/rotate
 * Rotate a provider's API key
 */
router.post(
  '/:id/rotate',
  validate(rotateProviderKeySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await providerService.rotateProviderKey(
        req.params.id!,
        req.body.credentials,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
