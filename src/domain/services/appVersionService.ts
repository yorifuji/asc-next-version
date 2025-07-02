import type { AppStoreConnectClient } from '../../infrastructure/api/appStoreConnectClient.js';
import type { AppStoreVersion } from '../entities/appStoreVersion.js';
import { BuildNumber } from '../valueObjects/buildNumber.js';
import { createBusinessLogicError, ERROR_CODES } from '../../shared/errors/customErrors.js';
import { APP_STORE_STATES } from '../../shared/constants/index.js';

/**
 * Domain service for app version operations
 */
export class AppVersionService {
  constructor(private appStoreClient: AppStoreConnectClient) {}

  /**
   * Get the current live version
   */
  async getLiveVersion(appId: string): Promise<AppStoreVersion> {
    const versions = await this.appStoreClient.getAppStoreVersions(appId, {
      state: APP_STORE_STATES.READY_FOR_SALE,
      limit: 10,
    });

    if (versions.length === 0) {
      throw createBusinessLogicError(
        'No live version found for app. This action requires a published app.',
        ERROR_CODES.NO_LIVE_VERSION,
      );
    }

    // Filter only READY_FOR_SALE versions
    const readyForSaleVersions = versions.filter(
      (version) => version.state === APP_STORE_STATES.READY_FOR_SALE,
    );

    if (readyForSaleVersions.length === 0) {
      throw createBusinessLogicError(
        'No live version found for app. This action requires a published app.',
        ERROR_CODES.NO_LIVE_VERSION,
      );
    }

    // Sort by version string descending (latest first)
    readyForSaleVersions.sort((versionA, versionB) => versionB.version.compareTo(versionA.version));

    const liveVersion = readyForSaleVersions[0];
    if (!liveVersion) {
      throw createBusinessLogicError(
        'No live version found after filtering',
        ERROR_CODES.NO_LIVE_VERSION,
      );
    }

    // Get build number for live version
    const buildNumber = await this.appStoreClient.getBuildForVersion(liveVersion.id);
    
    // READY_FOR_SALE version must have a build
    if (buildNumber.getValue() === 0) {
      throw createBusinessLogicError(
        `READY_FOR_SALE version ${liveVersion.version} has no associated build. This indicates a data inconsistency in App Store Connect.`,
        ERROR_CODES.DATA_INCONSISTENCY,
      );
    }
    
    liveVersion.buildNumber = buildNumber;

    return liveVersion;
  }

  /**
   * Find a specific version
   */
  async findVersion(appId: string, version: string): Promise<AppStoreVersion | null> {
    const versions = await this.appStoreClient.getAppStoreVersions(appId, {
      version,
    });

    console.info(`Searching for version ${version}, found ${versions.length} version(s)`);

    // Find exact version match
    const exactMatch = versions.find((v) => v.version.toString() === version);

    if (exactMatch) {
      console.info(
        `Found exact match: ${exactMatch.version.toString()} in state ${exactMatch.state}`,
      );
      exactMatch.buildNumber = new BuildNumber(0);
      return exactMatch;
    }

    return null;
  }
}
