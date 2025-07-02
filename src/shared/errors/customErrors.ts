import type { ErrorDetails } from '../types/api.js';

/**
 * Base error class for App Store Connect errors
 */
export class AppStoreConnectError extends Error {
  code: string;
  details: ErrorDetails | undefined;

  constructor(message: string, code: string, details?: ErrorDetails) {
    super(message);
    this.name = 'AppStoreConnectError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppStoreConnectError {
  constructor(message: string, field: string, value: unknown) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when API communication fails
 */
export class ApiError extends AppStoreConnectError {
  statusCode: number;

  constructor(message: string, statusCode: number, response?: unknown) {
    super(message, 'API_ERROR', { statusCode, response });
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown when business logic constraints are violated
 */
export class BusinessLogicError extends AppStoreConnectError {
  constructor(message: string, reason: string) {
    super(message, 'BUSINESS_LOGIC_ERROR', { reason });
    this.name = 'BusinessLogicError';
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends AppStoreConnectError {
  constructor(message: string, reason: string) {
    super(message, 'AUTHENTICATION_ERROR', { reason });
    this.name = 'AuthenticationError';
  }
}
