import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.logging.level,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'automade',
    environment: config.env,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.passwordHash',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
    ],
    censor: '[REDACTED]',
  },
});

export function createRequestLogger(requestId: string): pino.Logger {
  return logger.child({ requestId });
}
