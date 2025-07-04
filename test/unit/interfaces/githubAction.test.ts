import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as core from '@actions/core';
import { GitHubAction } from '../../../src/interfaces/actions/githubAction.js';
import { createApiError } from '../../../src/shared/errors/customErrors.js';
import { NextVersionDeterminationUseCase } from '../../../src/usecases/determineNextVersionUseCase.js';

// Mock the actions/core module
vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// Mock the dependencies
vi.mock('../../../src/infrastructure/auth/jwtGenerator.js');
vi.mock('../../../src/infrastructure/api/appStoreConnectClient.js');
vi.mock('../../../src/usecases/determineNextVersionUseCase.js');

describe('GitHubAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    test('executes successfully with default values', async () => {
      // Setup mocks
      vi.mocked(core.getInput).mockImplementation((name) => {
        switch (name) {
          case 'issuer-id':
            return 'test-issuer';
          case 'key-id':
            return 'test-key-id';
          case 'key':
            return 'test-private-key';
          case 'bundle-id':
            return 'com.example.app';
          case 'platform':
            return '';
          case 'create-new-version':
            return '';
          default:
            return '';
        }
      });

      const mockResult = {
        app: {
          id: 'app-123',
          bundleId: 'com.example.app',
          name: 'Example App',
          sku: 'EXAMPLE',
          primaryLocale: 'en-US',
        },
        liveVersion: '1.0.0',
        liveBuildNumber: 5,
        version: '1.0.1',
        buildNumber: '6',
        action: 'create_new_version',
        versionCreated: true,
      };

      vi.mocked(NextVersionDeterminationUseCase).mockImplementation(
        () =>
          ({
            determineNextVersion: vi.fn().mockResolvedValue(mockResult),
          }) as any,
      );

      const action = new GitHubAction();
      await action.execute();

      // Verify outputs were set
      expect(core.setOutput).toHaveBeenCalledWith('version', '1.0.1');
      expect(core.setOutput).toHaveBeenCalledWith('buildNumber', '6');
      expect(core.setOutput).toHaveBeenCalledWith('action', 'create_new_version');
      expect(core.setOutput).toHaveBeenCalledWith('versionCreated', 'true');
      expect(core.setOutput).toHaveBeenCalledWith('appName', 'Example App');
      expect(core.setOutput).toHaveBeenCalledWith('bundleId', 'com.example.app');
      expect(core.setOutput).toHaveBeenCalledWith('liveVersion', '1.0.0');
      expect(core.setOutput).toHaveBeenCalledWith('liveBuildNumber', '5');

      // Verify summary was logged
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('EXECUTION SUMMARY'));
    });

    test('handles validation error for invalid platform', async () => {
      vi.mocked(core.getInput).mockImplementation((name) => {
        switch (name) {
          case 'issuer-id':
            return 'test-issuer';
          case 'key-id':
            return 'test-key-id';
          case 'key':
            return 'test-private-key';
          case 'bundle-id':
            return 'com.example.app';
          case 'platform':
            return 'INVALID_PLATFORM';
          default:
            return '';
        }
      });

      const action = new GitHubAction();
      await action.execute();

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Invalid platform: INVALID_PLATFORM'),
      );
    });

    test('handles API error with details', async () => {
      vi.mocked(core.getInput).mockImplementation((name) => {
        switch (name) {
          case 'issuer-id':
            return 'test-issuer';
          case 'key-id':
            return 'test-key-id';
          case 'key':
            return 'test-private-key';
          case 'bundle-id':
            return 'com.example.app';
          default:
            return '';
        }
      });

      const apiError = createApiError('App not found', 404, { detail: 'No app exists' });

      vi.mocked(NextVersionDeterminationUseCase).mockImplementation(
        () =>
          ({
            determineNextVersion: vi.fn().mockRejectedValue(apiError),
          }) as any,
      );

      const action = new GitHubAction();
      await action.execute();

      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('ACTION FAILED'));
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('App not found'));
      expect(core.setFailed).toHaveBeenCalledWith('App not found');
    });

    test('handles create-new-version input correctly', async () => {
      vi.mocked(core.getInput).mockImplementation((name) => {
        switch (name) {
          case 'issuer-id':
            return 'test-issuer';
          case 'key-id':
            return 'test-key-id';
          case 'key':
            return 'test-private-key';
          case 'bundle-id':
            return 'com.example.app';
          case 'create-new-version':
            return 'true';
          default:
            return '';
        }
      });

      const mockResult = {
        app: {
          id: 'app-123',
          bundleId: 'com.example.app',
          name: 'Example App',
          sku: 'EXAMPLE',
          primaryLocale: 'en-US',
        },
        liveVersion: '1.0.0',
        liveBuildNumber: 5,
        version: '1.0.1',
        buildNumber: '6',
        action: 'create_new_version',
        versionCreated: true,
      };

      const mockDetermineNextVersion = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(NextVersionDeterminationUseCase).mockImplementation(
        () =>
          ({
            determineNextVersion: mockDetermineNextVersion,
          }) as any,
      );

      const action = new GitHubAction();
      await action.execute();

      expect(mockDetermineNextVersion).toHaveBeenCalledWith({
        bundleId: 'com.example.app',
        platform: 'IOS',
        createNewVersion: true,
      });
    });

    test('validates create-new-version input value', async () => {
      vi.mocked(core.getInput).mockImplementation((name) => {
        switch (name) {
          case 'issuer-id':
            return 'test-issuer';
          case 'key-id':
            return 'test-key-id';
          case 'key':
            return 'test-private-key';
          case 'bundle-id':
            return 'com.example.app';
          case 'create-new-version':
            return 'invalid-boolean';
          default:
            return '';
        }
      });

      const action = new GitHubAction();
      await action.execute();

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          "Invalid create-new-version value: invalid-boolean. Must be 'true' or 'false'",
        ),
      );
    });

    test('logs different status messages based on action type', async () => {
      vi.mocked(core.getInput).mockImplementation((name) => {
        switch (name) {
          case 'issuer-id':
            return 'test-issuer';
          case 'key-id':
            return 'test-key-id';
          case 'key':
            return 'test-private-key';
          case 'bundle-id':
            return 'com.example.app';
          default:
            return '';
        }
      });

      const mockResult = {
        app: {
          id: 'app-123',
          bundleId: 'com.example.app',
          name: 'Example App',
          sku: 'EXAMPLE',
          primaryLocale: 'en-US',
        },
        liveVersion: '1.0.0',
        liveBuildNumber: 5,
        version: '1.0.1',
        buildNumber: '6',
        action: 'increment_build_number',
        versionCreated: false,
      };

      vi.mocked(NextVersionDeterminationUseCase).mockImplementation(
        () =>
          ({
            determineNextVersion: vi.fn().mockResolvedValue(mockResult),
          }) as any,
      );

      const action = new GitHubAction();
      await action.execute();

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('✅ Build number incremented'),
      );
    });
  });
});
