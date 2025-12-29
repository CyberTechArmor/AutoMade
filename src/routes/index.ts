import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import projectRoutes from '../modules/projects/projects.routes.js';
import sessionRoutes from '../modules/sessions/sessions.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'automade-api',
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/sessions', sessionRoutes);

export default router;
