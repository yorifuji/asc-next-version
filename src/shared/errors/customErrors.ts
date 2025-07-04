import type { ApiErrorResponse, ErrorDetails } from '../types/api.js';

/**
 * Error codes used throughout the application
 */
export const APPLICATION_ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // API errors
  API_ERROR: 'API_ERROR',

  // Business logic errors
  LIVE_VERSION_NOT_FOUND: 'LIVE_VERSION_NOT_FOUND',
  INCONSISTENT_DATA_STATE: 'INCONSISTENT_DATA_STATE',
  VERSION_INCREMENT_NOT_ALLOWED: 'VERSION_INCREMENT_NOT_ALLOWED',

  // Authentication errors
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
} as const;

export type ApplicationErrorCode =
  (typeof APPLICATION_ERROR_CODES)[keyof typeof APPLICATION_ERROR_CODES];

/**
 * Base error class for application errors
 */
export class ApplicationError extends Error {
  code: ApplicationErrorCode;
  details?: ErrorDetails;
  statusCode?: number;

  constructor(message: string, code: ApplicationErrorCode, details?: ErrorDetails) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper function to create validation errors
 */
export function createValidationError(
  message: string,
  field: string,
  value: unknown,
): ApplicationError {
  return new ApplicationError(message, APPLICATION_ERROR_CODES.VALIDATION_ERROR, {
    field,
    value:
      typeof value === 'object'
        ? JSON.stringify(value)
        : (value as string | number | boolean | null),
  });
}

/**
 * Helper function to create API errors
 */
export function createApiError(
  message: string,
  statusCode: number,
  response?: unknown,
): ApplicationError {
  const error = new ApplicationError(message, APPLICATION_ERROR_CODES.API_ERROR, {
    statusCode,
    response: response as ApiErrorResponse | Record<string, unknown> | undefined,
  });
  error.statusCode = statusCode;
  return error;
}

/**
 * Helper function to create business logic errors
 */
export function createBusinessLogicError(
  message: string,
  code: ApplicationErrorCode,
  reason?: string,
): ApplicationError {
  return new ApplicationError(message, code, { reason });
}
