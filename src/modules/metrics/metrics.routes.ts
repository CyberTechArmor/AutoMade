import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  listTimeEntriesSchema,
  getTimeEntrySchema,
  getProjectMetricsSchema,
  createCostEntrySchema,
  listCostEntriesSchema,
} from './metrics.schemas.js';
import * as metricsService from './metrics.service.js';

const router = Router({ mergeParams: true });

/**
 * GET /projects/:projectId/metrics
 * Get project metrics and analytics
 */
router.get(
  '/',
  authenticate,
  authorize('metrics:read'),
  validate(getProjectMetricsSchema),
  async (req, res, next) => {
    try {
      const metrics = await metricsService.getProjectMetrics({
        projectId: req.params.projectId!,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });

      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/:projectId/time-entries
 * List time entries for a project
 */
router.get(
  '/time-entries',
  authenticate,
  authorize('metrics:read'),
  validate(listTimeEntriesSchema),
  async (req, res, next) => {
    try {
      const result = await metricsService.listTimeEntries({
        projectId: req.params.projectId!,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        milestoneId: req.query.milestoneId as string | undefined,
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
 * GET /projects/:projectId/time-entries/:entryId
 * Get a specific time entry
 */
router.get(
  '/time-entries/:entryId',
  authenticate,
  authorize('metrics:read'),
  validate(getTimeEntrySchema),
  async (req, res, next) => {
    try {
      const entry = await metricsService.getTimeEntryById(
        req.params.projectId!,
        req.params.entryId!
      );

      if (!entry) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Time entry not found',
        });
        return;
      }

      res.json(entry);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/time-entries
 * Create a new time entry
 */
router.post(
  '/time-entries',
  authenticate,
  authorize('metrics:create'),
  validate(createTimeEntrySchema),
  async (req, res, next) => {
    try {
      const entry = await metricsService.createTimeEntry(
        req.params.projectId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /projects/:projectId/time-entries/:entryId
 * Update a time entry
 */
router.patch(
  '/time-entries/:entryId',
  authenticate,
  authorize('metrics:update'),
  validate(updateTimeEntrySchema),
  async (req, res, next) => {
    try {
      const entry = await metricsService.updateTimeEntry(
        req.params.projectId!,
        req.params.entryId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json(entry);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /projects/:projectId/time-entries/:entryId
 * Delete a time entry
 */
router.delete(
  '/time-entries/:entryId',
  authenticate,
  authorize('metrics:delete'),
  validate(getTimeEntrySchema),
  async (req, res, next) => {
    try {
      await metricsService.deleteTimeEntry(
        req.params.projectId!,
        req.params.entryId!,
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
 * GET /projects/:projectId/cost-entries
 * List cost entries for a project
 */
router.get(
  '/cost-entries',
  authenticate,
  authorize('metrics:read'),
  validate(listCostEntriesSchema),
  async (req, res, next) => {
    try {
      const result = await metricsService.listCostEntries({
        projectId: req.params.projectId!,
        source: req.query.source as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
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
 * POST /projects/:projectId/cost-entries
 * Create a new cost entry
 */
router.post(
  '/cost-entries',
  authenticate,
  authorize('metrics:create'),
  validate(createCostEntrySchema),
  async (req, res, next) => {
    try {
      const entry = await metricsService.createCostEntry(
        req.params.projectId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
