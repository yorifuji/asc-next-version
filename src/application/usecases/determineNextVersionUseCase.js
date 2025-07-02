'use strict';

const BuildNumber = require('../../domain/valueObjects/buildNumber');
const VersionCalculator = require('../../domain/services/versionCalculator');
const { BusinessLogicError } = require('../../shared/errors/customErrors');
const { APP_STORE_STATES, VERSION_ACTIONS } = require('../../shared/constants');

/**
 * Use case for determining the next version and build number
 */
class DetermineNextVersionUseCase {
  constructor(appStoreConnectClient) {
    this.appStoreClient = appStoreConnectClient;
  }

  /**
   * Execute the use case
   */
  async execute({ bundleId, platform, createNewVersion = false }) {
    // Step 1: Find the app
    const app = await this.appStoreClient.findApp(bundleId);
    console.info(`Found app: ${app.name} (${app.id})`);

    // Step 2: Get the live version
    const liveVersion = await this._getLiveVersion(app.id);
    console.info(`Current live version: ${liveVersion.version}`);

    // Step 3: Get the maximum build number for live version
    const liveBuildNumber = await this._getMaxBuildNumber(liveVersion, app.id);
    console.info(`Current live build: ${liveBuildNumber}`);

    // Step 4: Calculate the next version
    const nextVersion = VersionCalculator.calculateNextVersion(liveVersion.version);
    console.info(`Calculated next version: ${nextVersion}`);

    // Step 5: Check if the next version already exists
    const existingNextVersion = await this._findVersion(app.id, nextVersion);

    // Step 6: Determine action based on version state
    const actionResult = await this._determineActionWithBuildNumber(
      existingNextVersion,
      liveBuildNumber,
      app.id,
    );

    // Step 7: Create new version if needed
    let versionCreated = false;
    if (actionResult.action === VERSION_ACTIONS.NEW_VERSION && createNewVersion) {
      await this._createNewVersion(app.id, nextVersion, platform);
      versionCreated = true;
      console.info(`Created new version: ${nextVersion}`);
    }

    // Step 8: Return results
    return {
      app: app.toObject(),
      liveVersion: liveVersion.version.toString(),
      liveBuildNumber: liveBuildNumber.getValue(),
      version: actionResult.action !== VERSION_ACTIONS.SKIP ? nextVersion.toString() : '',
      buildNumber: actionResult.buildNumber ? actionResult.buildNumber.getValue() : '',
      action: actionResult.action,
      versionCreated,
      skipReason: actionResult.reason,
    };
  }

  /**
   * Get the current live version
   */
  async _getLiveVersion(appId) {
    const versions = await this.appStoreClient.getAppStoreVersions(appId, {
      state: APP_STORE_STATES.READY_FOR_SALE,
      sort: '-versionString',
      limit: 10,
    });

    if (versions.length === 0) {
      throw new BusinessLogicError(
        'No live version found for app. This action requires a published app.',
        'NO_LIVE_VERSION',
      );
    }

    // Debug: Log all returned versions
    console.info(`Found ${versions.length} versions from API:`);
    versions.forEach((version, index) => {
      console.info(`  [${index}] ${version.version} (${version.state})`);
    });

    // Double-check: filter only READY_FOR_SALE versions
    const readyForSaleVersions = versions.filter(
      (version) => version.state === APP_STORE_STATES.READY_FOR_SALE,
    );

    if (readyForSaleVersions.length === 0) {
      throw new BusinessLogicError(
        'No live version found for app. This action requires a published app.',
        'NO_LIVE_VERSION',
      );
    }

    console.info(`Filtered to ${readyForSaleVersions.length} READY_FOR_SALE versions`);

    // Sort by version string descending (latest first)
    readyForSaleVersions.sort((versionA, versionB) => versionB.version.compareTo(versionA.version));

    // Get the latest READY_FOR_SALE version
    const liveVersion = readyForSaleVersions[0];

    // Get build number for live version
    const buildNumber = await this.appStoreClient.getBuildForVersion(liveVersion.id);
    liveVersion.buildNumber = buildNumber;

    return liveVersion;
  }

  /**
   * Get maximum build number using fallback strategy
   */
  async _getMaxBuildNumber(version, appId) {
    // Try to get build number from version directly
    if (version.buildNumber && version.buildNumber.getValue() > 0) {
      return version.buildNumber;
    }

    // Fallback: search builds
    const builds = await this.appStoreClient.getBuilds(appId, {
      version: version.version.toString(),
      limit: 1,
    });

    if (builds.length > 0) {
      return builds[0].version;
    }

    return new BuildNumber(0);
  }

  /**
   * Find a specific version
   */
  async _findVersion(appId, version) {
    const versions = await this.appStoreClient.getAppStoreVersions(appId, {
      version: version.toString(),
    });

    console.info(`Searching for version ${version.toString()}, found ${versions.length} version(s)`);
    
    if (versions.length > 0) {
      versions.forEach((v, index) => {
        console.info(`  [${index}] Version: ${v.version.toString()}, State: ${v.state}`);
      });
    }

    // Find exact version match
    const exactMatch = versions.find(v => v.version.toString() === version.toString());
    
    if (exactMatch) {
      console.info(`Found exact match: ${exactMatch.version.toString()} in state ${exactMatch.state}`);
      exactMatch.buildNumber = new BuildNumber(0);
      return exactMatch;
    }

    console.info(`No exact match found for version ${version.toString()}`);
    return null;
  }

  /**
   * Determine action with proper build number calculation
   */
  async _determineActionWithBuildNumber(existingVersion, currentMaxBuild, appId) {
    const result = VersionCalculator.determineAction(existingVersion, currentMaxBuild);

    // If incrementing build on existing version, ensure we have the correct max build
    if (result.action === VERSION_ACTIONS.INCREMENT_BUILD && existingVersion) {
      const existingMaxBuild = await this._getMaxBuildNumber(existingVersion, appId);
      if (existingMaxBuild.getValue() > 0) {
        result.buildNumber = existingMaxBuild.increment();
      }
    }

    return result;
  }

  /**
   * Create a new version
   */
  async _createNewVersion(appId, version, platform) {
    return await this.appStoreClient.createAppStoreVersion(appId, version, platform);
  }
}

module.exports = DetermineNextVersionUseCase;
