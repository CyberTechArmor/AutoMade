import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  createClientSchema,
  updateClientSchema,
  listClientsSchema,
  getClientSchema,
} from './clients.schemas.js';
import * as clientService from './clients.service.js';

const router = Router();

/**
 * GET /clients
 * List all clients with pagination
 */
router.get(
  '/',
  authenticate,
  authorize('clients:read'),
  validate(listClientsSchema),
  async (req, res, next) => {
    try {
      const result = await clientService.listClients({
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
 * GET /clients/:id
 * Get a client by ID with details
 */
router.get(
  '/:id',
  authenticate,
  authorize('clients:read'),
  validate(getClientSchema),
  async (req, res, next) => {
    try {
      const result = await clientService.getClientWithDetails(req.params.id!);

      if (!result) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /clients
 * Create a new client
 */
router.post(
  '/',
  authenticate,
  authorize('clients:create'),
  validate(createClientSchema),
  async (req, res, next) => {
    try {
      const client = await clientService.createClient(
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(client);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /clients/:id
 * Update a client
 */
router.patch(
  '/:id',
  authenticate,
  authorize('clients:update'),
  validate(updateClientSchema),
  async (req, res, next) => {
    try {
      const client = await clientService.updateClient(
        req.params.id!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json(client);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /clients/:id
 * Soft delete a client
 */
router.delete(
  '/:id',
  authenticate,
  authorize('clients:delete'),
  validate(getClientSchema),
  async (req, res, next) => {
    try {
      await clientService.deleteClient(
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

export default router;
