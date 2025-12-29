import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { requestLogger, errorHandler } from './middleware/index.js';
import routes from './routes/index.js';
import { setupSocketHandlers } from './lib/socket.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.api.frontendUrl,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'wss:', 'ws:'],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.api.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.set('trust proxy', true);

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'The requested resource was not found',
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Graceful shutdown
const shutdown = (): void => {
  logger.info('Shutting down gracefully...');

  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
httpServer.listen(config.port, config.host, () => {
  logger.info({
    port: config.port,
    host: config.host,
    env: config.env,
  }, 'Server started');
});

export { app, io };
