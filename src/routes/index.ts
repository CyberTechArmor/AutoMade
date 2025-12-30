import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import clientRoutes from '../modules/clients/clients.routes.js';
import projectRoutes from '../modules/projects/projects.routes.js';
import sessionRoutes from '../modules/sessions/sessions.routes.js';
import providerRoutes from '../modules/providers/providers.routes.js';
import searchRoutes from '../modules/search/search.routes.js';
import calendarRoutes from '../modules/calendar/calendar.routes.js';
import docsRoutes from './docs.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'automade-api',
  });
});

// API Documentation (Swagger UI)
router.use('/docs', docsRoutes);

// API routes
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/sessions', sessionRoutes);
router.use('/providers', providerRoutes);
router.use('/search', searchRoutes);
router.use('/calendar', calendarRoutes);

export default router;
