import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  listMilestonesSchema,
  getMilestoneSchema,
  reorderMilestonesSchema,
} from './milestones.schemas.js';
import * as milestoneService from './milestones.service.js';

const router = Router({ mergeParams: true });

/**
 * GET /projects/:projectId/milestones
 * List all milestones for a project
 */
router.get(
  '/',
  authenticate,
  authorize('milestones:read'),
  validate(listMilestonesSchema),
  async (req, res, next) => {
    try {
      const milestones = await milestoneService.listMilestones(req.params.projectId!);

      res.json({ data: milestones });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/:projectId/milestones/progress
 * Get milestone progress for a project
 */
router.get(
  '/progress',
  authenticate,
  authorize('milestones:read'),
  validate(listMilestonesSchema),
  async (req, res, next) => {
    try {
      const progress = await milestoneService.getMilestoneProgress(req.params.projectId!);

      res.json(progress);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/:projectId/milestones/:milestoneId
 * Get a specific milestone
 */
router.get(
  '/:milestoneId',
  authenticate,
  authorize('milestones:read'),
  validate(getMilestoneSchema),
  async (req, res, next) => {
    try {
      const milestone = await milestoneService.getMilestoneById(
        req.params.projectId!,
        req.params.milestoneId!
      );

      if (!milestone) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Milestone not found',
        });
        return;
      }

      res.json(milestone);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/milestones
 * Create a new milestone
 */
router.post(
  '/',
  authenticate,
  authorize('milestones:create'),
  validate(createMilestoneSchema),
  async (req, res, next) => {
    try {
      const milestone = await milestoneService.createMilestone(
        req.params.projectId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(milestone);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/milestones/reorder
 * Reorder milestones
 */
router.post(
  '/reorder',
  authenticate,
  authorize('milestones:update'),
  validate(reorderMilestonesSchema),
  async (req, res, next) => {
    try {
      const milestones = await milestoneService.reorderMilestones(
        req.params.projectId!,
        req.body.milestoneIds,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json({ data: milestones });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /projects/:projectId/milestones/:milestoneId
 * Update a milestone
 */
router.patch(
  '/:milestoneId',
  authenticate,
  authorize('milestones:update'),
  validate(updateMilestoneSchema),
  async (req, res, next) => {
    try {
      const milestone = await milestoneService.updateMilestone(
        req.params.projectId!,
        req.params.milestoneId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json(milestone);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /projects/:projectId/milestones/:milestoneId
 * Delete a milestone
 */
router.delete(
  '/:milestoneId',
  authenticate,
  authorize('milestones:delete'),
  validate(getMilestoneSchema),
  async (req, res, next) => {
    try {
      await milestoneService.deleteMilestone(
        req.params.projectId!,
        req.params.milestoneId!,
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
