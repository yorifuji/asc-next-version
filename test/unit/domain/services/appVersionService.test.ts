import { describe, expect, test, vi } from 'vitest';
import { AppVersionService } from '../../../../src/domain/services/appVersionService.js';
import { AppStoreVersion } from '../../../../src/domain/entities/appStoreVersion.js';
import { Version } from '../../../../src/domain/valueObjects/version.js';
import { BuildNumber } from '../../../../src/domain/valueObjects/buildNumber.js';
import { APP_STORE_STATES } from '../../../../src/shared/constants/index.js';
import type { AppStoreConnectApiClient } from '../../../../src/infrastructure/api/appStoreConnectClient.js';

describe('AppVersionService', () => {
  const createMockClient = (): AppStoreConnectApiClient =>
    ({
      fetchAppStoreVersions: vi.fn(),
      fetchBuildNumberForVersion: vi.fn(),
      fetchBuilds: vi.fn(),
      findApplicationByBundleId: vi.fn(),
      createNewAppStoreVersion: vi.fn(),
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

  describe('fetchLiveVersion', () => {
    test('returns the latest READY_FOR_SALE version', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [
        createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE),
        createMockVersion('1.1.0', APP_STORE_STATES.READY_FOR_SALE),
        createMockVersion('1.2.0', APP_STORE_STATES.PREPARE_FOR_SUBMISSION),
      ];

      vi.mocked(mockClient.fetchAppStoreVersions).mockResolvedValue(mockVersions);
      vi.mocked(mockClient.fetchBuildNumberForVersion).mockResolvedValue(new BuildNumber(10));

      const result = await service.fetchLiveVersion('app-id');

      expect(result.version.toString()).toBe('1.1.0');
      expect(result.buildNumber?.getValue()).toBe(10);
    });

    test('throws error when no live version exists', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      vi.mocked(mockClient.fetchAppStoreVersions).mockResolvedValue([]);

      await expect(service.fetchLiveVersion('app-id')).rejects.toThrow('No live version found');
    });

    test('filters out non-READY_FOR_SALE versions', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [
        createMockVersion('1.0.0', APP_STORE_STATES.PREPARE_FOR_SUBMISSION),
        createMockVersion('1.1.0', APP_STORE_STATES.IN_REVIEW),
      ];

      vi.mocked(mockClient.fetchAppStoreVersions).mockResolvedValue(mockVersions);

      await expect(service.fetchLiveVersion('app-id')).rejects.toThrow('No live version found');
    });

    test('throws error when READY_FOR_SALE version has no build', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE)];

      vi.mocked(mockClient.fetchAppStoreVersions).mockResolvedValue(mockVersions);
      vi.mocked(mockClient.fetchBuildNumberForVersion).mockResolvedValue(new BuildNumber(0));

      await expect(service.fetchLiveVersion('app-id')).rejects.toThrow(
        'READY_FOR_SALE version 1.0.0 has no associated build',
      );
    });
  });

  describe('findVersionByString', () => {
    test('returns exact version match', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [
        createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE),
        createMockVersion('1.0.1', APP_STORE_STATES.PREPARE_FOR_SUBMISSION),
      ];

      vi.mocked(mockClient.fetchAppStoreVersions).mockResolvedValue(mockVersions);

      const result = await service.findVersionByString('app-id', '1.0.1');

      expect(result?.version.toString()).toBe('1.0.1');
      expect(result?.buildNumber?.getValue()).toBe(0);
    });

    test('returns null when no match found', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockVersions = [createMockVersion('1.0.0', APP_STORE_STATES.READY_FOR_SALE)];

      vi.mocked(mockClient.fetchAppStoreVersions).mockResolvedValue(mockVersions);

      const result = await service.findVersionByString('app-id', '1.0.1');

      expect(result).toBeNull();
    });

    test('returns null when no versions found', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      vi.mocked(mockClient.fetchAppStoreVersions).mockResolvedValue([]);

      const result = await service.findVersionByString('app-id', '1.0.0');

      expect(result).toBeNull();
    });
  });

  describe('findMaximumBuildNumber', () => {
    test('returns maximum build number from all builds', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockBuilds = [
        { version: new BuildNumber(10) },
        { version: new BuildNumber(15) },
        { version: new BuildNumber(12) },
      ];

      vi.mocked(mockClient.fetchBuilds).mockResolvedValue(mockBuilds);

      const fallback = new BuildNumber(5);
      const result = await service.findMaximumBuildNumber('app-id', fallback);

      expect(result.getValue()).toBe(15);
    });

    test('returns fallback when no builds exist', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      vi.mocked(mockClient.fetchBuilds).mockResolvedValue([]);

      const fallback = new BuildNumber(10);
      const result = await service.findMaximumBuildNumber('app-id', fallback);

      expect(result.getValue()).toBe(10);
    });

    test('returns fallback when all builds are lower', async () => {
      const mockClient = createMockClient();
      const service = new AppVersionService(mockClient);

      const mockBuilds = [
        { version: new BuildNumber(5) },
        { version: new BuildNumber(3) },
        { version: new BuildNumber(7) },
      ];

      vi.mocked(mockClient.fetchBuilds).mockResolvedValue(mockBuilds);

      const fallback = new BuildNumber(10);
      const result = await service.findMaximumBuildNumber('app-id', fallback);

      expect(result.getValue()).toBe(10);
    });
  });
});
