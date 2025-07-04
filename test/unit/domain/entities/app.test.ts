import { describe, expect, test } from 'vitest';
import { Application } from '../../../../src/domain/entities/app.js';
import type { ApiResource, AppAttributes } from '../../../../src/shared/types/api.js';

describe('Application', () => {
  const createMockApiResource = (
    overrides?: Partial<AppAttributes>,
  ): ApiResource<AppAttributes> => ({
    type: 'apps',
    id: 'test-app-id',
    attributes: {
      bundleId: 'com.example.app',
      name: 'Test App',
      sku: 'TEST_SKU',
      primaryLocale: 'en-US',
      ...overrides,
    },
  });

  describe('constructor', () => {
    test('creates an Application instance with valid data', () => {
      const app = new Application({
        id: 'test-id',
        bundleId: 'com.example.app',
        name: 'Test App',
        sku: 'TEST_SKU',
        primaryLocale: 'en-US',
      });

      expect(app.id).toBe('test-id');
      expect(app.bundleId).toBe('com.example.app');
      expect(app.name).toBe('Test App');
      expect(app.sku).toBe('TEST_SKU');
      expect(app.primaryLocale).toBe('en-US');
    });
  });

  describe('createFromApiResponse', () => {
    test('creates an Application from API response', () => {
      const apiResponse = createMockApiResource();
      const app = Application.createFromApiResponse(apiResponse);

      expect(app.id).toBe('test-app-id');
      expect(app.bundleId).toBe('com.example.app');
      expect(app.name).toBe('Test App');
      expect(app.sku).toBe('TEST_SKU');
      expect(app.primaryLocale).toBe('en-US');
    });

    test('handles missing optional fields', () => {
      const apiResponse = createMockApiResource({
        bundleId: 'com.example.app',
        name: 'Test App',
        sku: '',
        primaryLocale: '',
      });
      const app = Application.createFromApiResponse(apiResponse);

      expect(app.sku).toBe('');
      expect(app.primaryLocale).toBe('');
    });
  });

  describe('toPlainObject', () => {
    test('converts Application to plain object', () => {
      const app = new Application({
        id: 'test-id',
        bundleId: 'com.example.app',
        name: 'Test App',
        sku: 'TEST_SKU',
        primaryLocale: 'en-US',
      });

      const obj = app.toPlainObject();

      expect(obj).toEqual({
        id: 'test-id',
        bundleId: 'com.example.app',
        name: 'Test App',
        sku: 'TEST_SKU',
        primaryLocale: 'en-US',
      });
    });
  });
});
