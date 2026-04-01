import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppStoreConnectJwtService } from '../../src/infrastructure/auth/jwtGenerator.js';
import { AppStoreConnectApiClient } from '../../src/infrastructure/api/appStoreConnectClient.js';
import { NextVersionDeterminationUseCase } from '../../src/usecases/determineNextVersionUseCase.js';
import {
  APP_STORE_STATES,
  PLATFORM_TYPES,
  VERSION_ACTION_TYPES,
} from '../../src/shared/constants/index.js';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');

describe('DetermineNextVersion Integration Test', () => {
  let jwtService: AppStoreConnectJwtService;
  let apiClient: AppStoreConnectApiClient;
  let useCase: NextVersionDeterminationUseCase;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    vi.mocked(jwt.sign).mockReturnValue('mocked-jwt-token' as never);
    vi.mocked(jwt.decode).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 } as never);

    jwtService = new AppStoreConnectJwtService({
      issuerId: 'issuer-123',
      keyId: 'key-123',
      privateKey: 'fake-private-key',
    });
    apiClient = new AppStoreConnectApiClient({ jwtGenerator: jwtService });
    useCase = new NextVersionDeterminationUseCase({ appStoreConnectClient: apiClient });
  });

  describe('新しいバージョンを作成するシナリオ', () => {
    test('ライブバージョン1.0.0から1.0.1を作成', async () => {
      const bundleId = 'com.example.app';

      mockApiResponses([
        {
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
        {
          data: [
            {
              id: 'version-100',
              attributes: {
                versionString: '1.0.0',
                appStoreState: APP_STORE_STATES.READY_FOR_SALE,
                platform: PLATFORM_TYPES.IOS,
                createdDate: '2024-01-01',
              },
            },
          ],
        },
        { data: { attributes: { version: '5' } } },
        { data: [] },
        {
          data: [
            {
              id: 'build-5',
              attributes: {
                version: '5',
                uploadedDate: '2023-01-01',
                processingState: 'VALID',
              },
            },
          ],
        },
        {
          data: {
            id: 'version-101',
            attributes: {
              versionString: '1.0.1',
              appStoreState: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
              platform: PLATFORM_TYPES.IOS,
              createdDate: '2024-01-02',
            },
          },
        },
      ]);

      const result = await useCase.determineNextVersion({
        bundleId,
        platform: PLATFORM_TYPES.IOS,
        createNewVersion: true,
      });

      expect(result).toMatchObject({
        app: {
          bundleId,
          name: 'Example App',
        },
        liveVersion: '1.0.0',
        liveBuildNumber: 5,
        version: '1.0.1',
        buildNumber: '6',
        action: VERSION_ACTION_TYPES.CREATE_NEW_VERSION,
        versionCreated: true,
      });
    });
  });

  describe('既存バージョンのビルド番号をインクリメントするシナリオ', () => {
    test('1.0.1が既に存在し、PREPARE_FOR_SUBMISSION状態でビルドがある場合', async () => {
      const bundleId = 'com.example.app';

      mockApiResponses([
        { data: [{ id: 'app-123', attributes: { bundleId, name: 'Example App' } }] },
        {
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
        { data: { attributes: { version: '5' } } },
        {
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
        {
          data: [
            {
              id: 'build-7',
              attributes: {
                version: '7',
                uploadedDate: '2023-01-02',
                processingState: 'VALID',
              },
            },
            {
              id: 'build-5',
              attributes: {
                version: '5',
                uploadedDate: '2023-01-01',
                processingState: 'VALID',
              },
            },
          ],
        },
        { data: { attributes: { version: '7' } } },
      ]);

      const result = await useCase.determineNextVersion({
        bundleId,
        platform: PLATFORM_TYPES.IOS,
        createNewVersion: false,
      });

      expect(result).toMatchObject({
        version: '1.0.1',
        buildNumber: '8',
        action: VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER,
        versionCreated: false,
      });
    });

    test('1.0.1が既に存在するがビルドがまだない場合', async () => {
      const bundleId = 'com.example.app';

      mockApiResponses([
        { data: [{ id: 'app-123', attributes: { bundleId, name: 'Example App' } }] },
        {
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
        { data: { attributes: { version: '5' } } },
        {
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
        {
          data: [
            {
              id: 'build-5',
              attributes: {
                version: '5',
                uploadedDate: '2023-01-01',
                processingState: 'VALID',
              },
            },
          ],
        },
        { data: null },
      ]);

      const result = await useCase.determineNextVersion({
        bundleId,
        platform: PLATFORM_TYPES.IOS,
        createNewVersion: false,
      });

      expect(result).toMatchObject({
        version: '1.0.1',
        buildNumber: '6',
        action: VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER,
        versionCreated: false,
      });
    });
  });

  describe('エラーになるシナリオ（以前はスキップ）', () => {
    test('1.0.1が既にREADY_FOR_SALE状態の場合', async () => {
      const bundleId = 'com.example.app';

      mockApiResponses([
        { data: [{ id: 'app-123', attributes: { bundleId, name: 'Example App' } }] },
        {
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
        { data: { attributes: { version: '5' } } },
        {
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
        {
          data: [
            {
              id: 'build-5',
              attributes: {
                version: '5',
                uploadedDate: '2023-01-01',
                processingState: 'VALID',
              },
            },
          ],
        },
        { data: { attributes: { version: '0' } } },
      ]);

      await expect(
        useCase.determineNextVersion({
          bundleId,
          platform: PLATFORM_TYPES.IOS,
          createNewVersion: false,
        }),
      ).rejects.toThrow(
        'Cannot add builds to version 1.0.1: This version is already live on the App Store',
      );
    });

    test('1.0.1がPENDING_CONTRACT状態の場合', async () => {
      const bundleId = 'com.example.app';

      mockApiResponses([
        { data: [{ id: 'app-123', attributes: { bundleId, name: 'Example App' } }] },
        {
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
        { data: { attributes: { version: '5' } } },
        {
          data: [
            {
              id: 'version-101',
              attributes: {
                versionString: '1.0.1',
                appStoreState: APP_STORE_STATES.PENDING_CONTRACT,
              },
            },
          ],
        },
        {
          data: [
            {
              id: 'build-5',
              attributes: {
                version: '5',
                uploadedDate: '2023-01-01',
                processingState: 'VALID',
              },
            },
          ],
        },
        { data: { attributes: { version: '0' } } },
      ]);

      await expect(
        useCase.determineNextVersion({
          bundleId,
          platform: PLATFORM_TYPES.IOS,
          createNewVersion: false,
        }),
      ).rejects.toThrow(
        'Cannot add builds to version 1.0.1: This version requires contract agreement. Resolve in App Store Connect or create a new version.',
      );
    });
  });

  test('アップロード済みビルドを考慮して最大ビルド番号を決定する', async () => {
    const bundleId = 'com.example.app';

    mockApiResponses([
      { data: [{ id: 'app-123', attributes: { bundleId, name: 'Example App' } }] },
      {
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
      { data: { attributes: { version: '89' } } },
      {
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
      {
        data: [
          {
            id: 'build-90',
            attributes: {
              version: '90',
              uploadedDate: '2023-01-02',
              processingState: 'VALID',
            },
          },
          {
            id: 'build-89',
            attributes: {
              version: '89',
              uploadedDate: '2023-01-01',
              processingState: 'VALID',
            },
          },
        ],
      },
      { data: null },
    ]);

    const result = await useCase.determineNextVersion({
      bundleId,
      platform: PLATFORM_TYPES.IOS,
      createNewVersion: false,
    });

    expect(result).toMatchObject({
      version: '1.0.1',
      buildNumber: '91',
      action: VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER,
      versionCreated: false,
    });
  });

  describe('エラーケース', () => {
    test('アプリが見つからない場合', async () => {
      mockApiResponses([{ data: [] }]);

      await expect(
        useCase.determineNextVersion({
          bundleId: 'com.notfound.app',
          platform: PLATFORM_TYPES.IOS,
          createNewVersion: false,
        }),
      ).rejects.toThrow('No app found with bundle ID: com.notfound.app');
    });

    test('ライブバージョンが存在しない場合', async () => {
      mockApiResponses([
        { data: [{ id: 'app-123', attributes: { bundleId: 'com.example.app' } }] },
        { data: [] },
      ]);

      await expect(
        useCase.determineNextVersion({
          bundleId: 'com.example.app',
          platform: PLATFORM_TYPES.IOS,
          createNewVersion: false,
        }),
      ).rejects.toThrow('No live version found for app');
    });

    test('READY_FOR_SALEバージョンにビルドが関連付けられていない場合', async () => {
      mockApiResponses([
        { data: [{ id: 'app-123', attributes: { bundleId: 'com.example.app' } }] },
        {
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
        { data: null },
      ]);

      await expect(
        useCase.determineNextVersion({
          bundleId: 'com.example.app',
          platform: PLATFORM_TYPES.IOS,
          createNewVersion: false,
        }),
      ).rejects.toThrow('READY_FOR_SALE version 1.0.0 has no associated build');
    });
  });

  describe('APIが複数のバージョンを返すシナリオ', () => {
    test('部分一致で複数のバージョンが返される場合、正確なマッチングが行われる', async () => {
      const bundleId = 'com.example.app';

      mockApiResponses([
        { data: [{ id: 'app-123', attributes: { bundleId, name: 'Example App' } }] },
        {
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
        { data: { attributes: { version: '86' } } },
        {
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
        {
          data: [
            {
              id: 'build-86',
              attributes: {
                version: '86',
                uploadedDate: '2023-01-01',
                processingState: 'VALID',
              },
            },
          ],
        },
        {
          data: {
            id: 'version-125',
            attributes: {
              versionString: '1.0.25',
              appStoreState: APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
            },
          },
        },
      ]);

      const result = await useCase.determineNextVersion({
        bundleId,
        platform: PLATFORM_TYPES.IOS,
        createNewVersion: true,
      });

      expect(result).toMatchObject({
        liveVersion: '1.0.24',
        liveBuildNumber: 86,
        version: '1.0.25',
        buildNumber: '87',
        action: VERSION_ACTION_TYPES.CREATE_NEW_VERSION,
        versionCreated: true,
      });
    });
  });

  function mockApiResponses(bodies: unknown[]): void {
    for (const body of bodies) {
      fetchMock.mockResolvedValueOnce(createMockResponse(body));
    }
  }
});

function createMockResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}
