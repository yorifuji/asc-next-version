// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Version } from '../valueObjects/version.js';
import type { BuildNumber } from '../valueObjects/buildNumber.js';
import type { AppStoreVersion } from '../entities/appStoreVersion.js';
import { APP_STORE_STATES, VERSION_ACTION_TYPES } from '../../shared/constants/index.js';
import type { VersionActionType } from '../../shared/constants/index.js';
import {
  APPLICATION_ERROR_CODES,
  createBusinessLogicError,
} from '../../shared/errors/customErrors.js';

// ===== Type Definitions =====

export type VersionIncrementType = 'patch' | 'minor' | 'major';

export interface VersionActionResult {
  readonly action: VersionActionType;
  readonly buildNumber: BuildNumber | null;
  readonly requiresVersionCreation: boolean;
}

// ===== Version Calculator Service =====

export class VersionCalculationService {
  /**
   * Calculate the next semantic version
   */
  static calculateNextSemanticVersion(
    currentVersion: Version,
    incrementType: VersionIncrementType = 'patch',
  ): Version {
    const incrementMethods: Record<VersionIncrementType, () => Version> = {
      patch: () => currentVersion.incrementPatch(),
      minor: () => currentVersion.incrementMinor(),
      major: () => currentVersion.incrementMajor(),
    };

    const incrementMethod = incrementMethods[incrementType];
    if (!incrementMethod) {
      throw createBusinessLogicError(
        `Invalid version increment type: "${incrementType}"`,
        APPLICATION_ERROR_CODES.VALIDATION_ERROR,
        'Must be one of: patch, minor, major',
      );
    }

    return incrementMethod();
  }

  /**
   * Determine the appropriate action based on version state
   */
  static determineVersionAction(
    targetVersion: AppStoreVersion | null,
    maxExistingBuildNumber: BuildNumber,
  ): VersionActionResult {
    // Case 1: Version doesn't exist yet
    if (!targetVersion) {
      return {
        action: VERSION_ACTION_TYPES.CREATE_NEW_VERSION,
        buildNumber: maxExistingBuildNumber.increment(),
        requiresVersionCreation: true,
      };
    }

    // Case 2: Version exists and allows build increment
    if (targetVersion.canIncrementBuildNumber()) {
      const nextBuildNumber = this._calculateNextBuildNumber(targetVersion, maxExistingBuildNumber);

      return {
        action: VERSION_ACTION_TYPES.INCREMENT_BUILD_NUMBER,
        buildNumber: nextBuildNumber,
        requiresVersionCreation: false,
      };
    }

    // Case 3: Version exists but cannot be incremented
    throw this._createVersionStateError(targetVersion);
  }

  /**
   * Calculate the next build number avoiding conflicts
   */
  private static _calculateNextBuildNumber(
    version: AppStoreVersion,
    maxExistingBuildNumber: BuildNumber,
  ): BuildNumber {
    const versionHasBuilds = version.buildNumber.getValue() > 0;

    if (!versionHasBuilds) {
      // No builds for this version yet
      return maxExistingBuildNumber.increment();
    }

    // Version has builds - use the higher of the two
    const versionNextBuild = version.calculateNextBuildNumber();
    const globalNextBuild = maxExistingBuildNumber.increment();

    return versionNextBuild.isGreaterThan(globalNextBuild) ? versionNextBuild : globalNextBuild;
  }

  /**
   * Create detailed error for version state issues
   */
  private static _createVersionStateError(version: AppStoreVersion): never {
    const stateDescriptions: Record<string, string> = {
      [APP_STORE_STATES.READY_FOR_SALE]:
        'This version is already live on the App Store. Create a new version.',
      [APP_STORE_STATES.ACCEPTED]:
        'This version has been accepted and is waiting to be released. Release it first or create a new version.',
      [APP_STORE_STATES.PROCESSING_FOR_APP_STORE]:
        'This version is being processed by Apple. Wait for completion or create a new version.',
      [APP_STORE_STATES.PENDING_CONTRACT]:
        'This version requires contract agreement. Resolve in App Store Connect or create a new version.',
      [APP_STORE_STATES.WAITING_FOR_EXPORT_COMPLIANCE]:
        'This version needs export compliance. Complete in App Store Connect or create a new version.',
      [APP_STORE_STATES.REPLACED_WITH_NEW_VERSION]:
        'This version has been replaced. Use a higher version number.',
      [APP_STORE_STATES.REMOVED_FROM_SALE]:
        'This version has been removed from sale. Create a new version.',
      [APP_STORE_STATES.NOT_APPLICABLE_FOR_REVIEW]:
        'This version is not applicable for review. Create a new version.',
      [APP_STORE_STATES.PREPARE_FOR_SUBMISSION]:
        'This version is being prepared for submission. Wait for submission or create a new version.',
      [APP_STORE_STATES.WAITING_FOR_REVIEW]:
        'This version is waiting for review. Wait for review completion or create a new version.',
      [APP_STORE_STATES.IN_REVIEW]:
        'This version is currently in review. Wait for review completion or create a new version.',
      [APP_STORE_STATES.REJECTED]:
        'This version has been rejected. Address rejection issues or create a new version.',
      [APP_STORE_STATES.PENDING_DEVELOPER_RELEASE]:
        'This version is pending developer release. Release it or create a new version.',
      [APP_STORE_STATES.DEVELOPER_REJECTED]:
        'This version was rejected by the developer. Resubmit or create a new version.',
      [APP_STORE_STATES.METADATA_REJECTED]:
        'This version has metadata issues. Fix metadata or create a new version.',
      [APP_STORE_STATES.INVALID_BINARY]:
        'This version has an invalid binary. Upload a new binary or create a new version.',
      [APP_STORE_STATES.DEVELOPER_REMOVED_FROM_SALE]:
        'This version was removed by the developer. Create a new version.',
    };

    const description =
      stateDescriptions[version.state] ||
      `This version is in state "${version.state}" which does not allow new builds.`;

    throw createBusinessLogicError(
      `Cannot add builds to version ${version.version.toString()}: ${description}`,
      APPLICATION_ERROR_CODES.VERSION_INCREMENT_NOT_ALLOWED,
      version.state,
    );
  }

  /**
   * Validate version progression
   */
  static isValidVersionProgression(currentVersion: Version, proposedVersion: Version): boolean {
    return proposedVersion.isGreaterThan(currentVersion);
  }
}

// Backward compatibility alias
export { VersionCalculationService as VersionCalculator };
