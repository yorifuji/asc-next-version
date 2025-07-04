import * as core from '@actions/core';
import { AppStoreConnectJwtService } from '../../infrastructure/auth/jwtGenerator.js';
import { AppStoreConnectApiClient } from '../../infrastructure/api/appStoreConnectClient.js';
import { NextVersionDeterminationUseCase } from '../../usecases/determineNextVersionUseCase.js';
import { PLATFORM_TYPES } from '../../shared/constants/index.js';
import type { PlatformType } from '../../shared/constants/index.js';
import { createValidationError } from '../../shared/errors/customErrors.js';
import type { ErrorWithDetails } from '../../shared/types/api.js';

// ===== Type Definitions =====

interface ActionInputs {
  readonly issuerId: string;
  readonly keyId: string;
  readonly privateKey: string;
  readonly bundleId: string;
  readonly platform: PlatformType;
  readonly createNewVersion: boolean;
}

interface ActionOutputs {
  readonly version: string;
  readonly buildNumber: string;
  readonly action: string;
  readonly versionCreated: boolean;
  readonly app: {
    readonly name: string;
    readonly bundleId: string;
  };
  readonly liveVersion: string;
  readonly liveBuildNumber: number;
}

/**
 * GitHub Action interface for App Store Connect version management
 */
export class AppStoreVersionAction {
  private _inputs: ActionInputs | null = null;
  private _jwtService: AppStoreConnectJwtService | null = null;
  private _apiClient: AppStoreConnectApiClient | null = null;
  private _useCase: NextVersionDeterminationUseCase | null = null;

  /**
   * Execute the GitHub Action
   */
  async execute(): Promise<void> {
    try {
      // Step 1: Read and validate inputs
      this._inputs = this._readAndValidateInputs();

      // Step 2: Initialize dependencies
      this._initializeDependencies();

      // Step 3: Execute version determination
      const result = await this._useCase!.determineNextVersion({
        bundleId: this._inputs.bundleId,
        platform: this._inputs.platform,
        createNewVersion: this._inputs.createNewVersion,
      });

      // Step 4: Set action outputs
      this._setActionOutputs(result);

      // Step 5: Log execution summary
      this._logExecutionSummary(result);
    } catch (error) {
      this._handleActionError(error as Error);
    }
  }

  /**
   * Read and validate GitHub Action inputs
   */
  private _readAndValidateInputs(): ActionInputs {
    const issuerId = core.getInput('issuer-id', { required: true });
    const keyId = core.getInput('key-id', { required: true });
    const privateKey = core.getInput('key', { required: true });
    const bundleId = core.getInput('bundle-id', { required: true });
    const platformInput = core.getInput('platform') || PLATFORM_TYPES.IOS;
    const createNewVersionInput = core.getInput('create-new-version') || 'false';

    // Validate platform
    if (!Object.values(PLATFORM_TYPES).includes(platformInput as PlatformType)) {
      throw createValidationError(
        `Invalid platform: ${platformInput}. Must be one of: ${Object.values(PLATFORM_TYPES).join(', ')}`,
        'platform',
        platformInput,
      );
    }

    // Validate boolean input
    if (createNewVersionInput !== 'true' && createNewVersionInput !== 'false') {
      throw createValidationError(
        `Invalid create-new-version value: ${createNewVersionInput}. Must be 'true' or 'false'`,
        'create-new-version',
        createNewVersionInput,
      );
    }

    return {
      issuerId,
      keyId,
      privateKey,
      bundleId,
      platform: platformInput as PlatformType,
      createNewVersion: createNewVersionInput === 'true',
    };
  }

  /**
   * Initialize service dependencies
   */
  private _initializeDependencies(): void {
    this._jwtService = new AppStoreConnectJwtService({
      issuerId: this._inputs!.issuerId,
      keyId: this._inputs!.keyId,
      privateKey: this._inputs!.privateKey,
    });

    this._apiClient = new AppStoreConnectApiClient({
      jwtGenerator: this._jwtService,
    });

    this._useCase = new NextVersionDeterminationUseCase({
      appStoreConnectClient: this._apiClient,
    });
  }

  /**
   * Set GitHub Action outputs with validation
   */
  private _setActionOutputs(result: ActionOutputs): void {
    core.setOutput('version', result.version);
    core.setOutput('buildNumber', result.buildNumber);
    core.setOutput('action', result.action);
    core.setOutput('versionCreated', String(result.versionCreated));

    // Additional outputs for enhanced information
    core.setOutput('appName', result.app.name);
    core.setOutput('bundleId', result.app.bundleId);
    core.setOutput('liveVersion', result.liveVersion);
    core.setOutput('liveBuildNumber', String(result.liveBuildNumber));
  }

  /**
   * Log detailed execution summary
   */
  private _logExecutionSummary(result: ActionOutputs): void {
    core.info('\n========================================');
    core.info('EXECUTION SUMMARY');
    core.info('========================================');
    core.info(`App Name:      ${result.app.name}`);
    core.info(`Bundle ID:     ${result.app.bundleId}`);
    core.info(`Live Version:  ${result.liveVersion} (Build ${result.liveBuildNumber})`);
    core.info(`Next Version:  ${result.version}`);
    core.info(`Next Build:    ${result.buildNumber}`);
    core.info(`Action Taken:  ${result.action.toUpperCase()}`);

    if (result.versionCreated) {
      core.info('Status:        ✅ New version created successfully');
    } else if (result.action === 'increment_build_number') {
      core.info('Status:        ✅ Build number incremented');
    } else {
      core.info('Status:        ✅ Action completed');
    }

    core.info('========================================');
  }

  /**
   * Handle and report action errors
   */
  private _handleActionError(error: ErrorWithDetails): void {
    core.error('========================================');
    core.error('ACTION FAILED');
    core.error('========================================');
    core.error(`Error: ${error.message}`);

    if (error.details) {
      core.error(`Details: ${JSON.stringify(error.details, null, 2)}`);
    }

    if (error.stack) {
      core.debug(`Stack trace:\n${error.stack}`);
    }

    core.error('========================================');
    core.setFailed(error.message);
  }
}

// Backward compatibility export
export { AppStoreVersionAction as GitHubAction };
