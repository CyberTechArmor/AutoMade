import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  listRecordingsSchema,
  getRecordingSchema,
  createRecordingSchema,
  deleteRecordingSchema,
  getTranscriptSchema,
} from './recordings.schemas.js';
import * as recordingsService from './recordings.service.js';
import multer from 'multer';

const router = Router({ mergeParams: true });

// Configure multer for recording uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for recordings
  },
});

/**
 * GET /sessions/:sessionId/recordings
 * List all recordings for a session
 */
router.get(
  '/',
  authenticate,
  authorize('recordings:read'),
  validate(listRecordingsSchema),
  async (req, res, next) => {
    try {
      const recordings = await recordingsService.listRecordings(
        req.params.sessionId!,
        req.query.trackType as string | undefined
      );

      res.json({ data: recordings });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /sessions/:sessionId/transcript
 * Get session transcript
 */
router.get(
  '/transcript',
  authenticate,
  authorize('recordings:read'),
  validate(getTranscriptSchema),
  async (req, res, next) => {
    try {
      const format = (req.query.format as 'json' | 'text' | 'vtt' | 'srt') || 'json';
      const transcript = await recordingsService.getTranscript(
        req.params.sessionId!,
        format
      );

      if (format === 'json') {
        res.json({ data: transcript });
      } else if (format === 'vtt') {
        res.setHeader('Content-Type', 'text/vtt');
        res.setHeader('Content-Disposition', `attachment; filename="transcript.vtt"`);
        res.send(transcript);
      } else if (format === 'srt') {
        res.setHeader('Content-Type', 'application/x-subrip');
        res.setHeader('Content-Disposition', `attachment; filename="transcript.srt"`);
        res.send(transcript);
      } else {
        res.setHeader('Content-Type', 'text/plain');
        res.send(transcript);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /sessions/:sessionId/recordings/:recordingId
 * Stream a recording
 */
router.get(
  '/:recordingId',
  authenticate,
  authorize('recordings:read'),
  validate(getRecordingSchema),
  async (req, res, next) => {
    try {
      const result = await recordingsService.getRecordingStream(
        req.params.sessionId!,
        req.params.recordingId!
      );

      if (!result) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Recording not found',
        });
        return;
      }

      const { recording, stream } = result;

      // Support range requests for video seeking
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0]!, 10);
        const end = parts[1] ? parseInt(parts[1], 10) : recording.fileSize - 1;
        const chunkSize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${recording.fileSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', recording.mimeType);
      } else {
        res.setHeader('Content-Type', recording.mimeType);
        res.setHeader('Content-Length', recording.fileSize);
        res.setHeader('Accept-Ranges', 'bytes');
      }

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /sessions/:sessionId/recordings/:recordingId/metadata
 * Get recording metadata
 */
router.get(
  '/:recordingId/metadata',
  authenticate,
  authorize('recordings:read'),
  validate(getRecordingSchema),
  async (req, res, next) => {
    try {
      const recording = await recordingsService.getRecordingById(
        req.params.sessionId!,
        req.params.recordingId!
      );

      if (!recording) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Recording not found',
        });
        return;
      }

      res.json(recording);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /sessions/:sessionId/recordings
 * Upload a new recording
 */
router.post(
  '/',
  authenticate,
  authorize('recordings:create'),
  validate(createRecordingSchema),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'No file uploaded',
        });
        return;
      }

      const recording = await recordingsService.createRecording(
        req.params.sessionId!,
        req.body,
        {
          buffer: req.file.buffer,
          size: req.file.size,
        },
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(recording);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /sessions/:sessionId/recordings/:recordingId
 * Delete a recording
 */
router.delete(
  '/:recordingId',
  authenticate,
  authorize('recordings:delete'),
  validate(deleteRecordingSchema),
  async (req, res, next) => {
    try {
      await recordingsService.deleteRecording(
        req.params.sessionId!,
        req.params.recordingId!,
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
