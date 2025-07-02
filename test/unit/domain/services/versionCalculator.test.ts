import { describe, expect, test } from 'vitest';
import { VersionCalculator } from '../../../../src/domain/services/versionCalculator.js';
import { Version } from '../../../../src/domain/valueObjects/version.js';
import { BuildNumber } from '../../../../src/domain/valueObjects/buildNumber.js';
import { AppStoreVersion } from '../../../../src/domain/entities/appStoreVersion.js';
import { APP_STORE_STATES, VERSION_ACTIONS } from '../../../../src/shared/constants/index.js';

describe('VersionCalculator', () => {
  describe('calculateNextVersion', () => {
    test('increments patch version by default', () => {
      const currentVersion = new Version('1.2.3');
      const nextVersion = VersionCalculator.calculateNextVersion(currentVersion);

      expect(nextVersion.toString()).toBe('1.2.4');
    });

    test('increments minor version when specified', () => {
      const currentVersion = new Version('1.2.3');
      const nextVersion = VersionCalculator.calculateNextVersion(currentVersion, 'minor');

      expect(nextVersion.toString()).toBe('1.3.0');
    });

    test('increments major version when specified', () => {
      const currentVersion = new Version('1.2.3');
      const nextVersion = VersionCalculator.calculateNextVersion(currentVersion, 'major');

      expect(nextVersion.toString()).toBe('2.0.0');
    });

    test('throws error for invalid increment type', () => {
      const currentVersion = new Version('1.2.3');

      expect(() => {
        VersionCalculator.calculateNextVersion(currentVersion, 'invalid' as any);
      }).toThrow('Invalid increment type');
    });

    test('throws error for invalid version instance', () => {
      expect(() => {
        VersionCalculator.calculateNextVersion('1.2.3' as any);
      }).toThrow('Current version must be a Version instance');
    });
  });

  describe('determineAction', () => {
    test('returns NEW_VERSION when version does not exist', () => {
      const currentMaxBuild = new BuildNumber(10);
      const result = VersionCalculator.determineAction(null, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTIONS.NEW_VERSION);
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

      const result = VersionCalculator.determineAction(appStoreVersion, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTIONS.INCREMENT_BUILD);
      expect(result.buildNumber?.getValue()).toBe(6);
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

      const result = VersionCalculator.determineAction(appStoreVersion, currentMaxBuild);

      expect(result.action).toBe(VERSION_ACTIONS.INCREMENT_BUILD);
      expect(result.buildNumber?.getValue()).toBe(11);
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

      expect(() => VersionCalculator.determineAction(appStoreVersion, currentMaxBuild)).toThrow(
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

      expect(() => VersionCalculator.determineAction(appStoreVersion, currentMaxBuild)).toThrow(
        'Cannot add builds to version 1.0.0: This version is pending contract agreement',
      );
    });
  });

  describe('isValidVersionTransition', () => {
    test('returns true when next version is greater', () => {
      const currentVersion = new Version('1.0.0');
      const nextVersion = new Version('1.0.1');

      expect(VersionCalculator.isValidVersionTransition(currentVersion, nextVersion)).toBe(true);
    });

    test('returns false when next version is smaller', () => {
      const currentVersion = new Version('1.0.1');
      const nextVersion = new Version('1.0.0');

      expect(VersionCalculator.isValidVersionTransition(currentVersion, nextVersion)).toBe(false);
    });

    test('returns false when versions are equal', () => {
      const currentVersion = new Version('1.0.0');
      const nextVersion = new Version('1.0.0');

      expect(VersionCalculator.isValidVersionTransition(currentVersion, nextVersion)).toBe(false);
    });
  });
});
