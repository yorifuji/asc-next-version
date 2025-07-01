const { getMaxBuildNumber } = require('../src/services/appStoreService');

jest.mock('@actions/core');

describe('getMaxBuildNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAppId = 'mock-app-id';
  const mockToken = 'mock-token';

  test('direct endpoint成功時にbuild番号を返す', async () => {
    const mockVersionInfo = {
      id: 'version-id',
      attributes: { versionString: '1.0.0' },
    };

    // Mock the appStoreClient methods
    const appStoreClient = require('../src/clients/appStoreClient');
    appStoreClient.getBuildForVersion = jest.fn().mockResolvedValueOnce({
      data: { attributes: { version: '42' } },
    });

    const result = await getMaxBuildNumber(mockVersionInfo, mockAppId, mockToken);

    expect(result).toBe(42);
    expect(appStoreClient.getBuildForVersion).toHaveBeenCalledWith('version-id', mockToken);
  });

  test('direct endpoint失敗時のfallback処理', async () => {
    const mockVersionInfo = {
      id: 'version-id',
      attributes: { versionString: '1.0.0' },
    };

    const appStoreClient = require('../src/clients/appStoreClient');

    // Direct endpoint失敗
    appStoreClient.getBuildForVersion = jest
      .fn()
      .mockRejectedValueOnce(new Error('Direct endpoint failed'));

    // preReleaseVersion成功
    appStoreClient.getPreReleaseVersions = jest.fn().mockResolvedValueOnce({
      data: [{ id: 'pre-release-id' }],
    });

    // builds成功
    appStoreClient.getBuilds = jest.fn().mockResolvedValueOnce({
      data: [{ attributes: { version: '25' } }],
    });

    const result = await getMaxBuildNumber(mockVersionInfo, mockAppId, mockToken);

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

    const appStoreClient = require('../src/clients/appStoreClient');
    appStoreClient.getBuildForVersion = jest.fn().mockRejectedValue(new Error('API failed'));
    appStoreClient.getPreReleaseVersions = jest.fn().mockRejectedValue(new Error('API failed'));
    appStoreClient.getBuilds = jest.fn().mockRejectedValue(new Error('API failed'));

    const result = await getMaxBuildNumber(mockVersionInfo, mockAppId, mockToken);

    expect(result).toBe(0);
  });

  test('versionInfoがnullの場合に0を返す', async () => {
    const mockCallApi = jest.fn();

    const result = await getMaxBuildNumber(null, mockAppId, mockToken);

    expect(result).toBe(0);
    expect(mockCallApi).not.toHaveBeenCalled();
  });
});
