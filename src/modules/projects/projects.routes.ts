import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  getProjectSchema,
} from './projects.schemas.js';
import * as projectService from './projects.service.js';
import documentRoutes from '../documents/documents.routes.js';
import milestoneRoutes from '../milestones/milestones.routes.js';
import metricsRoutes from '../metrics/metrics.routes.js';

const router = Router();

// Nest documents routes under projects
router.use('/:projectId/documents', documentRoutes);
// Nest milestones routes under projects
router.use('/:projectId/milestones', milestoneRoutes);
// Nest metrics routes under projects
router.use('/:projectId/metrics', metricsRoutes);

/**
 * GET /projects
 * List all projects with pagination and filtering
 */
router.get(
  '/',
  authenticate,
  authorize('projects:read'),
  validate(listProjectsSchema),
  async (req, res, next) => {
    try {
      const result = await projectService.listProjects({
        clientId: req.query.clientId as string | undefined,
        stage: req.query.stage as string | undefined,
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
 * GET /projects/:id
 * Get a project by ID with details
 */
router.get(
  '/:id',
  authenticate,
  authorize('projects:read'),
  validate(getProjectSchema),
  async (req, res, next) => {
    try {
      const result = await projectService.getProjectWithDetails(req.params.id!);

      if (!result) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Project not found',
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
 * POST /projects
 * Create a new project
 */
router.post(
  '/',
  authenticate,
  authorize('projects:create'),
  validate(createProjectSchema),
  async (req, res, next) => {
    try {
      const project = await projectService.createProject(
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /projects/:id
 * Update a project
 */
router.patch(
  '/:id',
  authenticate,
  authorize('projects:update'),
  validate(updateProjectSchema),
  async (req, res, next) => {
    try {
      const project = await projectService.updateProject(
        req.params.id!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /projects/:id
 * Soft delete a project
 */
router.delete(
  '/:id',
  authenticate,
  authorize('projects:delete'),
  validate(getProjectSchema),
  async (req, res, next) => {
    try {
      await projectService.deleteProject(
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
