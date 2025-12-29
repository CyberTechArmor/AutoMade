export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, 'Validation failed', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_REQUIRED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super('RATE_LIMITED', 429, message);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super('INTERNAL_ERROR', 500, message);
  }
}
