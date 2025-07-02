import type { ErrorDetails } from '../types/api.js';

/**
 * Error codes used throughout the application
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_VERSION_FORMAT: 'INVALID_VERSION_FORMAT',
  INVALID_BUILD_NUMBER: 'INVALID_BUILD_NUMBER',
  
  // API errors
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  
  // Business logic errors
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  NO_LIVE_VERSION: 'NO_LIVE_VERSION',
  VERSION_ALREADY_EXISTS: 'VERSION_ALREADY_EXISTS',
  
  // Authentication errors
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

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
export function createValidationError(message: string, field: string, value: unknown): AppStoreConnectError {
  return new AppStoreConnectError(message, ERROR_CODES.VALIDATION_ERROR, { field, value });
}

/**
 * Helper function to create API errors
 */
export function createApiError(message: string, statusCode: number, response?: unknown): AppStoreConnectError {
  const error = new AppStoreConnectError(message, ERROR_CODES.API_ERROR, { statusCode, response });
  error.statusCode = statusCode;
  return error;
}

/**
 * Helper function to create business logic errors
 */
export function createBusinessLogicError(message: string, code: ErrorCode, reason?: string): AppStoreConnectError {
  return new AppStoreConnectError(message, code, { reason });
}

// Legacy exports for backward compatibility
export const ValidationError = AppStoreConnectError;
export const ApiError = AppStoreConnectError;
export const BusinessLogicError = AppStoreConnectError;
export const AuthenticationError = AppStoreConnectError;