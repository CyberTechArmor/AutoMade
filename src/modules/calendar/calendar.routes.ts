import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import { listEventsSchema } from './calendar.schemas.js';
import * as calendarService from './calendar.service.js';

const router = Router();

/**
 * GET /calendar/events
 * List calendar events within a date range
 */
router.get(
  '/events',
  authenticate,
  authorize('calendar:read'),
  validate(listEventsSchema),
  async (req, res, next) => {
    try {
      const events = await calendarService.listEvents({
        start: new Date(req.query.start as string),
        end: new Date(req.query.end as string),
        projectId: req.query.projectId as string | undefined,
        type: req.query.type as string | undefined,
      });

      res.json({ data: events });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /calendar/upcoming
 * Get upcoming events (next 7 days)
 */
router.get(
  '/upcoming',
  authenticate,
  authorize('calendar:read'),
  async (req, res, next) => {
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const projectId = req.query.projectId as string | undefined;

      const events = await calendarService.listEvents({
        start,
        end,
        projectId,
      });

      res.json({ data: events });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
