'use strict';

const core = require('@actions/core');
const JwtGenerator = require('../../infrastructure/auth/jwtGenerator');
const AppStoreConnectClient = require('../../infrastructure/api/appStoreConnectClient');
const DetermineNextVersionUseCase = require('../../application/usecases/determineNextVersionUseCase');
const { PLATFORMS } = require('../../shared/constants');
const { ValidationError } = require('../../shared/errors/customErrors');

/**
 * GitHub Action interface
 */
class GitHubAction {
  constructor() {
    this.inputs = null;
    this.jwtGenerator = null;
    this.appStoreClient = null;
    this.useCase = null;
  }

  /**
   * Run the action
   */
  async run() {
    try {
      // Read inputs
      this.inputs = this._readInputs();

      // Initialize components
      this._initializeComponents();

      // Execute use case
      const result = await this.useCase.execute({
        bundleId: this.inputs.bundleId,
        platform: this.inputs.platform,
        createNewVersion: this.inputs.createNewVersion,
      });

      // Set outputs
      this._setOutputs(result);

      // Log summary
      this._logSummary(result);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Read and validate inputs
   */
  _readInputs() {
    const issuerId = core.getInput('issuer-id', { required: true });
    const keyId = core.getInput('key-id', { required: true });
    const key = core.getInput('key', { required: true });
    const bundleId = core.getInput('bundle-id', { required: true });
    const platform = core.getInput('platform') || PLATFORMS.IOS;
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
  _initializeComponents() {
    this.jwtGenerator = new JwtGenerator(this.inputs.issuerId, this.inputs.keyId, this.inputs.key);

    this.appStoreClient = new AppStoreConnectClient(this.jwtGenerator);
    this.useCase = new DetermineNextVersionUseCase(this.appStoreClient);
  }

  /**
   * Set GitHub Action outputs
   */
  _setOutputs(result) {
    core.setOutput('version', result.version);
    core.setOutput('buildNumber', result.buildNumber);
    core.setOutput('action', result.action);
    core.setOutput('versionCreated', result.versionCreated);
  }

  /**
   * Log summary
   */
  _logSummary(result) {
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
  _handleError(error) {
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

module.exports = GitHubAction;
