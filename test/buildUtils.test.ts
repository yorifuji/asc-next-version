import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMaxBuildNumber } from '../src/services/appStoreService.js';
import * as appStoreClient from '../src/clients/appStoreClient.js';

vi.mock('@actions/core');
vi.mock('../src/clients/appStoreClient.js');

describe('getMaxBuildNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAppId = 'mock-app-id';
  const mockToken = 'mock-token';

  test('direct endpoint成功時にbuild番号を返す', async () => {
    const mockVersionInfo = {
      id: 'version-id',
      attributes: { versionString: '1.0.0' },
    };

    vi.mocked(appStoreClient.getBuildForVersion).mockResolvedValueOnce({
      data: { attributes: { version: '42' } },
    } as any);

    const result = await getMaxBuildNumber(mockVersionInfo as any, mockAppId, mockToken);

    expect(result).toBe(42);
    expect(appStoreClient.getBuildForVersion).toHaveBeenCalledWith('version-id', mockToken);
  });

  test('direct endpoint失敗時のfallback処理', async () => {
    const mockVersionInfo = {
      id: 'version-id',
      attributes: { versionString: '1.0.0' },
    };

    // Direct endpoint失敗
    vi.mocked(appStoreClient.getBuildForVersion).mockRejectedValueOnce(
      new Error('Direct endpoint failed'),
    );

    // preReleaseVersion成功
    vi.mocked(appStoreClient.getPreReleaseVersions).mockResolvedValueOnce({
      data: [{ id: 'pre-release-id' }],
    } as any);

    // builds成功
    vi.mocked(appStoreClient.getBuilds).mockResolvedValueOnce({
      data: [{ attributes: { version: '25' } }],
    } as any);

    const result = await getMaxBuildNumber(mockVersionInfo as any, mockAppId, mockToken);

    expect(result).toBe(25);
    expect(appStoreClient.getBuildForVersion).toHaveBeenCalledTimes(1);
    expect(appStoreClient.getPreReleaseVersions).toHaveBeenCalledTimes(1);
    expect(appStoreClient.getBuilds).toHaveBeenCalledTimes(1);
  });

  test('全てのmethod失敗時に0を返す', async () => {
    const mockVersionInfo = {
      id: 'version-id',
      attributes: { versionString: '1.0.0' },
    };

    vi.mocked(appStoreClient.getBuildForVersion).mockRejectedValue(new Error('API failed'));
    vi.mocked(appStoreClient.getPreReleaseVersions).mockRejectedValue(new Error('API failed'));
    vi.mocked(appStoreClient.getBuilds).mockRejectedValue(new Error('API failed'));

    const result = await getMaxBuildNumber(mockVersionInfo as any, mockAppId, mockToken);

    expect(result).toBe(0);
  });

  test('versionInfoがnullの場合に0を返す', async () => {
    const result = await getMaxBuildNumber(null as any, mockAppId, mockToken);

    expect(result).toBe(0);
    expect(appStoreClient.getBuildForVersion).not.toHaveBeenCalled();
  });
});
