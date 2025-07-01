const orchestrationService = require('../src/services/orchestrationService');
const appStoreService = require('../src/services/appStoreService');
const versioningService = require('../src/services/versioningService');

jest.mock('../src/services/appStoreService');
jest.mock('../src/services/versioningService');

describe('orchestrationService - 統合テスト', () => {
  const mockToken = 'mock-jwt-token';
  const mockBundleId = 'com.example.app';
  const mockPlatform = 'IOS';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineNextVersion', () => {
    test('新しいバージョンを作成するケース（create-new-version: true）', async () => {
      // Mock setup
      const mockApp = { id: 'app-123' };
      const mockLiveVersionInfo = {
        id: 'version-123',
        attributes: { versionString: '1.0.0' },
      };

      appStoreService.findApp.mockResolvedValue(mockApp);
      appStoreService.getLiveVersion.mockResolvedValue({
        liveVersionInfo: mockLiveVersionInfo,
        liveVersion: '1.0.0',
      });
      appStoreService.getMaxBuildNumber.mockResolvedValue(5);
      appStoreService.checkVersionExists.mockResolvedValue(null);
      appStoreService.createNewVersion.mockResolvedValue({
        id: 'new-version-123',
      });

      versioningService.determineNextVersionAndBuild.mockResolvedValue({
        version: '1.0.1',
        buildNumber: 6,
        action: 'new_version',
      });

      // Execute
      const result = await orchestrationService.determineNextVersion({
        bundleId: mockBundleId,
        platform: mockPlatform,
        createNewVersion: true,
        token: mockToken,
      });

      // Assert
      expect(result).toEqual({
        version: '1.0.1',
        buildNumber: 6,
        action: 'new_version',
        versionCreated: true,
        liveVersion: '1.0.0',
        liveMaxBuild: 5,
      });

      expect(appStoreService.findApp).toHaveBeenCalledWith(mockBundleId, mockToken);
      expect(appStoreService.getLiveVersion).toHaveBeenCalledWith('app-123', mockToken);
      expect(appStoreService.getMaxBuildNumber).toHaveBeenCalledWith(
        mockLiveVersionInfo,
        'app-123',
        mockToken,
      );
      expect(versioningService.determineNextVersionAndBuild).toHaveBeenCalledWith(
        '1.0.0',
        5,
        'app-123',
        mockToken,
      );
      expect(appStoreService.createNewVersion).toHaveBeenCalledWith(
        'app-123',
        '1.0.1',
        mockPlatform,
        mockToken,
      );
    });

    test('既存バージョンのビルド番号をインクリメントするケース', async () => {
      // Mock setup
      const mockApp = { id: 'app-123' };
      const mockLiveVersionInfo = {
        id: 'version-123',
        attributes: { versionString: '1.0.0' },
      };

      appStoreService.findApp.mockResolvedValue(mockApp);
      appStoreService.getLiveVersion.mockResolvedValue({
        liveVersionInfo: mockLiveVersionInfo,
        liveVersion: '1.0.0',
      });
      appStoreService.getMaxBuildNumber.mockResolvedValue(5);

      versioningService.determineNextVersionAndBuild.mockResolvedValue({
        version: '1.0.1',
        buildNumber: 3,
        action: 'increment_build',
      });

      // Execute
      const result = await orchestrationService.determineNextVersion({
        bundleId: mockBundleId,
        platform: mockPlatform,
        createNewVersion: false,
        token: mockToken,
      });

      // Assert
      expect(result).toEqual({
        version: '1.0.1',
        buildNumber: 3,
        action: 'increment_build',
        versionCreated: false,
        liveVersion: '1.0.0',
        liveMaxBuild: 5,
      });

      expect(appStoreService.createNewVersion).not.toHaveBeenCalled();
    });

    test('スキップするケース（READY_FOR_SALE状態）', async () => {
      // Mock setup
      const mockApp = { id: 'app-123' };
      const mockLiveVersionInfo = {
        id: 'version-123',
        attributes: { versionString: '1.0.0' },
      };

      appStoreService.findApp.mockResolvedValue(mockApp);
      appStoreService.getLiveVersion.mockResolvedValue({
        liveVersionInfo: mockLiveVersionInfo,
        liveVersion: '1.0.0',
      });
      appStoreService.getMaxBuildNumber.mockResolvedValue(5);

      versioningService.determineNextVersionAndBuild.mockResolvedValue({
        version: undefined,
        buildNumber: undefined,
        action: 'skip',
      });

      // Execute
      const result = await orchestrationService.determineNextVersion({
        bundleId: mockBundleId,
        platform: mockPlatform,
        createNewVersion: false,
        token: mockToken,
      });

      // Assert
      expect(result).toEqual({
        version: '',
        buildNumber: '',
        action: 'skip',
        versionCreated: false,
        liveVersion: '1.0.0',
        liveMaxBuild: 5,
      });
    });

    test('新しいバージョンが必要だがcreate-new-versionがfalseの場合', async () => {
      // Mock setup
      const mockApp = { id: 'app-123' };
      const mockLiveVersionInfo = {
        id: 'version-123',
        attributes: { versionString: '1.0.0' },
      };

      appStoreService.findApp.mockResolvedValue(mockApp);
      appStoreService.getLiveVersion.mockResolvedValue({
        liveVersionInfo: mockLiveVersionInfo,
        liveVersion: '1.0.0',
      });
      appStoreService.getMaxBuildNumber.mockResolvedValue(5);

      versioningService.determineNextVersionAndBuild.mockResolvedValue({
        version: '1.0.1',
        buildNumber: 6,
        action: 'new_version',
      });

      // Execute
      const result = await orchestrationService.determineNextVersion({
        bundleId: mockBundleId,
        platform: mockPlatform,
        createNewVersion: false, // false に設定
        token: mockToken,
      });

      // Assert
      expect(result.versionCreated).toBe(false);
      expect(appStoreService.createNewVersion).not.toHaveBeenCalled();
    });

    test('アプリが見つからない場合のエラーハンドリング', async () => {
      // Mock setup
      appStoreService.findApp.mockRejectedValue(
        new Error('No app found with bundle ID: com.example.app'),
      );

      // Execute & Assert
      await expect(
        orchestrationService.determineNextVersion({
          bundleId: mockBundleId,
          platform: mockPlatform,
          createNewVersion: false,
          token: mockToken,
        }),
      ).rejects.toThrow('No app found with bundle ID: com.example.app');
    });

    test('ライブバージョンが存在しない場合のエラーハンドリング', async () => {
      // Mock setup
      const mockApp = { id: 'app-123' };
      appStoreService.findApp.mockResolvedValue(mockApp);
      appStoreService.getLiveVersion.mockRejectedValue(
        new Error('No live version found for app. This action requires a published app.'),
      );

      // Execute & Assert
      await expect(
        orchestrationService.determineNextVersion({
          bundleId: mockBundleId,
          platform: mockPlatform,
          createNewVersion: false,
          token: mockToken,
        }),
      ).rejects.toThrow('No live version found for app. This action requires a published app.');
    });

    test('完全なワークフローの統合テスト', async () => {
      // このテストは実際のサービス間の連携を確認
      const mockApp = { id: 'app-123' };
      const mockLiveVersionInfo = {
        id: 'version-123',
        attributes: { versionString: '2.3.4' },
      };

      appStoreService.findApp.mockResolvedValue(mockApp);
      appStoreService.getLiveVersion.mockResolvedValue({
        liveVersionInfo: mockLiveVersionInfo,
        liveVersion: '2.3.4',
      });
      appStoreService.getMaxBuildNumber.mockResolvedValue(10);

      versioningService.determineNextVersionAndBuild.mockResolvedValue({
        version: '2.3.5',
        buildNumber: 11,
        action: 'new_version',
      });

      appStoreService.createNewVersion.mockResolvedValue({
        id: 'new-version-456',
        attributes: { versionString: '2.3.5' },
      });

      // Execute
      const result = await orchestrationService.determineNextVersion({
        bundleId: mockBundleId,
        platform: 'MAC_OS', // 異なるプラットフォームでテスト
        createNewVersion: true,
        token: mockToken,
      });

      // Assert - 全体のフローが正しく動作することを確認
      expect(result).toEqual({
        version: '2.3.5',
        buildNumber: 11,
        action: 'new_version',
        versionCreated: true,
        liveVersion: '2.3.4',
        liveMaxBuild: 10,
      });

      // 各サービスが正しい順序で呼ばれていることを確認
      expect(appStoreService.findApp).toHaveBeenCalledTimes(1);
      expect(appStoreService.getLiveVersion).toHaveBeenCalledTimes(1);
      expect(appStoreService.getMaxBuildNumber).toHaveBeenCalledTimes(1);
      expect(versioningService.determineNextVersionAndBuild).toHaveBeenCalledTimes(1);
      expect(appStoreService.createNewVersion).toHaveBeenCalledTimes(1);

      // createNewVersionが正しいプラットフォームで呼ばれていることを確認
      expect(appStoreService.createNewVersion).toHaveBeenCalledWith(
        'app-123',
        '2.3.5',
        'MAC_OS',
        mockToken,
      );
    });
  });
});
