import * as core from '@actions/core';
import { JwtGenerator } from '../../infrastructure/auth/jwtGenerator.js';
import { AppStoreConnectClient } from '../../infrastructure/api/appStoreConnectClient.js';
import { DetermineNextVersionUseCase } from '../../application/usecases/determineNextVersionUseCase.js';
import { PLATFORMS } from '../../shared/constants/index.js';
import type { Platform } from '../../shared/constants/index.js';
import { ValidationError } from '../../shared/errors/customErrors.js';
import type { ErrorWithDetails } from '../../shared/types/api.js';

interface Inputs {
  issuerId: string;
  keyId: string;
  key: string;
  bundleId: string;
  platform: Platform;
  createNewVersion: boolean;
}

interface Result {
  version: string;
  buildNumber: string;
  action: string;
  versionCreated: boolean;
  app: {
    name: string;
    bundleId: string;
  };
  liveVersion: string;
  liveBuildNumber: number;
  skipReason?: string;
}

/**
 * GitHub Action interface
 */
export class GitHubAction {
  private inputs: Inputs | null = null;
  private jwtGenerator: JwtGenerator | null = null;
  private appStoreClient: AppStoreConnectClient | null = null;
  private useCase: DetermineNextVersionUseCase | null = null;

  /**
   * Run the action
   */
  async run(): Promise<void> {
    try {
      // Read inputs
      this.inputs = this._readInputs();

      // Initialize components
      this._initializeComponents();

      // Execute use case
      const result = await this.useCase!.execute({
        bundleId: this.inputs.bundleId,
        platform: this.inputs.platform,
        createNewVersion: this.inputs.createNewVersion,
      });

      // Set outputs
      this._setOutputs(result);

      // Log summary
      this._logSummary(result);
    } catch (error) {
      this._handleError(error as Error);
    }
  }

  /**
   * Read and validate inputs
   */
  private _readInputs(): Inputs {
    const issuerId = core.getInput('issuer-id', { required: true });
    const keyId = core.getInput('key-id', { required: true });
    const key = core.getInput('key', { required: true });
    const bundleId = core.getInput('bundle-id', { required: true });
    const platform = (core.getInput('platform') || PLATFORMS.IOS) as Platform;
    const createNewVersion = core.getInput('create-new-version') === 'true';

    // Validate platform
    if (!Object.values(PLATFORMS).includes(platform)) {
      throw new ValidationError(
        `Invalid platform: ${platform}. Must be one of: ${Object.values(PLATFORMS).join(', ')}`,
        'platform',
        platform,
      );
    }

    return {
      issuerId,
      keyId,
      key,
      bundleId,
      platform,
      createNewVersion,
    };
  }

  /**
   * Initialize components
   */
  private _initializeComponents(): void {
    this.jwtGenerator = new JwtGenerator(
      this.inputs!.issuerId,
      this.inputs!.keyId,
      this.inputs!.key,
    );

    this.appStoreClient = new AppStoreConnectClient(this.jwtGenerator);
    this.useCase = new DetermineNextVersionUseCase(this.appStoreClient);
  }

  /**
   * Set GitHub Action outputs
   */
  private _setOutputs(result: Result): void {
    core.setOutput('version', result.version);
    core.setOutput('buildNumber', result.buildNumber);
    core.setOutput('action', result.action);
    core.setOutput('versionCreated', result.versionCreated);
  }

  /**
   * Log summary
   */
  private _logSummary(result: Result): void {
    core.info('========================================');
    core.info('Next Version Determination Summary:');
    core.info('========================================');
    core.info(`App: ${result.app.name} (${result.app.bundleId})`);
    core.info(`Live Version: ${result.liveVersion} (Build ${result.liveBuildNumber})`);
    core.info(`Action: ${result.action}`);

    if (result.version) {
      core.info(`Next Version: ${result.version}`);
      core.info(`Next Build: ${result.buildNumber}`);
    }

    if (result.versionCreated) {
      core.info('✅ New version created successfully');
    }

    if (result.skipReason) {
      core.warning(`Skip Reason: ${result.skipReason}`);
    }

    core.info('========================================');
  }

  /**
   * Handle errors
   */
  private _handleError(error: ErrorWithDetails): void {
    core.error(`Error: ${error.message}`);

    if (error.details) {
      core.error(`Details: ${JSON.stringify(error.details)}`);
    }

    if (error.stack) {
      core.debug(`Stack trace: ${error.stack}`);
    }

    core.setFailed(error.message);
  }
}
