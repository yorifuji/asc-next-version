import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppStoreConnectApiClient } from '../../../../src/infrastructure/api/appStoreConnectClient.js';
import { Application } from '../../../../src/domain/entities/app.js';
import { AppStoreVersion } from '../../../../src/domain/entities/appStoreVersion.js';
import { SemanticVersion } from '../../../../src/domain/valueObjects/version.js';
import { ApplicationBuildNumber } from '../../../../src/domain/valueObjects/buildNumber.js';
import { APP_STORE_STATES, PLATFORM_TYPES } from '../../../../src/shared/constants/index.js';
import type { ApiErrorResponse } from '../../../../src/shared/types/api.js';

type FetchCall = [
  URL,
  {
    headers?: Record<string, string>;
    method?: string;
    body?: string;
  },
];

describe('AppStoreConnectApiClient', () => {
  let mockJwtGenerator: {
    generateAuthToken: ReturnType<typeof vi.fn>;
    isTokenExpiringSoon: ReturnType<typeof vi.fn>;
  };
  let client: AppStoreConnectApiClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    mockJwtGenerator = {
      generateAuthToken: vi.fn().mockReturnValue('mock-jwt-token'),
      isTokenExpiringSoon: vi.fn().mockReturnValue(false),
    };

    client = new AppStoreConnectApiClient({ jwtGenerator: mockJwtGenerator });
  });

  describe('findApplicationByBundleId', () => {
    test('returns app when found', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          data: [
            {
              id: 'app-123',
              attributes: {
                bundleId: 'com.example.app',
                name: 'Example App',
                sku: 'EXAMPLE',
                primaryLocale: 'en-US',
              },
            },
          ],
        }),
      );

      const result = await client.findApplicationByBundleId('com.example.app');

      expect(result).toBeInstanceOf(Application);
      expect(result.bundleId).toBe('com.example.app');

      const [url, options] = fetchMock.mock.calls[0] as FetchCall;
      expect(url.pathname).toBe('/v1/apps');
      expect(url.searchParams.get('filter[bundleId]')).toBe('com.example.app');
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      });
    });

    test('throws error when no app found with empty array', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ data: [] }));

      await expect(client.findApplicationByBundleId('com.notfound.app')).rejects.toThrow(
        'No app found with bundle ID: com.notfound.app',
      );
    });

    test('throws error when no app found with null data', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ data: null }));

      await expect(client.findApplicationByBundleId('com.notfound.app')).rejects.toThrow(
        'No app found with bundle ID: com.notfound.app',
      );
    });

    test('refreshes token when expiring', async () => {
      mockJwtGenerator.isTokenExpiringSoon.mockReturnValue(true);
      mockJwtGenerator.generateAuthToken.mockReturnValue('new-jwt-token');

      fetchMock.mockResolvedValue(
        createMockResponse({
          data: [
            {
              id: 'app-123',
              attributes: {
                bundleId: 'com.example.app',
                name: 'Example App',
                sku: 'EXAMPLE',
                primaryLocale: 'en-US',
              },
            },
          ],
        }),
      );

      await client.findApplicationByBundleId('com.example.app');

      expect(mockJwtGenerator.generateAuthToken).toHaveBeenCalledTimes(2);
      const [, options] = fetchMock.mock.calls[0] as FetchCall;
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer new-jwt-token',
      });
    });
  });

  describe('fetchAppStoreVersions', () => {
    test('returns array of versions with all filters', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          data: [
            {
              id: 'version-1',
              attributes: {
                versionString: '1.0.0',
                appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                platform: PLATFORM_TYPES.IOS,
                createdDate: '2024-01-01',
              },
            },
          ],
        }),
      );

      const result = await client.fetchAppStoreVersions('app-123', {
        state: APP_STORE_STATES.READY_FOR_SALE,
        version: '1.0.0',
        platform: PLATFORM_TYPES.IOS,
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AppStoreVersion);

      const [url] = fetchMock.mock.calls[0] as FetchCall;
      expect(url.pathname).toBe('/v1/apps/app-123/appStoreVersions');
      expect(url.searchParams.get('filter[appStoreState]')).toBe(APP_STORE_STATES.READY_FOR_SALE);
      expect(url.searchParams.get('filter[versionString]')).toBe('1.0.0');
      expect(url.searchParams.get('filter[platform]')).toBe(PLATFORM_TYPES.IOS);
      expect(url.searchParams.get('limit')).toBe('10');
    });

    test('handles single version response', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          data: {
            id: 'version-1',
            attributes: {
              versionString: '1.0.0',
              appStoreState: APP_STORE_STATES.READY_FOR_SALE,
              platform: PLATFORM_TYPES.IOS,
              createdDate: '2024-01-01',
            },
          },
        }),
      );

      const result = await client.fetchAppStoreVersions('app-123');

      expect(result).toHaveLength(1);
      expect(result[0].version.toString()).toBe('1.0.0');
    });
  });

  describe('fetchBuildNumberForVersion', () => {
    test('returns build number when build exists', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          data: {
            id: 'build-1',
            attributes: {
              version: '42',
            },
          },
        }),
      );

      const result = await client.fetchBuildNumberForVersion('version-123');

      expect(result).toBeInstanceOf(ApplicationBuildNumber);
      expect(result.getValue()).toBe(42);
    });

    test('returns 0 when no build exists', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ data: null }));

      const result = await client.fetchBuildNumberForVersion('version-123');

      expect(result.getValue()).toBe(0);
    });

    test('throws error for invalid build version format', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          data: {
            attributes: {
              version: 'invalid',
            },
          },
        }),
      );

      await expect(client.fetchBuildNumberForVersion('version-123')).rejects.toThrow(
        'Invalid build version: invalid',
      );
    });
  });

  describe('fetchBuilds', () => {
    test('returns empty array when no builds found', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ data: [] }));

      const result = await client.fetchBuilds('app-123');

      expect(result).toEqual([]);
    });

    test('returns builds with filters', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          data: [
            {
              id: 'build-1',
              attributes: {
                version: '10',
                uploadedDate: '2024-01-01',
                processingState: 'VALID',
              },
            },
          ],
        }),
      );

      const result = await client.fetchBuilds('app-123', {
        version: '10',
        preReleaseVersion: '1.0.0',
        limit: 5,
      });

      expect(result).toHaveLength(1);
      expect(result[0].version.getValue()).toBe(10);

      const [url] = fetchMock.mock.calls[0] as FetchCall;
      expect(url.pathname).toBe('/v1/builds');
      expect(url.searchParams.get('filter[app]')).toBe('app-123');
      expect(url.searchParams.get('sort')).toBe('-version');
      expect(url.searchParams.get('limit')).toBe('5');
      expect(url.searchParams.get('filter[version]')).toBe('10');
      expect(url.searchParams.get('filter[preReleaseVersion]')).toBe('1.0.0');
    });
  });

  describe('createNewAppStoreVersion', () => {
    test('creates new version successfully', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({
          data: {
            id: 'version-new',
            attributes: {
              versionString: '2.0.0',
              appStoreState: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
              platform: PLATFORM_TYPES.IOS,
              createdDate: '2024-01-01',
            },
          },
        }),
      );

      const version = new SemanticVersion('2.0.0');
      const result = await client.createNewAppStoreVersion('app-123', version, PLATFORM_TYPES.IOS);

      expect(result).toBeInstanceOf(AppStoreVersion);
      expect(result.version.toString()).toBe('2.0.0');

      const [url, options] = fetchMock.mock.calls[0] as FetchCall;
      expect(url.pathname).toBe('/v1/appStoreVersions');
      expect(options.method).toBe('POST');
      expect(options.body).toBe(
        JSON.stringify({
          data: {
            type: 'appStoreVersions',
            attributes: {
              platform: PLATFORM_TYPES.IOS,
              versionString: '2.0.0',
            },
            relationships: {
              app: {
                data: {
                  type: 'apps',
                  id: 'app-123',
                },
              },
            },
          },
        }),
      );
    });

    test('throws error when creation fails', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ data: null }));

      const version = new SemanticVersion('2.0.0');

      await expect(
        client.createNewAppStoreVersion('app-123', version, PLATFORM_TYPES.IOS),
      ).rejects.toThrow('Failed to create app store version');
    });
  });

  describe('error handling', () => {
    test('handles network error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(client.findApplicationByBundleId('com.example.app')).rejects.toMatchObject({
        message: 'Network error: Network error',
        statusCode: 0,
      });
    });

    test('handles API error with detailed response', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse(
          {
            errors: [
              {
                title: 'Not Found',
                detail: 'The requested resource was not found',
              },
            ],
          } as ApiErrorResponse,
          { ok: false, status: 404 },
        ),
      );

      await expect(client.findApplicationByBundleId('com.example.app')).rejects.toMatchObject({
        message: 'The requested resource was not found',
        statusCode: 404,
      });
    });

    test('handles API error without detail', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse(
          {
            errors: [
              {
                title: 'Internal Server Error',
              },
            ],
          } as ApiErrorResponse,
          { ok: false, status: 500 },
        ),
      );

      await expect(client.findApplicationByBundleId('com.example.app')).rejects.toMatchObject({
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });

    test('handles API error with empty errors array', async () => {
      fetchMock.mockResolvedValue(
        createMockResponse({ errors: [] } as ApiErrorResponse, { ok: false, status: 400 }),
      );

      await expect(client.findApplicationByBundleId('com.example.app')).rejects.toMatchObject({
        message: 'API request failed with status 400',
        statusCode: 400,
      });
    });
  });
});

function createMockResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}
