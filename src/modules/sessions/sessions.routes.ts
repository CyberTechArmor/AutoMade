import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  createSessionSchema,
  updateSessionSchema,
  listSessionsSchema,
  getSessionSchema,
  addTranscriptSchema,
  sessionMessageSchema,
} from './sessions.schemas.js';
import * as sessionService from './sessions.service.js';

const router = Router();

/**
 * GET /sessions
 * List all sessions with pagination and filtering
 */
router.get(
  '/',
  authenticate,
  authorize('sessions:read'),
  validate(listSessionsSchema),
  async (req, res, next) => {
    try {
      const result = await sessionService.listSessions({
        projectId: req.query.projectId as string | undefined,
        state: req.query.state as string | undefined,
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
 * GET /sessions/:id
 * Get a session by ID with details
 */
router.get(
  '/:id',
  authenticate,
  authorize('sessions:read'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      const result = await sessionService.getSessionWithDetails(req.params.id);

      if (!result) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions
 * Create a new session
 */
router.post(
  '/',
  authenticate,
  authorize('sessions:create'),
  validate(createSessionSchema),
  async (req, res, next) => {
    try {
      const session = await sessionService.createSession(
        req.body,
        req.user!.id,
        req.ip,
        req.requestId
      );

      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /sessions/:id
 * Update a session
 */
router.patch(
  '/:id',
  authenticate,
  authorize('sessions:update'),
  validate(updateSessionSchema),
  async (req, res, next) => {
    try {
      const session = await sessionService.updateSession(
        req.params.id,
        req.body,
        req.user!.id,
        req.ip,
        req.requestId
      );

      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:id/start
 * Start a session
 */
router.post(
  '/:id/start',
  authenticate,
  authorize('sessions:update'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      const session = await sessionService.startSession(
        req.params.id,
        req.user!.id,
        req.ip,
        req.requestId
      );

      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:id/end
 * End a session
 */
router.post(
  '/:id/end',
  authenticate,
  authorize('sessions:update'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      const session = await sessionService.endSession(
        req.params.id,
        req.user!.id,
        req.ip,
        req.requestId
      );

      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /sessions/:id/transcripts
 * Get session transcripts
 */
router.get(
  '/:id/transcripts',
  authenticate,
  authorize('sessions:read'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      const transcripts = await sessionService.getTranscripts(req.params.id);
      res.json(transcripts);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:id/transcripts
 * Add a transcript entry
 */
router.post(
  '/:id/transcripts',
  authenticate,
  authorize('sessions:update'),
  validate(addTranscriptSchema),
  async (req, res, next) => {
    try {
      const transcript = await sessionService.addTranscript(
        req.params.id,
        req.body
      );

      res.status(201).json(transcript);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:id/message
 * Send a message and get LLM response
 */
router.post(
  '/:id/message',
  authenticate,
  authorize('sessions:update'),
  validate(sessionMessageSchema),
  async (req, res, next) => {
    try {
      const result = await sessionService.processMessage(
        req.params.id,
        req.body.content
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:id/summarize
 * Generate session summary
 */
router.post(
  '/:id/summarize',
  authenticate,
  authorize('sessions:update'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      const summary = await sessionService.generateSessionSummary(req.params.id);

      // Update session with summary
      await sessionService.updateSession(
        req.params.id,
        { output: summary },
        req.user!.id,
        req.ip,
        req.requestId
      );

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
