import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import type { AxiosError } from 'axios';
import { AppStoreConnectApiClient } from '../../../../src/infrastructure/api/appStoreConnectClient.js';
import { Application } from '../../../../src/domain/entities/app.js';
import { AppStoreVersion } from '../../../../src/domain/entities/appStoreVersion.js';
import { SemanticVersion } from '../../../../src/domain/valueObjects/version.js';
import { ApplicationBuildNumber } from '../../../../src/domain/valueObjects/buildNumber.js';
import { APP_STORE_STATES, PLATFORM_TYPES } from '../../../../src/shared/constants/index.js';
import type { ApiErrorResponse } from '../../../../src/shared/types/api.js';

// Mock axios
vi.mock('axios');

describe('AppStoreConnectApiClient', () => {
  let mockHttpClient: any;
  let mockJwtGenerator: any;
  let client: AppStoreConnectApiClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock HTTP client
    mockHttpClient = {
      defaults: { headers: { common: {} } },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(axios.create).mockReturnValue(mockHttpClient);

    // Create mock JWT generator
    mockJwtGenerator = {
      generateAuthToken: vi.fn().mockReturnValue('mock-jwt-token'),
      isTokenExpiringSoon: vi.fn().mockReturnValue(false),
    };

    client = new AppStoreConnectApiClient({ jwtGenerator: mockJwtGenerator });
  });

  describe('findApplicationByBundleId', () => {
    test('returns app when found', async () => {
      const mockResponse = {
        data: {
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
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await client.findApplicationByBundleId('com.example.app');

      expect(result).toBeInstanceOf(Application);
      expect(result.bundleId).toBe('com.example.app');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/apps', {
        params: { 'filter[bundleId]': 'com.example.app' },
      });
    });

    test('throws error when no app found with empty array', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { data: [] } });

      await expect(client.findApplicationByBundleId('com.notfound.app')).rejects.toThrow(
        'No app found with bundle ID: com.notfound.app',
      );
    });

    test('throws error when no app found with null data', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { data: null } });

      await expect(client.findApplicationByBundleId('com.notfound.app')).rejects.toThrow(
        'No app found with bundle ID: com.notfound.app',
      );
    });

    test('refreshes token when expiring', async () => {
      mockJwtGenerator.isTokenExpiringSoon.mockReturnValue(true);
      mockJwtGenerator.generateAuthToken.mockReturnValue('new-jwt-token');

      const mockResponse = {
        data: {
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
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      await client.findApplicationByBundleId('com.example.app');

      expect(mockJwtGenerator.generateAuthToken).toHaveBeenCalledTimes(2); // Initial + refresh
      expect(mockHttpClient.defaults.headers.common['Authorization']).toBe('Bearer new-jwt-token');
    });
  });

  describe('fetchAppStoreVersions', () => {
    test('returns array of versions with all filters', async () => {
      const mockResponse = {
        data: {
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
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await client.fetchAppStoreVersions('app-123', {
        state: APP_STORE_STATES.READY_FOR_SALE,
        version: '1.0.0',
        platform: PLATFORM_TYPES.IOS,
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AppStoreVersion);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/apps/app-123/appStoreVersions', {
        params: {
          'filter[appStoreState]': APP_STORE_STATES.READY_FOR_SALE,
          'filter[versionString]': '1.0.0',
          'filter[platform]': PLATFORM_TYPES.IOS,
          limit: 10,
        },
      });
    });

    test('handles single version response', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'version-1',
            attributes: {
              versionString: '1.0.0',
              appStoreState: APP_STORE_STATES.READY_FOR_SALE,
              platform: PLATFORM_TYPES.IOS,
              createdDate: '2024-01-01',
            },
          },
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await client.fetchAppStoreVersions('app-123');

      expect(result).toHaveLength(1);
      expect(result[0].version.toString()).toBe('1.0.0');
    });
  });

  describe('fetchBuildNumberForVersion', () => {
    test('returns build number when build exists', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'build-1',
            attributes: {
              version: '42',
            },
          },
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await client.fetchBuildNumberForVersion('version-123');

      expect(result).toBeInstanceOf(ApplicationBuildNumber);
      expect(result.getValue()).toBe(42);
    });

    test('returns 0 when no build exists', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { data: null } });

      const result = await client.fetchBuildNumberForVersion('version-123');

      expect(result.getValue()).toBe(0);
    });

    test('throws error for invalid build version format', async () => {
      const mockResponse = {
        data: {
          data: {
            attributes: {
              version: 'invalid',
            },
          },
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      await expect(client.fetchBuildNumberForVersion('version-123')).rejects.toThrow(
        'Invalid build version: invalid',
      );
    });
  });

  describe('fetchBuilds', () => {
    test('returns empty array when no builds found', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { data: [] } });

      const result = await client.fetchBuilds('app-123');

      expect(result).toEqual([]);
    });

    test('returns builds with filters', async () => {
      const mockResponse = {
        data: {
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
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await client.fetchBuilds('app-123', {
        version: '10',
        preReleaseVersion: '1.0.0',
        limit: 5,
      });

      expect(result).toHaveLength(1);
      expect(result[0].version.getValue()).toBe(10);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/builds', {
        params: {
          'filter[app]': 'app-123',
          sort: '-version',
          limit: 5,
          'filter[version]': '10',
          'filter[preReleaseVersion]': '1.0.0',
        },
      });
    });
  });

  describe('createNewAppStoreVersion', () => {
    test('creates new version successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'version-new',
            attributes: {
              versionString: '2.0.0',
              appStoreState: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
              platform: PLATFORM_TYPES.IOS,
              createdDate: '2024-01-01',
            },
          },
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const version = new SemanticVersion('2.0.0');
      const result = await client.createNewAppStoreVersion('app-123', version, PLATFORM_TYPES.IOS);

      expect(result).toBeInstanceOf(AppStoreVersion);
      expect(result.version.toString()).toBe('2.0.0');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/appStoreVersions', {
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
      });
    });

    test('throws error when creation fails', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { data: null } });

      const version = new SemanticVersion('2.0.0');

      await expect(
        client.createNewAppStoreVersion('app-123', version, PLATFORM_TYPES.IOS),
      ).rejects.toThrow('Failed to create app store version');
    });
  });

  describe('error handling', () => {
    test('handles network error', async () => {
      const networkError = new Error('Network error') as AxiosError;
      networkError.response = undefined;

      // Setup interceptor to capture error handler
      let errorHandler: any;
      mockHttpClient.interceptors.response.use.mockImplementation((success, error) => {
        errorHandler = error;
      });

      // Create client to setup interceptors
      new AppStoreConnectApiClient({ jwtGenerator: mockJwtGenerator });

      // Test error handler
      try {
        await errorHandler(networkError);
      } catch (error: any) {
        expect(error.message).toBe('Network error: Network error');
        expect(error.statusCode).toBe(0);
      }
    });

    test('handles API error with detailed response', async () => {
      const apiError = {
        response: {
          status: 404,
          data: {
            errors: [
              {
                title: 'Not Found',
                detail: 'The requested resource was not found',
              },
            ],
          } as ApiErrorResponse,
        },
      } as AxiosError<ApiErrorResponse>;

      // Setup interceptor to capture error handler
      let errorHandler: any;
      mockHttpClient.interceptors.response.use.mockImplementation((success, error) => {
        errorHandler = error;
      });

      // Create client to setup interceptors
      new AppStoreConnectApiClient({ jwtGenerator: mockJwtGenerator });

      // Test error handler
      try {
        await errorHandler(apiError);
      } catch (error: any) {
        expect(error.message).toBe('The requested resource was not found');
        expect(error.statusCode).toBe(404);
      }
    });

    test('handles API error without detail', async () => {
      const apiError = {
        response: {
          status: 500,
          data: {
            errors: [
              {
                title: 'Internal Server Error',
              },
            ],
          } as ApiErrorResponse,
        },
      } as AxiosError<ApiErrorResponse>;

      // Setup interceptor to capture error handler
      let errorHandler: any;
      mockHttpClient.interceptors.response.use.mockImplementation((success, error) => {
        errorHandler = error;
      });

      // Create client to setup interceptors
      new AppStoreConnectApiClient({ jwtGenerator: mockJwtGenerator });

      // Test error handler
      try {
        await errorHandler(apiError);
      } catch (error: any) {
        expect(error.message).toBe('Internal Server Error');
        expect(error.statusCode).toBe(500);
      }
    });

    test('handles API error with empty errors array', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            errors: [],
          } as ApiErrorResponse,
        },
      } as AxiosError<ApiErrorResponse>;

      // Setup interceptor to capture error handler
      let errorHandler: any;
      mockHttpClient.interceptors.response.use.mockImplementation((success, error) => {
        errorHandler = error;
      });

      // Create client to setup interceptors
      new AppStoreConnectApiClient({ jwtGenerator: mockJwtGenerator });

      // Test error handler
      try {
        await errorHandler(apiError);
      } catch (error: any) {
        expect(error.message).toBe('API request failed with status 400');
        expect(error.statusCode).toBe(400);
      }
    });
  });
});
