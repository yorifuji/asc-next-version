import type { BuildNumber } from '../domain/valueObjects/buildNumber.js';
import type { Version } from '../domain/valueObjects/version.js';
import { VersionCalculator } from '../domain/services/versionCalculator.js';
import { AppVersionService } from '../domain/services/appVersionService.js';
import { VERSION_ACTIONS } from '../shared/constants/index.js';
import type { Platform } from '../shared/constants/index.js';
import type { AppStoreConnectClient } from '../infrastructure/api/appStoreConnectClient.js';
import type { AppStoreVersion } from '../domain/entities/appStoreVersion.js';

interface ExecuteParams {
  bundleId: string;
  platform: Platform;
  createNewVersion?: boolean;
}

interface ExecuteResult {
  app: {
    id: string;
    bundleId: string;
    name: string;
    sku: string;
    primaryLocale: string;
  };
  liveVersion: string;
  liveBuildNumber: number;
  version: string;
  buildNumber: string;
  action: string;
  versionCreated: boolean;
}

interface ActionResult {
  action: string;
  buildNumber?: BuildNumber;
}

/**
 * Use case for determining the next version and build number
 */
export class DetermineNextVersionUseCase {
  private appStoreClient: AppStoreConnectClient;
  private appVersionService: AppVersionService;

  constructor(appStoreConnectClient: AppStoreConnectClient) {
    this.appStoreClient = appStoreConnectClient;
    this.appVersionService = new AppVersionService(appStoreConnectClient);
  }

  /**
   * Execute the use case
   */
  async execute({
    bundleId,
    platform,
    createNewVersion = false,
  }: ExecuteParams): Promise<ExecuteResult> {
    // Step 1: Find the app
    const app = await this.appStoreClient.findApp(bundleId);
    console.info(`Found app: ${app.name} (${app.id})`);

    // Step 2: Get the live version with build number
    const liveVersion = await this.appVersionService.getLiveVersion(app.id);
    console.info(
      `Current live version: ${liveVersion.version} (Build ${liveVersion.buildNumber.getValue()})`,
    );

    // Step 3: Calculate the next version
    const nextVersion = VersionCalculator.calculateNextVersion(liveVersion.version);
    console.info(`Calculated next version: ${nextVersion}`);

    // Step 4: Check if the next version already exists
    const existingNextVersion = await this.appVersionService.findVersion(
      app.id,
      nextVersion.toString(),
    );

    // Step 4.5: Get all uploaded builds to find the actual maximum build number
    const allBuilds = await this.appStoreClient.getBuilds(app.id);
    const maxUploadedBuild = allBuilds.reduce((max, build) => {
      return build.version.getValue() > max.getValue() ? build.version : max;
    }, liveVersion.buildNumber);
    
    console.info(`[DEBUG] Max uploaded build number: ${maxUploadedBuild.getValue()}`);

    // Step 5: Determine action based on version state
    // This will throw an error if the version exists but cannot accept new builds
    const actionResult = await this._determineActionWithBuildNumber(
      existingNextVersion,
      maxUploadedBuild,
    );

    // Step 6: Create new version if needed
    let versionCreated = false;
    if (actionResult.action === VERSION_ACTIONS.NEW_VERSION && createNewVersion) {
      await this._createNewVersion(app.id, nextVersion, platform);
      versionCreated = true;
      console.info(`Created new version: ${nextVersion}`);
    }

    // Step 7: Return results
    return {
      app: app.toObject(),
      liveVersion: liveVersion.version.toString(),
      liveBuildNumber: liveVersion.buildNumber.getValue(),
      version: nextVersion.toString(),
      buildNumber: actionResult.buildNumber ? String(actionResult.buildNumber.getValue()) : '',
      action: actionResult.action,
      versionCreated,
    };
  }

  /**
   * Determine action with proper build number calculation
   */
  private async _determineActionWithBuildNumber(
    existingVersion: AppStoreVersion | null,
    currentMaxBuild: BuildNumber,
  ): Promise<ActionResult> {
    // If version exists, get its build number first
    if (existingVersion) {
      const existingBuildNumber = await this.appStoreClient.getBuildForVersion(
        existingVersion.id,
      );
      existingVersion.buildNumber = existingBuildNumber;
    }

    // Now determine action with the correct build number information
    const result = VersionCalculator.determineAction(existingVersion, currentMaxBuild);

    return {
      action: result.action,
      buildNumber: result.buildNumber || undefined,
    };
  }

  /**
   * Create a new version
   */
  private async _createNewVersion(
    appId: string,
    version: Version,
    platform: Platform,
  ): Promise<AppStoreVersion> {
    return await this.appStoreClient.createAppStoreVersion(appId, version, platform);
  }
}
