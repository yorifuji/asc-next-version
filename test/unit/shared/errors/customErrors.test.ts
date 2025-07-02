import { describe, expect, test } from 'vitest';
import {
  AppStoreConnectError,
  createApiError,
  createBusinessLogicError,
  createValidationError,
  ERROR_CODES,
} from '../../../../src/shared/errors/customErrors.js';

describe('AppStoreConnectError', () => {
  test('creates error with code and details', () => {
    const error = new AppStoreConnectError('Test error message', ERROR_CODES.API_ERROR, {
      field: 'test',
      value: 123,
    });

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(ERROR_CODES.API_ERROR);
    expect(error.details).toEqual({ field: 'test', value: 123 });
    expect(error.name).toBe('AppStoreConnectError');
  });

  test('creates error without details', () => {
    const error = new AppStoreConnectError('Test error message', ERROR_CODES.VALIDATION_ERROR);

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(error.details).toBeUndefined();
  });

  test('includes stack trace', () => {
    const error = new AppStoreConnectError('Test error', ERROR_CODES.NO_LIVE_VERSION);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppStoreConnectError');
  });
});

describe('createValidationError', () => {
  test('creates validation error with field and value', () => {
    const error = createValidationError('Invalid input', 'email', 'not-an-email');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(error.details).toEqual({
      field: 'email',
      value: 'not-an-email',
    });
  });
});

describe('createApiError', () => {
  test('creates API error with status code', () => {
    const error = createApiError('API request failed', 404, { error: 'Not found' });

    expect(error.message).toBe('API request failed');
    expect(error.code).toBe(ERROR_CODES.API_ERROR);
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({
      statusCode: 404,
      response: { error: 'Not found' },
    });
  });

  test('creates API error without response', () => {
    const error = createApiError('Network error', 0);

    expect(error.message).toBe('Network error');
    expect(error.statusCode).toBe(0);
    expect(error.details).toEqual({
      statusCode: 0,
      response: undefined,
    });
  });
});

describe('createBusinessLogicError', () => {
  test('creates business logic error with reason', () => {
    const error = createBusinessLogicError(
      'No live version found',
      ERROR_CODES.NO_LIVE_VERSION,
      'App has not been published yet',
    );

    expect(error.message).toBe('No live version found');
    expect(error.code).toBe(ERROR_CODES.NO_LIVE_VERSION);
    expect(error.details).toEqual({
      reason: 'App has not been published yet',
    });
  });

  test('creates business logic error without reason', () => {
    const error = createBusinessLogicError(
      'Data inconsistency detected',
      ERROR_CODES.DATA_INCONSISTENCY,
    );

    expect(error.message).toBe('Data inconsistency detected');
    expect(error.code).toBe(ERROR_CODES.DATA_INCONSISTENCY);
    expect(error.details).toEqual({ reason: undefined });
  });
});

describe('ERROR_CODES', () => {
  test('contains all expected error codes', () => {
    // Validation errors
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    
    // API errors
    expect(ERROR_CODES.API_ERROR).toBe('API_ERROR');
    
    // Business logic errors
    expect(ERROR_CODES.NO_LIVE_VERSION).toBe('NO_LIVE_VERSION');
    expect(ERROR_CODES.DATA_INCONSISTENCY).toBe('DATA_INCONSISTENCY');
    expect(ERROR_CODES.VERSION_NOT_INCREMENTABLE).toBe('VERSION_NOT_INCREMENTABLE');
    
    // Authentication errors
    expect(ERROR_CODES.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
  });
});
