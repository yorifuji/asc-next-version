import { beforeEach, describe, expect, test, vi } from 'vitest';
import { JwtGenerator } from '../../src/infrastructure/auth/jwtGenerator.js';
import { AppStoreConnectClient } from '../../src/infrastructure/api/appStoreConnectClient.js';
import { DetermineNextVersionUseCase } from '../../src/application/usecases/determineNextVersionUseCase.js';
import { APP_STORE_STATES, PLATFORMS, VERSION_ACTIONS } from '../../src/shared/constants/index.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';

// Mock modules
vi.mock('axios');
vi.mock('jsonwebtoken');

describe('DetermineNextVersion Integration Test', () => {
  let mockHttpClient: any;
  let jwtGenerator: JwtGenerator;
  let appStoreClient: AppStoreConnectClient;
  let useCase: DetermineNextVersionUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock JWT operations
    vi.mocked(jwt.sign).mockReturnValue('mocked-jwt-token' as any);
    vi.mocked(jwt.decode).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 } as any);

    // Create mock HTTP client instance
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

    // Setup services
    jwtGenerator = new JwtGenerator('issuer-123', 'key-123', 'fake-private-key');
    appStoreClient = new AppStoreConnectClient(jwtGenerator);
    useCase = new DetermineNextVersionUseCase(appStoreClient);
  });

  describe('新しいバージョンを作成するシナリオ', () => {
    test('ライブバージョン1.0.0から1.0.1を作成', async () => {
      const bundleId = 'com.example.app';

      // Mock API responses in order
      mockHttpClient.get
        .mockResolvedValueOnce({
          // Find app
          data: {
            data: [
              {
                id: 'app-123',
                attributes: {
                  bundleId,
                  name: 'Example App',
                  sku: 'EXAMPLE123',
                  primaryLocale: 'en-US',
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get live version
          data: {
            data: [
              {
                id: 'version-100',
                attributes: {
                  versionString: '1.0.0',
                  appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                  platform: PLATFORMS.IOS,
                  createdDate: '2024-01-01',
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get build for version
          data: {
            data: {
              attributes: {
                version: '5',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          // Check if 1.0.1 exists
          data: {
            data: [],
          },
        });

      mockHttpClient.post.mockResolvedValueOnce({
        // Create new version
        data: {
          data: {
            id: 'version-101',
            attributes: {
              versionString: '1.0.1',
              appStoreState: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
              platform: PLATFORMS.IOS,
              createdDate: '2024-01-02',
            },
          },
        },
      });

      // Execute
      const result = await useCase.execute({
        bundleId,
        platform: PLATFORMS.IOS,
        createNewVersion: true,
      });

      // Assert
      expect(result).toMatchObject({
        app: {
          bundleId,
          name: 'Example App',
        },
        liveVersion: '1.0.0',
        liveBuildNumber: 5,
        version: '1.0.1',
        buildNumber: '6',
        action: VERSION_ACTIONS.NEW_VERSION,
        versionCreated: true,
      });
    });
  });

  describe('既存バージョンのビルド番号をインクリメントするシナリオ', () => {
    test('1.0.1が既に存在し、PREPARE_FOR_SUBMISSION状態の場合', async () => {
      const bundleId = 'com.example.app';

      mockHttpClient.get
        .mockResolvedValueOnce({
          // Find app
          data: {
            data: [
              {
                id: 'app-123',
                attributes: {
                  bundleId,
                  name: 'Example App',
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get live version
          data: {
            data: [
              {
                id: 'version-100',
                attributes: {
                  versionString: '1.0.0',
                  appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get build for live version
          data: {
            data: {
              attributes: {
                version: '5',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          // Check if 1.0.1 exists
          data: {
            data: [
              {
                id: 'version-101',
                attributes: {
                  versionString: '1.0.1',
                  appStoreState: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get builds for 1.0.1
          data: {
            data: [
              {
                id: 'build-107',
                attributes: {
                  version: '7',
                  uploadedDate: '2024-01-03',
                  processingState: 'VALID',
                },
              },
            ],
          },
        });

      // Execute
      const result = await useCase.execute({
        bundleId,
        platform: PLATFORMS.IOS,
        createNewVersion: false,
      });

      // Assert
      expect(result).toMatchObject({
        version: '1.0.1',
        buildNumber: '8',
        action: VERSION_ACTIONS.INCREMENT_BUILD,
        versionCreated: false,
      });
    });
  });

  describe('スキップするシナリオ', () => {
    test('1.0.1が既にREADY_FOR_SALE状態の場合', async () => {
      const bundleId = 'com.example.app';

      mockHttpClient.get
        .mockResolvedValueOnce({
          // Find app
          data: {
            data: [
              {
                id: 'app-123',
                attributes: {
                  bundleId,
                  name: 'Example App',
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get live version
          data: {
            data: [
              {
                id: 'version-100',
                attributes: {
                  versionString: '1.0.0',
                  appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get build for live version
          data: {
            data: {
              attributes: {
                version: '5',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          // Check if 1.0.1 exists
          data: {
            data: [
              {
                id: 'version-101',
                attributes: {
                  versionString: '1.0.1',
                  appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get build for 1.0.1
          data: {
            data: {
              attributes: {
                version: '8',
              },
            },
          },
        });

      // Execute
      const result = await useCase.execute({
        bundleId,
        platform: PLATFORMS.IOS,
        createNewVersion: false,
      });

      // Assert
      expect(result).toMatchObject({
        version: '',
        buildNumber: '',
        action: VERSION_ACTIONS.SKIP,
        versionCreated: false,
        skipReason: expect.stringContaining('READY_FOR_SALE'),
      });
    });
  });

  describe('エラーケース', () => {
    test('アプリが見つからない場合', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          data: [],
        },
      });

      await expect(
        useCase.execute({
          bundleId: 'com.notfound.app',
          platform: PLATFORMS.IOS,
          createNewVersion: false,
        }),
      ).rejects.toThrow('No app found with bundle ID: com.notfound.app');
    });

    test('ライブバージョンが存在しない場合', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({
          // Find app
          data: {
            data: [
              {
                id: 'app-123',
                attributes: {
                  bundleId: 'com.example.app',
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // No live version
          data: {
            data: [],
          },
        });

      await expect(
        useCase.execute({
          bundleId: 'com.example.app',
          platform: PLATFORMS.IOS,
          createNewVersion: false,
        }),
      ).rejects.toThrow('No live version found for app');
    });
  });

  describe('APIが複数のバージョンを返すシナリオ', () => {
    test('部分一致で複数のバージョンが返される場合、正確なマッチングが行われる', async () => {
      const bundleId = 'com.example.app';

      mockHttpClient.get
        .mockResolvedValueOnce({
          // Find app
          data: {
            data: [
              {
                id: 'app-123',
                attributes: {
                  bundleId,
                  name: 'Example App',
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get live version 1.0.24
          data: {
            data: [
              {
                id: 'version-124',
                attributes: {
                  versionString: '1.0.24',
                  appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Get build for live version
          data: {
            data: {
              attributes: {
                version: '86',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          // Check if 1.0.25 exists - API returns 1.0.24 due to partial matching
          data: {
            data: [
              {
                id: 'version-124',
                attributes: {
                  versionString: '1.0.24',
                  appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                },
              },
              {
                id: 'version-102',
                attributes: {
                  versionString: '1.0.2',
                  appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                },
              },
            ],
          },
        });

      mockHttpClient.post.mockResolvedValueOnce({
        // Create new version
        data: {
          data: {
            id: 'version-125',
            attributes: {
              versionString: '1.0.25',
              appStoreState: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
            },
          },
        },
      });

      // Execute
      const result = await useCase.execute({
        bundleId,
        platform: PLATFORMS.IOS,
        createNewVersion: true,
      });

      // Assert - 1.0.25が存在しないと判断され、新しいバージョンが作成される
      expect(result).toMatchObject({
        liveVersion: '1.0.24',
        liveBuildNumber: 86,
        version: '1.0.25',
        buildNumber: '87',
        action: VERSION_ACTIONS.NEW_VERSION,
        versionCreated: true,
      });
    });
  });
});
