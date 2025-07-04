import type { BuildNumber } from '../domain/valueObjects/buildNumber.js';
import type { Version } from '../domain/valueObjects/version.js';
import { VersionCalculator } from '../domain/services/versionCalculator.js';
import type { VersionActionResult } from '../domain/services/versionCalculator.js';
import { AppVersionService } from '../domain/services/appVersionService.js';
import { VERSION_ACTION_TYPES } from '../shared/constants/index.js';
import type { PlatformType } from '../shared/constants/index.js';
import type { AppStoreConnectClient } from '../infrastructure/api/appStoreConnectClient.js';
import { AppStoreVersion } from '../domain/entities/appStoreVersion.js';

interface ExecuteParams {
  bundleId: string;
  platform: PlatformType;
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

/**
 * Use case for determining the next version and build number
 */
export class NextVersionDeterminationUseCase {
  private appStoreClient: AppStoreConnectClient;
  private appVersionService: AppVersionService;

  constructor({ appStoreConnectClient }: { appStoreConnectClient: AppStoreConnectClient }) {
    this.appStoreClient = appStoreConnectClient;
    this.appVersionService = new AppVersionService(appStoreConnectClient);
  }

  /**
   * Execute the use case
   */
  async determineNextVersion({
    bundleId,
    platform,
    createNewVersion = false,
  }: ExecuteParams): Promise<ExecuteResult> {
    // Step 1: Find the app
    console.info('[Step 1] Finding app...');
    const app = await this.appStoreClient.findApplicationByBundleId(bundleId);
    console.info(`  └─ Found: ${app.name} (ID: ${app.id})`);

    // Step 2: Get the live version with build number
    console.info('\n[Step 2] Getting live version...');
    const liveVersion = await this.appVersionService.fetchLiveVersion(app.id);
    console.info(
      `  └─ Live version: ${liveVersion.version} (Build ${liveVersion.buildNumber.getValue()})`,
    );

    // Step 3: Calculate the next version
    console.info('\n[Step 3] Calculating next version...');
    const nextVersion = VersionCalculator.calculateNextSemanticVersion(liveVersion.version);
    console.info(`  └─ Next version: ${nextVersion}`);

    // Step 4: Check for existing next version
    console.info('\n[Step 4] Checking if version exists...');
    const existingNextVersion = await this.appVersionService.findVersionByString(
      app.id,
      nextVersion.toString(),
    );

    // Step 5: Determine maximum build number
    console.info('\n[Step 5] Analyzing recent builds...');
    const maxUploadedBuild = await this.appVersionService.findMaximumBuildNumber(
      app.id,
      liveVersion.buildNumber,
    );
    console.info(`  └─ Maximum build number: ${maxUploadedBuild.getValue()}`);

    // Step 6: Determine action based on version state
    // This will throw an error if the version exists but cannot accept new builds
    console.info('\n[Step 6] Determining action...');
    const actionResult = await this._determineActionWithBuildNumber(
      existingNextVersion,
      maxUploadedBuild,
    );

    // Step 7: Create new version if needed
    let versionCreated = false;
    if (actionResult.action === VERSION_ACTION_TYPES.CREATE_NEW_VERSION && createNewVersion) {
      console.info('\n[Step 7] Creating new version...');
      await this._createNewVersion(app.id, nextVersion, platform);
      versionCreated = true;
      console.info(`  └─ Created version: ${nextVersion}`);
    }

    // Step 8: Return results
    return {
      app: app.toPlainObject(),
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
  ): Promise<VersionActionResult> {
    // If version exists, get its build number first
    if (existingVersion) {
      console.info(
        `  └─ Found version ${existingVersion.version} in state: ${existingVersion.state}`,
      );
      const existingBuildNumber = await this.appStoreClient.fetchBuildNumberForVersion(
        existingVersion.id,
      );
      // Create a new AppStoreVersion instance with the build number
      existingVersion = new AppStoreVersion({
        id: existingVersion.id,
        version: existingVersion.version,
        buildNumber: existingBuildNumber,
        state: existingVersion.state,
        platform: existingVersion.platform,
        createdDate: existingVersion.createdDate,
      });
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
    const result = VersionCalculator.determineVersionAction(existingVersion, currentMaxBuild);

    if (result.buildNumber) {
      console.info(
        `  └─ Next build number: ${result.buildNumber.getValue()} (max: ${currentMaxBuild.getValue()} + 1)`,
      );
    }
    console.info(`  └─ Action: ${result.action.toUpperCase()}`);

    return result;
  }

  /**
   * Create a new version
   */
  private async _createNewVersion(
    appId: string,
    version: Version,
    platform: PlatformType,
  ): Promise<AppStoreVersion> {
    return await this.appStoreClient.createNewAppStoreVersion(appId, version, platform);
  }
}
