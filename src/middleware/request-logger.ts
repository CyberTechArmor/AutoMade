import { randomUUID } from 'crypto';
import { RequestHandler } from 'express';
import { createRequestLogger } from '../lib/logger.js';
import type { Logger } from 'pino';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      log: Logger;
    }
  }
}

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const startTime = Date.now();

  // Attach logger and request ID to request
  req.log = createRequestLogger(requestId);
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    req.log.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id,
    }, 'request completed');
  });

  next();
};
