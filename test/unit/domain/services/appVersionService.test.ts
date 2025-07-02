import { describe, expect, test, vi } from 'vitest';
import { AppVersionService } from '../../../../src/domain/services/appVersionService.js';
import { AppStoreVersion } from '../../../../src/domain/entities/appStoreVersion.js';
import { Version } from '../../../../src/domain/valueObjects/version.js';
import { BuildNumber } from '../../../../src/domain/valueObjects/buildNumber.js';
import { APP_STORE_STATES } from '../../../../src/shared/constants/index.js';
import type { AppStoreConnectClient } from '../../../../src/infrastructure/api/appStoreConnectClient.js';

describe('AppVersionService', () => {
  const createMockClient = (): AppStoreConnectClient =>
    ({
      getAppStoreVersions: vi.fn(),
      getBuildForVersion: vi.fn(),
      getBuilds: vi.fn(),
      findApp: vi.fn(),
      createAppStoreVersion: vi.fn(),
      getPreReleaseVersions: vi.fn(),
    }) as any;

  const createMockVersion = (
    versionString: string,
    state: string,
    buildNumber?: number,
  ): AppStoreVersion => {
    const version = new AppStoreVersion({
      id: `version-${versionString}`,
      version: new Version(versionString),
      buildNumber: buildNumber || 0,
      state,
      platform: 'IOS',
      createdDate: '2023-01-01',
    });
    return version;
  };

  describe('getLiveVersion', () => {
    test('returns the latest READY_FOR_SALE version', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [
        createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE),
        createMockVersion('1.1.0', APP_STORE_STATES.READY_FOR_SALE),
        createMockVersion('1.2.0', APP_STORE_STATES.PREPARE_FOR_SUBMISSION),
      ];

      vi.mocked(mockClient.getAppStoreVersions).mockResolvedValue(mockVersions);
      vi.mocked(mockClient.getBuildForVersion).mockResolvedValue(new BuildNumber(10));

      const result = await service.getLiveVersion('app-id');

      expect(result.version.toString()).toBe('1.1.0');
      expect(result.buildNumber?.getValue()).toBe(10);
    });

    test('throws error when no live version exists', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      vi.mocked(mockClient.getAppStoreVersions).mockResolvedValue([]);

      await expect(service.getLiveVersion('app-id')).rejects.toThrow('No live version found');
    });

    test('filters out non-READY_FOR_SALE versions', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [
        createMockVersion('1.0.0', APP_STORE_STATES.PREPARE_FOR_SUBMISSION),
        createMockVersion('1.1.0', APP_STORE_STATES.IN_REVIEW),
      ];

      vi.mocked(mockClient.getAppStoreVersions).mockResolvedValue(mockVersions);

      await expect(service.getLiveVersion('app-id')).rejects.toThrow('No live version found');
    });
  });

  describe('getMaxBuildNumber', () => {
    test('returns build number from version if available', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const version = createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE, 42);

      const result = await service.getMaxBuildNumber(version, 'app-id');

      expect(result.getValue()).toBe(42);
      expect(mockClient.getBuilds).not.toHaveBeenCalled();
    });

    test('falls back to search builds when version has no build number', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const version = createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE);
      const mockBuild = {
        id: 'build-1',
        version: new BuildNumber(25),
        uploadedDate: '2023-01-01',
        processingState: 'PROCESSED',
      };

      vi.mocked(mockClient.getBuilds).mockResolvedValue([mockBuild]);

      const result = await service.getMaxBuildNumber(version, 'app-id');

      expect(result.getValue()).toBe(25);
      expect(mockClient.getBuilds).toHaveBeenCalledWith('app-id', {
        version: '1.0.0',
        limit: 1,
      });
    });

    test('returns 0 when no builds found', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const version = createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE);

      vi.mocked(mockClient.getBuilds).mockResolvedValue([]);

      const result = await service.getMaxBuildNumber(version, 'app-id');

      expect(result.getValue()).toBe(0);
    });
  });

  describe('findVersion', () => {
    test('returns exact version match', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [
        createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE),
        createMockVersion('1.0.1', APP_STORE_STATES.PREPARE_FOR_SUBMISSION),
      ];

      vi.mocked(mockClient.getAppStoreVersions).mockResolvedValue(mockVersions);

      const result = await service.findVersion('app-id', '1.0.1');

      expect(result?.version.toString()).toBe('1.0.1');
      expect(result?.buildNumber?.getValue()).toBe(0);
    });

    test('returns null when no match found', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE)];

      vi.mocked(mockClient.getAppStoreVersions).mockResolvedValue(mockVersions);

      const result = await service.findVersion('app-id', '1.0.1');

      expect(result).toBeNull();
    });

    test('returns null when no versions found', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      vi.mocked(mockClient.getAppStoreVersions).mockResolvedValue([]);

      const result = await service.findVersion('app-id', '1.0.0');

      expect(result).toBeNull();
    });
  });
});
