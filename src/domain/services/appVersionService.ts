import type { AppStoreConnectClient } from '../../infrastructure/api/appStoreConnectClient.js';
import { AppStoreVersion } from '../entities/appStoreVersion.js';
import { BuildNumber } from '../valueObjects/buildNumber.js';
import {
  APPLICATION_ERROR_CODES,
  createBusinessLogicError,
} from '../../shared/errors/customErrors.js';
import { APP_STORE_STATES } from '../../shared/constants/index.js';

// ===== App Version Service =====

export class AppVersionService {
  constructor(private appStoreClient: AppStoreConnectClient) {}

  /**
   * Retrieve the current live (READY_FOR_SALE) version with its build number
   */
  async fetchLiveVersion(appId: string): Promise<AppStoreVersion> {
    const versions = await this.appStoreClient.fetchAppStoreVersions(appId, {
      state: APP_STORE_STATES.READY_FOR_SALE,
      limit: 10,
    });

    if (versions.length === 0) {
      throw createBusinessLogicError(
        'No live version found for app. This action requires a published app.',
        APPLICATION_ERROR_CODES.LIVE_VERSION_NOT_FOUND,
      );
    }

    // Filter only READY_FOR_SALE versions
    const readyForSaleVersions = versions.filter(
      (version) => version.state === APP_STORE_STATES.READY_FOR_SALE,
    );

    if (readyForSaleVersions.length === 0) {
      throw createBusinessLogicError(
        'No live version found for app. This action requires a published app.',
        APPLICATION_ERROR_CODES.LIVE_VERSION_NOT_FOUND,
      );
    }

    // Sort by semantic version descending (latest first)
    const sortedVersions = readyForSaleVersions.sort((versionA, versionB) =>
      versionB.version.compareTo(versionA.version),
    );

    const liveVersion = sortedVersions[0];
    if (!liveVersion) {
      throw createBusinessLogicError(
        'No live version found after filtering',
        APPLICATION_ERROR_CODES.LIVE_VERSION_NOT_FOUND,
      );
    }

    // Fetch associated build number
    const buildNumber = await this._fetchVersionBuildNumber(liveVersion);

    // Return version with build number
    return this._createVersionWithBuildNumber(liveVersion, buildNumber);
  }

  /**
   * Search for a specific version by version string
   */
  async findVersionByString(appId: string, versionString: string): Promise<AppStoreVersion | null> {
    const versions = await this.appStoreClient.fetchAppStoreVersions(appId, {
      version: versionString,
    });

    // Find exact version match
    const exactMatch = versions.find((v) => v.version.toString() === versionString);

    return exactMatch ? this._createVersionWithBuildNumber(exactMatch, new BuildNumber(0)) : null;
  }

  /**
   * Determine the highest build number across all uploaded builds
   */
  async findMaximumBuildNumber(
    appId: string,
    defaultBuildNumber: BuildNumber,
  ): Promise<BuildNumber> {
    const allBuilds = await this.appStoreClient.fetchBuilds(appId);

    if (allBuilds.length === 0) {
      return defaultBuildNumber;
    }

    return allBuilds.reduce(
      (max, build) => (build.version.isGreaterThan(max) ? build.version : max),
      defaultBuildNumber,
    );
  }

  /**
   * Fetch build number for a specific version
   */
  private async _fetchVersionBuildNumber(version: AppStoreVersion): Promise<BuildNumber> {
    const buildNumber = await this.appStoreClient.fetchBuildNumberForVersion(version.id);

    // READY_FOR_SALE version must have a build
    if (version.state === APP_STORE_STATES.READY_FOR_SALE && buildNumber.getValue() === 0) {
      throw createBusinessLogicError(
        `READY_FOR_SALE version ${version.version} has no associated build. ` +
          'This indicates a data inconsistency in App Store Connect.',
        APPLICATION_ERROR_CODES.INCONSISTENT_DATA_STATE,
      );
    }

    return buildNumber;
  }

  /**
   * Create a new AppStoreVersion instance with the specified build number
   */
  private _createVersionWithBuildNumber(
    version: AppStoreVersion,
    buildNumber: BuildNumber,
  ): AppStoreVersion {
    return new AppStoreVersion({
      id: version.id,
      version: version.version,
      buildNumber,
      state: version.state,
      platform: version.platform,
      createdDate: version.createdDate,
    });
  }
}
