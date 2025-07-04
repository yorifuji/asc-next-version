import { describe, expect, test } from 'vitest';
import { VersionCalculator } from '../../../../src/domain/services/versionCalculator.js';
import { Version } from '../../../../src/domain/valueObjects/version.js';
import { BuildNumber } from '../../../../src/domain/valueObjects/buildNumber.js';
import { AppStoreVersion } from '../../../../src/domain/entities/appStoreVersion.js';
import { APP_STORE_STATES, VERSION_ACTION_TYPES } from '../../../../src/shared/constants/index.js';

describe('VersionCalculator', () => {
  describe('calculateNextSemanticVersion', () => {
    test('increments patch version by default', () => {
      const currentVersion = new Version('1.2.3');
      const nextVersion = VersionCalculator.calculateNextSemanticVersion(currentVersion);

      expect(nextVersion.toString()).toBe('1.2.4');
    });

    test('increments minor version when specified', () => {
      const currentVersion = new Version('1.2.3');
      const nextVersion = VersionCalculator.calculateNextSemanticVersion(currentVersion, 'minor');

      expect(nextVersion.toString()).toBe('1.3.0');
    });

    test('increments major version when specified', () => {
      const currentVersion = new Version('1.2.3');
      const nextVersion = VersionCalculator.calculateNextSemanticVersion(currentVersion, 'major');

      expect(nextVersion.toString()).toBe('2.0.0');
    });

    test('throws error for invalid increment type', () => {
      const currentVersion = new Version('1.2.3');

      expect(() => {
        VersionCalculator.calculateNextSemanticVersion(currentVersion, 'invalid' as any);
      }).toThrow('Invalid version increment type');
    });

    test('throws error for invalid version instance', () => {
      expect(() => {
        VersionCalculator.calculateNextSemanticVersion('1.2.3' as any);
      }).toThrow('currentVersion.incrementPatch is not a function');
    });
  });

  describe('determineVersionAction', () => {
    test('returns NEW_VERSION when version does not exist', () => {
      const currentMaxBuild = new BuildNumber(10);
      const result = VersionCalculator.determineVersionAction(null, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTION_TYPES.CREATE_NEW_VERSION);
      expect(result.buildNumber?.getValue()).toBe(11);
      expect(result.requiresVersionCreation).toBe(true);
    });

    test('returns INCREMENT_BUILD for editable version', () => {
      const version = new Version('1.0.0');
      const buildNumber = new BuildNumber(5);
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber,
        state: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });
      const currentMaxBuild = new BuildNumber(10);

      const result = VersionCalculator.determineVersionAction(appStoreVersion, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER);
      expect(result.buildNumber?.getValue()).toBe(11); // Uses currentMaxBuild + 1 as it's higher than 6
      expect(result.requiresVersionCreation).toBe(false);
    });

    test('returns INCREMENT_BUILD with fallback when version has no build', () => {
      const version = new Version('1.0.0');
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber: 0,
        state: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });
      const currentMaxBuild = new BuildNumber(10);

      const result = VersionCalculator.determineVersionAction(appStoreVersion, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER);
      expect(result.buildNumber?.getValue()).toBe(11);
    });

    test('returns INCREMENT_BUILD with correct build number when existing version has builds', () => {
      const version = new Version('1.0.0');
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber: 15,
        state: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });
      const currentMaxBuild = new BuildNumber(10);

      const result = VersionCalculator.determineVersionAction(appStoreVersion, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER);
      expect(result.buildNumber?.getValue()).toBe(16); // Should use existing version's build + 1
    });

    test('uses higher build number to avoid conflicts', () => {
      const version = new Version('1.0.0');
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber: 8,
        state: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });
      const currentMaxBuild = new BuildNumber(90);

      const result = VersionCalculator.determineVersionAction(appStoreVersion, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER);
      expect(result.buildNumber?.getValue()).toBe(91); // Should use currentMaxBuild + 1 because it's higher
    });

    test('throws error for non-editable version (READY_FOR_SALE)', () => {
      const version = new Version('1.0.0');
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber: 0,
        state: APP_STORE_STATES.READY_FOR_SALE,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });
      const currentMaxBuild = new BuildNumber(10);

      expect(() =>
        VersionCalculator.determineVersionAction(appStoreVersion, currentMaxBuild),
      ).toThrow(
        'Cannot add builds to version 1.0.0: This version is already live on the App Store',
      );
    });

    test('throws error for non-editable version (PENDING_CONTRACT)', () => {
      const version = new Version('1.0.0');
      const appStoreVersion = new AppStoreVersion({
        id: 'test-id',
        version,
        buildNumber: 0,
        state: APP_STORE_STATES.PENDING_CONTRACT,
        platform: 'IOS',
        createdDate: '2023-01-01',
      });
      const currentMaxBuild = new BuildNumber(10);

      expect(() =>
        VersionCalculator.determineVersionAction(appStoreVersion, currentMaxBuild),
      ).toThrow(
        'Cannot add builds to version 1.0.0: This version requires contract agreement. Resolve in App Store Connect or create a new version.',
      );
    });
  });

  describe('isValidVersionProgression', () => {
    test('returns true when next version is greater', () => {
      const currentVersion = new Version('1.0.0');
      const nextVersion = new Version('1.0.1');

      expect(VersionCalculator.isValidVersionProgression(currentVersion, nextVersion)).toBe(true);
    });

    test('returns false when next version is smaller', () => {
      const currentVersion = new Version('1.0.1');
      const nextVersion = new Version('1.0.0');

      expect(VersionCalculator.isValidVersionProgression(currentVersion, nextVersion)).toBe(false);
    });

    test('returns false when versions are equal', () => {
      const currentVersion = new Version('1.0.0');
      const nextVersion = new Version('1.0.0');

      expect(VersionCalculator.isValidVersionProgression(currentVersion, nextVersion)).toBe(false);
    });
  });
});
