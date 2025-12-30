import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  createSessionSchema,
  updateSessionSchema,
  listSessionsSchema,
  getSessionSchema,
  addTranscriptSchema,
  sessionMessageSchema,
  generateTokenSchema,
} from './sessions.schemas.js';
import * as sessionService from './sessions.service.js';
import recordingsRoutes from '../recordings/recordings.routes.js';

const router = Router();

// Nest recordings routes under sessions
router.use('/:sessionId/recordings', recordingsRoutes);

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
      const result = await sessionService.getSessionWithDetails(req.params.id!);

      if (!result) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Session not found',
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
        req.ip ?? undefined,
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
        req.params.id!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
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
        req.params.id!,
        req.user!.id,
        req.ip ?? undefined,
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
        req.params.id!,
        req.user!.id,
        req.ip ?? undefined,
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
      const transcripts = await sessionService.getTranscripts(req.params.id!);
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
        req.params.id!,
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
        req.params.id!,
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
      const summary = await sessionService.generateSessionSummary(req.params.id!);

      // Update session with summary
      await sessionService.updateSession(
        req.params.id!,
        { output: summary },
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// LiveKit Real-time Session Endpoints
// ============================================================================

/**
 * POST /sessions/:id/room
 * Create a LiveKit room for the session
 */
router.post(
  '/:id/room',
  authenticate,
  authorize('sessions:update'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      const room = await sessionService.createSessionRoom(req.params.id!);
      res.status(201).json(room);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /sessions/:id/room
 * Get LiveKit room status
 */
router.get(
  '/:id/room',
  authenticate,
  authorize('sessions:read'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      const status = await sessionService.getSessionRoomStatus(req.params.id!);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /sessions/:id/room
 * Close the LiveKit room
 */
router.delete(
  '/:id/room',
  authenticate,
  authorize('sessions:update'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      await sessionService.closeSessionRoom(req.params.id!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:id/token
 * Generate a LiveKit access token for the current user
 */
router.post(
  '/:id/token',
  authenticate,
  authorize('sessions:read'),
  validate(generateTokenSchema),
  async (req, res, next) => {
    try {
      const token = await sessionService.generateParticipantToken(
        req.params.id!,
        req.user!.id,
        {
          canPublish: req.body.canPublish,
          canSubscribe: req.body.canSubscribe,
        }
      );

      res.json({ token });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /sessions/:id/participants/:participantId
 * Remove a participant from the session room
 */
router.delete(
  '/:id/participants/:participantId',
  authenticate,
  authorize('sessions:update'),
  async (req, res, next) => {
    try {
      await sessionService.removeSessionParticipant(
        req.params.id!,
        req.params.participantId!
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:id/broadcast
 * Broadcast data to all participants
 */
router.post(
  '/:id/broadcast',
  authenticate,
  authorize('sessions:update'),
  validate(getSessionSchema),
  async (req, res, next) => {
    try {
      await sessionService.broadcastToSessionRoom(req.params.id!, req.body);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
