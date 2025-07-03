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
    console.info('[Step 1] Finding app...');
    const app = await this.appStoreClient.findApp(bundleId);
    console.info(`  └─ Found: ${app.name} (ID: ${app.id})`);

    // Step 2: Get the live version with build number
    console.info('\n[Step 2] Getting live version...');
    const liveVersion = await this.appVersionService.getLiveVersion(app.id);
    console.info(
      `  └─ Live version: ${liveVersion.version} (Build ${liveVersion.buildNumber.getValue()})`,
    );

    // Step 3: Calculate the next version
    console.info('\n[Step 3] Calculating next version...');
    const nextVersion = VersionCalculator.calculateNextVersion(liveVersion.version);
    console.info(`  └─ Next version: ${nextVersion}`);

    // Step 4: Check if the next version already exists
    console.info('\n[Step 4] Checking if version exists...');
    const existingNextVersion = await this.appVersionService.findVersion(
      app.id,
      nextVersion.toString(),
    );

    // Step 4.5: Get recent builds to find the maximum build number
    console.info('\n[Step 4.5] Analyzing recent builds...');
    const allBuilds = await this.appStoreClient.getBuilds(app.id);
    const buildNumbers = allBuilds.map((b) => b.version.getValue()).sort((a, b) => b - a);
    console.info(`  └─ Fetched ${allBuilds.length} most recent builds`);
    console.info(`  └─ Build numbers: [${buildNumbers.join(', ')}]`);

    const maxUploadedBuild = allBuilds.reduce((max, build) => {
      return build.version.getValue() > max.getValue() ? build.version : max;
    }, liveVersion.buildNumber);

    console.info(`  └─ Maximum build number: ${maxUploadedBuild.getValue()}`);

    // Step 5: Determine action based on version state
    // This will throw an error if the version exists but cannot accept new builds
    console.info('\n[Step 5] Determining action...');
    const actionResult = await this._determineActionWithBuildNumber(
      existingNextVersion,
      maxUploadedBuild,
    );

    // Step 6: Create new version if needed
    let versionCreated = false;
    if (actionResult.action === VERSION_ACTIONS.NEW_VERSION && createNewVersion) {
      console.info('\n[Step 6] Creating new version...');
      await this._createNewVersion(app.id, nextVersion, platform);
      versionCreated = true;
      console.info(`  └─ Created version: ${nextVersion}`);
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
      console.info(
        `  └─ Found version ${existingVersion.version} in state: ${existingVersion.state}`,
      );
      const existingBuildNumber = await this.appStoreClient.getBuildForVersion(existingVersion.id);
      existingVersion.buildNumber = existingBuildNumber;
      if (existingBuildNumber.getValue() === 0) {
        console.info(`  └─ Version ${existingVersion.version} has no associated builds`);
      } else {
        console.info(
          `  └─ Version ${existingVersion.version} has build: ${existingBuildNumber.getValue()}`,
        );
      }
    } else {
      console.info('  └─ Version does not exist yet');
    }

    // Now determine action with the correct build number information
    const result = VersionCalculator.determineAction(existingVersion, currentMaxBuild);

    if (result.buildNumber) {
      console.info(
        `  └─ Next build number: ${result.buildNumber.getValue()} (max: ${currentMaxBuild.getValue()} + 1)`,
      );
    }
    console.info(`  └─ Action: ${result.action.toUpperCase()}`);

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
