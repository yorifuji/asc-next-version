const { get, createAppStoreVersion } = require('../src/clients/appStoreClient');

jest.mock('@actions/core');
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(), // postメソッドもモックする
}));

describe('get', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('API呼び出しが成功し、データを返すこと', async () => {
    const url = 'https://api.example.com/data';
    const token = 'test-token';
    const mockResponseData = { data: 'test' };

    require('axios').get.mockResolvedValue({ data: mockResponseData });

    const result = await get(url, token);

    expect(require('axios').get).toHaveBeenCalledWith(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(result).toBe(mockResponseData);
  });

  test('API呼び出しが失敗し、エラーをスローすること', async () => {
    const url = 'https://api.example.com/error';
    const token = 'test-token';
    const errorMessage = 'Network Error';

    require('axios').get.mockRejectedValue(new Error(errorMessage));

    await expect(get(url, token)).rejects.toThrow(errorMessage);
    expect(require('@actions/core').error).toHaveBeenCalledWith(`API GET failed: ${errorMessage}`);
  });
});

describe('createAppStoreVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('App Store Versionが正しく作成されること', async () => {
    const appId = 'test-app-id';
    const versionString = '1.0.1';
    const platform = 'IOS';
    const token = 'test-token';
    const mockResponseData = { id: 'new-version-id' };

    require('axios').post.mockResolvedValue({ data: mockResponseData });

    const result = await createAppStoreVersion(appId, versionString, platform, token);

    expect(require('axios').post).toHaveBeenCalledWith(
      `https://api.appstoreconnect.apple.com/v1/appStoreVersions`,
      {
        data: {
          type: 'appStoreVersions',
          attributes: {
            platform: platform,
            versionString: versionString,
          },
          relationships: {
            app: {
              data: {
                type: 'apps',
                id: appId,
              },
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    expect(result).toBe(mockResponseData);
    expect(require('@actions/core').info).toHaveBeenCalledWith(
      `Successfully created App Store Version ${versionString} for app ${appId}`,
    );
  });

  test('App Store Versionの作成が失敗し、エラーをスローすること', async () => {
    const appId = 'test-app-id';
    const versionString = '1.0.1';
    const platform = 'IOS';
    const token = 'test-token';
    const errorMessage = 'API Error';

    require('axios').post.mockRejectedValue(new Error(errorMessage));

    await expect(createAppStoreVersion(appId, versionString, platform, token)).rejects.toThrow(
      errorMessage,
    );
    expect(require('@actions/core').error).toHaveBeenCalledWith(`API POST failed: ${errorMessage}`);
  });
});
