import type { ErrorDetails } from '../types/api.js';

/**
 * Error codes used throughout the application
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // API errors
  API_ERROR: 'API_ERROR',

  // Business logic errors
  NO_LIVE_VERSION: 'NO_LIVE_VERSION',
  DATA_INCONSISTENCY: 'DATA_INCONSISTENCY',
  VERSION_NOT_INCREMENTABLE: 'VERSION_NOT_INCREMENTABLE',

  // Authentication errors
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Base error class for App Store Connect errors
 */
export class AppStoreConnectError extends Error {
  code: ErrorCode;
  details?: ErrorDetails;
  statusCode?: number;

  constructor(message: string, code: ErrorCode, details?: ErrorDetails) {
    super(message);
    this.name = 'AppStoreConnectError';
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
): AppStoreConnectError {
  return new AppStoreConnectError(message, ERROR_CODES.VALIDATION_ERROR, { field, value });
}

/**
 * Helper function to create API errors
 */
export function createApiError(
  message: string,
  statusCode: number,
  response?: unknown,
): AppStoreConnectError {
  const error = new AppStoreConnectError(message, ERROR_CODES.API_ERROR, { statusCode, response });
  error.statusCode = statusCode;
  return error;
}

/**
 * Helper function to create business logic errors
 */
export function createBusinessLogicError(
  message: string,
  code: ErrorCode,
  reason?: string,
): AppStoreConnectError {
  return new AppStoreConnectError(message, code, { reason });
}
