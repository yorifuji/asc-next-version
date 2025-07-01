const { determineNextVersionAndBuild } = require('../src/services/versioningService');

jest.mock('@actions/core');
jest.mock('../src/services/appStoreService');

const { getMaxBuildNumber } = require('../src/services/appStoreService');

describe('determineNextVersionAndBuild', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockToken = 'mock-token';
  const mockAppId = 'mock-app-id';

  test('新しいバージョンが作成される場合', async () => {
    const liveVersion = '1.0.0';
    const liveMaxBuild = 10;

    // nextVersionが存在しない場合をモック
    const appStoreService = require('../src/services/appStoreService');
    appStoreService.checkVersionExists = jest.fn().mockResolvedValueOnce(null);

    const result = await determineNextVersionAndBuild(
      liveVersion,
      liveMaxBuild,
      mockAppId,
      mockToken,
    );

    expect(result).toEqual({
      version: '1.0.1',
      buildNumber: 11,
      action: 'new_version',
    });
    expect(appStoreService.checkVersionExists).toHaveBeenCalledWith(mockAppId, '1.0.1', mockToken);
  });

  test('既存のバージョンがあり、ビルドがインクリメントされる場合', async () => {
    const liveVersion = '1.0.0';
    const liveMaxBuild = 10;

    // nextVersionが存在し、状態がPREPARE_FOR_SUBMISSIONの場合をモック
    const nextVersionInfo = {
      attributes: { appStoreState: 'PREPARE_FOR_SUBMISSION' },
      id: 'version-id',
    };

    const appStoreService = require('../src/services/appStoreService');
    appStoreService.checkVersionExists = jest.fn().mockResolvedValueOnce(nextVersionInfo);

    // getMaxBuildNumber のモック（既存バージョンの最大build番号として20を返す）
    getMaxBuildNumber.mockResolvedValueOnce(20);

    const result = await determineNextVersionAndBuild(
      liveVersion,
      liveMaxBuild,
      mockAppId,
      mockToken,
    );

    expect(result).toEqual({
      version: '1.0.1',
      buildNumber: 21,
      action: 'increment_build',
    });
    expect(appStoreService.checkVersionExists).toHaveBeenCalledWith(mockAppId, '1.0.1', mockToken);
    // getMaxBuildNumber が適切なパラメータで呼ばれることを確認
    expect(getMaxBuildNumber).toHaveBeenCalledWith(nextVersionInfo, mockAppId, mockToken);
  });

  test('既存のバージョンがあり、スキップされる場合', async () => {
    const liveVersion = '1.0.0';
    const liveMaxBuild = 10;

    // nextVersionが存在し、状態がREADY_FOR_SALEの場合をモック
    const appStoreService = require('../src/services/appStoreService');
    const nextVersionInfo = {
      attributes: { appStoreState: 'READY_FOR_SALE' },
    };
    appStoreService.checkVersionExists = jest.fn().mockResolvedValueOnce(nextVersionInfo);

    const result = await determineNextVersionAndBuild(
      liveVersion,
      liveMaxBuild,
      mockAppId,
      mockToken,
    );

    expect(result).toEqual({
      version: undefined,
      buildNumber: undefined,
      action: 'skip',
    });
    expect(appStoreService.checkVersionExists).toHaveBeenCalledWith(mockAppId, '1.0.1', mockToken);
  });
});
