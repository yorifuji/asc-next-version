const { determineNextVersionAndBuild } = require('../src/versioning');

jest.mock('@actions/core');

describe('determineNextVersionAndBuild', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockToken = 'mock-token';
  const mockAppId = 'mock-app-id';

  test('新しいバージョンが作成される場合', async () => {
    const liveVersion = '1.0.0';
    const liveMaxBuild = 10;
    const mockCallApi = jest.fn();

    // nextVersionが存在しない場合をモック
    mockCallApi.mockResolvedValueOnce({ data: [] });

    const result = await determineNextVersionAndBuild(liveVersion, liveMaxBuild, mockAppId, mockToken, mockCallApi);

    expect(result).toEqual({
      version: '1.0.1',
      buildNumber: 11,
      action: 'new_version',
    });
    expect(mockCallApi).toHaveBeenCalledWith(
      `https://api.appstoreconnect.apple.com/v1/apps/${mockAppId}/appStoreVersions?filter[versionString]=1.0.1`,
      mockToken
    );
  });

  test('既存のバージョンがあり、ビルドがインクリメントされる場合', async () => {
    const liveVersion = '1.0.0';
    const liveMaxBuild = 10;
    const mockCallApi = jest.fn();

    // nextVersionが存在し、状態がPREPARE_FOR_SUBMISSIONの場合をモック
    mockCallApi.mockResolvedValueOnce({
      data: [{
        attributes: { appStoreState: 'PREPARE_FOR_SUBMISSION' }
      }]
    });
    // preReleaseVersionsのモック
    mockCallApi.mockResolvedValueOnce({
      data: [{
        id: 'pre-release-id',
        attributes: { version: '1.0.1' }
      }]
    });
    // buildsのモック
    mockCallApi.mockResolvedValueOnce({
      data: [{
        attributes: { version: '20' }
      }]
    });

    const result = await determineNextVersionAndBuild(liveVersion, liveMaxBuild, mockAppId, mockToken, mockCallApi);

    expect(result).toEqual({
      version: '1.0.1',
      buildNumber: 21,
      action: 'increment_build',
    });
    expect(mockCallApi).toHaveBeenCalledWith(
      `https://api.appstoreconnect.apple.com/v1/apps/${mockAppId}/appStoreVersions?filter[versionString]=1.0.1`,
      mockToken
    );
    expect(mockCallApi).toHaveBeenCalledWith(
      `https://api.appstoreconnect.apple.com/v1/preReleaseVersions?filter[version]=1.0.1&filter[app]=${mockAppId}&limit=1`,
      mockToken
    );
    expect(mockCallApi).toHaveBeenCalledWith(
      `https://api.appstoreconnect.apple.com/v1/builds?filter[preReleaseVersion]=pre-release-id&sort=-version&limit=1`,
      mockToken
    );
  });

  test('既存のバージョンがあり、スキップされる場合', async () => {
    const liveVersion = '1.0.0';
    const liveMaxBuild = 10;
    const mockCallApi = jest.fn();

    // nextVersionが存在し、状態がREADY_FOR_SALEの場合をモック
    mockCallApi.mockResolvedValueOnce({
      data: [{
        attributes: { appStoreState: 'READY_FOR_SALE' }
      }]
    });

    const result = await determineNextVersionAndBuild(liveVersion, liveMaxBuild, mockAppId, mockToken, mockCallApi);

    expect(result).toEqual({
      version: undefined,
      buildNumber: undefined,
      action: 'skip',
    });
    expect(mockCallApi).toHaveBeenCalledWith(
      `https://api.appstoreconnect.apple.com/v1/apps/${mockAppId}/appStoreVersions?filter[versionString]=1.0.1`,
      mockToken
    );
  });
});
