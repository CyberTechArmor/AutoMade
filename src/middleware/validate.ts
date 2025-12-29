import { RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors.js';

export function validate<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, unknown> = {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        };
        throw new ValidationError(details);
      }
      throw error;
    }
  };
}
