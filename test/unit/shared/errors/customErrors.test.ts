import { describe, expect, test } from 'vitest';
import {
  APPLICATION_ERROR_CODES,
  ApplicationError,
  createApiError,
  createBusinessLogicError,
  createValidationError,
} from '../../../../src/shared/errors/customErrors.js';

describe('ApplicationError', () => {
  test('creates error with code and details', () => {
    const error = new ApplicationError('Test error message', APPLICATION_ERROR_CODES.API_ERROR, {
      field: 'test',
      value: 123,
    });

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(APPLICATION_ERROR_CODES.API_ERROR);
    expect(error.details).toEqual({ field: 'test', value: 123 });
    expect(error.name).toBe('ApplicationError');
  });

  test('creates error without details', () => {
    const error = new ApplicationError(
      'Test error message',
      APPLICATION_ERROR_CODES.VALIDATION_ERROR,
    );

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(APPLICATION_ERROR_CODES.VALIDATION_ERROR);
    expect(error.details).toBeUndefined();
  });

  test('includes stack trace', () => {
    const error = new ApplicationError(
      'Test error',
      APPLICATION_ERROR_CODES.LIVE_VERSION_NOT_FOUND,
    );

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ApplicationError');
  });
});

describe('createValidationError', () => {
  test('creates validation error with field and value', () => {
    const error = createValidationError('Invalid input', 'email', 'not-an-email');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe(APPLICATION_ERROR_CODES.VALIDATION_ERROR);
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
    expect(error.code).toBe(APPLICATION_ERROR_CODES.API_ERROR);
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
      APPLICATION_ERROR_CODES.LIVE_VERSION_NOT_FOUND,
      'App has not been published yet',
    );

    expect(error.message).toBe('No live version found');
    expect(error.code).toBe(APPLICATION_ERROR_CODES.LIVE_VERSION_NOT_FOUND);
    expect(error.details).toEqual({
      reason: 'App has not been published yet',
    });
  });

  test('creates business logic error without reason', () => {
    const error = createBusinessLogicError(
      'Data inconsistency detected',
      APPLICATION_ERROR_CODES.INCONSISTENT_DATA_STATE,
    );

    expect(error.message).toBe('Data inconsistency detected');
    expect(error.code).toBe(APPLICATION_ERROR_CODES.INCONSISTENT_DATA_STATE);
    expect(error.details).toEqual({ reason: undefined });
  });
});

describe('APPLICATION_ERROR_CODES', () => {
  test('contains all expected error codes', () => {
    // Validation errors
    expect(APPLICATION_ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');

    // API errors
    expect(APPLICATION_ERROR_CODES.API_ERROR).toBe('API_ERROR');

    // Business logic errors
    expect(APPLICATION_ERROR_CODES.LIVE_VERSION_NOT_FOUND).toBe('LIVE_VERSION_NOT_FOUND');
    expect(APPLICATION_ERROR_CODES.INCONSISTENT_DATA_STATE).toBe('INCONSISTENT_DATA_STATE');
    expect(APPLICATION_ERROR_CODES.VERSION_INCREMENT_NOT_ALLOWED).toBe(
      'VERSION_INCREMENT_NOT_ALLOWED',
    );

    // Authentication errors
    expect(APPLICATION_ERROR_CODES.AUTHENTICATION_FAILED).toBe('AUTHENTICATION_FAILED');
  });
});
