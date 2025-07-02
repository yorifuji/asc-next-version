import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createAppStoreVersion, get } from '../src/clients/appStoreClient.js';
import * as core from '@actions/core';
import axios from 'axios';

vi.mock('@actions/core');
vi.mock('axios');

describe('get', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('API呼び出しが成功し、データを返すこと', async () => {
    const url = 'https://api.example.com/data';
    const token = 'test-token';
    const mockResponseData = { data: 'test' };

    vi.mocked(axios.get).mockResolvedValue({ data: mockResponseData } as any);

    const result = await get(url, token);

    expect(axios.get).toHaveBeenCalledWith(url, {
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

    vi.mocked(axios.get).mockRejectedValue(new Error(errorMessage));

    await expect(get(url, token)).rejects.toThrow(errorMessage);
    expect(core.error).toHaveBeenCalledWith(`API GET failed: ${errorMessage}`);
  });
});

describe('createAppStoreVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('App Store Versionが正しく作成されること', async () => {
    const appId = 'test-app-id';
    const versionString = '1.0.1';
    const platform = 'IOS';
    const token = 'test-token';
    const mockResponseData = { id: 'new-version-id' };

    vi.mocked(axios.post).mockResolvedValue({ data: mockResponseData } as any);

    const result = await createAppStoreVersion(appId, versionString, platform, token);

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.appstoreconnect.apple.com/v1/appStoreVersions',
      {
        data: {
          type: 'appStoreVersions',
          attributes: {
            platform,
            versionString,
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
    expect(core.info).toHaveBeenCalledWith(
      `Successfully created App Store Version ${versionString} for app ${appId}`,
    );
  });

  test('App Store Versionの作成が失敗し、エラーをスローすること', async () => {
    const appId = 'test-app-id';
    const versionString = '1.0.1';
    const platform = 'IOS';
    const token = 'test-token';
    const errorMessage = 'API Error';

    vi.mocked(axios.post).mockRejectedValue(new Error(errorMessage));

    await expect(createAppStoreVersion(appId, versionString, platform, token)).rejects.toThrow(
      errorMessage,
    );
    expect(core.error).toHaveBeenCalledWith(`API POST failed: ${errorMessage}`);
  });
});
