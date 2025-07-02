import { describe, expect, test } from 'vitest';
import { App } from '../../../../src/domain/entities/app.js';
import type { ApiResource, AppAttributes } from '../../../../src/shared/types/api.js';

describe('App', () => {
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
    test('creates an App instance with valid data', () => {
      const app = new App({
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

  describe('fromApiResponse', () => {
    test('creates an App from API response', () => {
      const apiResponse = createMockApiResource();
      const app = App.fromApiResponse(apiResponse);

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
      const app = App.fromApiResponse(apiResponse);

      expect(app.sku).toBe('');
      expect(app.primaryLocale).toBe('');
    });
  });

  describe('toObject', () => {
    test('converts App to plain object', () => {
      const app = new App({
        id: 'test-id',
        bundleId: 'com.example.app',
        name: 'Test App',
        sku: 'TEST_SKU',
        primaryLocale: 'en-US',
      });

      const obj = app.toObject();

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
