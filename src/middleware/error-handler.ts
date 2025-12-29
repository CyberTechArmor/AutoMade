import { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
      requestId,
    });
  }

  // Log unexpected errors
  logger.error({
    err,
    requestId,
    req: {
      method: req.method,
      url: req.url,
      userId: req.user?.id,
    },
  }, 'Unhandled error');

  // Don't leak internal details
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    requestId,
  });
};
