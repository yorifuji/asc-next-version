import { describe, expect, test } from 'vitest';
import { AppStoreVersion } from '../../../../src/domain/entities/appStoreVersion.js';
import { Version } from '../../../../src/domain/valueObjects/version.js';
import { BuildNumber } from '../../../../src/domain/valueObjects/buildNumber.js';
import { APP_STORE_STATES } from '../../../../src/shared/constants/index.js';
import type { ApiResource, AppStoreVersionAttributes } from '../../../../src/shared/types/api.js';

describe('AppStoreVersion', () => {
  const createMockApiResource = (
    overrides?: Partial<AppStoreVersionAttributes>,
  ): ApiResource<AppStoreVersionAttributes> => ({
    type: 'appStoreVersions',
    id: 'test-version-id',
    attributes: {
      versionString: '1.0.0',
      appStoreState: APP_STORE_STATES.READY_FOR_SALE,
      platform: 'IOS',
      createdDate: '2023-01-01T00:00:00Z',
      ...overrides,
    },
  });

  describe('constructor', () => {
    test('creates an AppStoreVersion instance with valid data', () => {
      const version = new Version('1.0.0');
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber: 0,
        state: APP_STORE_STATES.READY_FOR_SALE,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });

      expect(appStoreVersion.id).toBe('test-id');
      expect(appStoreVersion.version).toBe(version);
      expect(appStoreVersion.state).toBe(APP_STORE_STATES.READY_FOR_SALE);
      expect(appStoreVersion.platform).toBe('IOS');
      expect(appStoreVersion.createdDate).toBe('2023-01-01');
    });

    test('creates an AppStoreVersion with optional buildNumber', () => {
      const version = new Version('1.0.0');
      const buildNumber = new BuildNumber(42);
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber,
        state: APP_STORE_STATES.READY_FOR_SALE,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });

      expect(appStoreVersion.buildNumber).toBe(buildNumber);
    });

    test('creates an AppStoreVersion with string version', () => {
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version: '1.0.0',
        buildNumber: 0,
        state: APP_STORE_STATES.READY_FOR_SALE,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });

      expect(appStoreVersion.version.toString()).toBe('1.0.0');
    });
  });

  describe('fromApiResponse', () => {
    test('creates an AppStoreVersion from API response', () => {
      const apiResponse = createMockApiResource();
      const appStoreVersion = AppStoreVersion.fromApiResponse(apiResponse);

      expect(appStoreVersion.id).toBe('test-version-id');
      expect(appStoreVersion.version.toString()).toBe('1.0.0');
      expect(appStoreVersion.state).toBe(APP_STORE_STATES.READY_FOR_SALE);
      expect(appStoreVersion.platform).toBe('IOS');
      expect(appStoreVersion.createdDate).toBe('2023-01-01T00:00:00Z');
    });
  });

  describe('canIncrementBuild', () => {
    test('returns true for editable states', () => {
      const version = new Version('1.0.0');
      const editableStates = [
        APP_STORE_STATES.DEVELOPER_REMOVED_FROM_SALE,
        APP_STORE_STATES.DEVELOPER_REJECTED,
        APP_STORE_STATES.IN_REVIEW,
        APP_STORE_STATES.INVALID_BINARY,
        APP_STORE_STATES.METADATA_REJECTED,
        APP_STORE_STATES.PENDING_DEVELOPER_RELEASE,
        APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
        APP_STORE_STATES.REJECTED,
        APP_STORE_STATES.WAITING_FOR_REVIEW,
      ];

      editableStates.forEach((state) => {
        const appStoreVersion = new AppStoreVersion({
          id: 'test-id',
          version,
          buildNumber: 0,
          state,
          platform: 'IOS',
          createdDate: '2023-01-01',
        });
        expect(appStoreVersion.canIncrementBuild()).toBe(true);
      });
    });

    test('returns false for non-editable states', () => {
      const version = new Version('1.0.0');
      const nonEditableStates = [
        APP_STORE_STATES.ACCEPTED,
        APP_STORE_STATES.PROCESSING_FOR_APP_STORE,
        APP_STORE_STATES.PENDING_CONTRACT,
        APP_STORE_STATES.WAITING_FOR_EXPORT_COMPLIANCE,
        APP_STORE_STATES.NOT_APPLICABLE_FOR_REVIEW,
        APP_STORE_STATES.READY_FOR_SALE,
        APP_STORE_STATES.REPLACED_WITH_NEW_VERSION,
        APP_STORE_STATES.REMOVED_FROM_SALE,
      ];

      nonEditableStates.forEach((state) => {
        const appStoreVersion = new AppStoreVersion({
          id: 'test-id',
          version,
          buildNumber: 0,
          state,
          platform: 'IOS',
          createdDate: '2023-01-01',
        });
        expect(appStoreVersion.canIncrementBuild()).toBe(false);
      });
    });
  });

  describe('getNextBuildNumber', () => {
    test('increments existing build number', () => {
      const version = new Version('1.0.0');
      const buildNumber = new BuildNumber(42);
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber,
        state: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });

      const nextBuild = appStoreVersion.getNextBuildNumber();
      expect(nextBuild.getValue()).toBe(43);
    });

    test('returns BuildNumber(1) when starting from 0', () => {
      const version = new Version('1.0.0');
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber: 0,
        state: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });

      const nextBuild = appStoreVersion.getNextBuildNumber();
      expect(nextBuild.getValue()).toBe(1);
    });
  });
});
