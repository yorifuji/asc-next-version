'use strict';

/**
 * Base error class for App Store Connect errors
 */
class AppStoreConnectError extends Error {
  constructor(message, code, details) {
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
class ValidationError extends AppStoreConnectError {
  constructor(message, field, value) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when API communication fails
 */
class ApiError extends AppStoreConnectError {
  constructor(message, statusCode, response) {
    super(message, 'API_ERROR', { statusCode, response });
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown when business logic constraints are violated
 */
class BusinessLogicError extends AppStoreConnectError {
  constructor(message, reason) {
    super(message, 'BUSINESS_LOGIC_ERROR', { reason });
    this.name = 'BusinessLogicError';
  }
}

/**
 * Error thrown when authentication fails
 */
class AuthenticationError extends AppStoreConnectError {
  constructor(message, reason) {
    super(message, 'AUTHENTICATION_ERROR', { reason });
    this.name = 'AuthenticationError';
  }
}

module.exports = {
  AppStoreConnectError,
  ValidationError,
  ApiError,
  BusinessLogicError,
  AuthenticationError,
};
