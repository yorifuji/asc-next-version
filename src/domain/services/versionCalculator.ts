import { Version } from '../valueObjects/version.js';
import type { BuildNumber } from '../valueObjects/buildNumber.js';
import type { AppStoreVersion } from '../entities/appStoreVersion.js';
import { VERSION_ACTIONS } from '../../shared/constants/index.js';
import type { VersionAction } from '../../shared/constants/index.js';
import { createBusinessLogicError, ERROR_CODES } from '../../shared/errors/customErrors.js';

type IncrementType = 'patch' | 'minor' | 'major';

interface ActionResult {
  action: VersionAction;
  buildNumber?: BuildNumber | null;
  requiresVersionCreation?: boolean;
}

/**
 * Domain service for calculating next version and build number
 */
export class VersionCalculator {
  /**
   * Calculate the next version based on the current live version
   * @param {Version} currentVersion - The current live version
   * @param {string} incrementType - Type of increment (patch, minor, major)
   * @returns {Version} The next version
   */
  static calculateNextVersion(
    currentVersion: Version,
    incrementType: IncrementType = 'patch',
  ): Version {
    if (!(currentVersion instanceof Version)) {
      throw createBusinessLogicError(
        'Current version must be a Version instance',
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid version type',
      );
    }

    switch (incrementType) {
      case 'patch':
        return currentVersion.incrementPatch();
      case 'minor':
        return currentVersion.incrementMinor();
      case 'major':
        return currentVersion.incrementMajor();
      default:
        throw createBusinessLogicError(
          `Invalid increment type: ${incrementType}`,
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid increment type',
        );
    }
  }

  /**
   * Determine the action to take based on version existence and state
   * @param {AppStoreVersion|null} nextVersion - The next version if it exists
   * @param {BuildNumber} currentMaxBuild - Current maximum build number
   * @returns {Object} Action details
   */
  static determineAction(
    nextVersion: AppStoreVersion | null,
    currentMaxBuild: BuildNumber,
  ): ActionResult {
    if (!nextVersion) {
      // Version doesn't exist, create new
      return {
        action: VERSION_ACTIONS.NEW_VERSION,
        buildNumber: currentMaxBuild.increment(),
        requiresVersionCreation: true,
      };
    }

    if (nextVersion.canIncrementBuild()) {
      // Version exists and can be incremented
      // Use the maximum of the existing version's build number and the current max build
      let nextBuild: BuildNumber;
      
      console.info(`[DEBUG] Existing version build: ${nextVersion.buildNumber.getValue()}, Current max build: ${currentMaxBuild.getValue()}`);
      
      if (nextVersion.buildNumber.getValue() > 0) {
        // If the existing version has builds, check which is higher
        const existingVersionNextBuild = nextVersion.getNextBuildNumber();
        const currentMaxNextBuild = currentMaxBuild.increment();
        
        
        console.info(`[DEBUG] Existing version next: ${existingVersionNextBuild.getValue()}, Current max next: ${currentMaxNextBuild.getValue()}`);
        
        // Use the higher build number to avoid conflicts
        nextBuild = existingVersionNextBuild.getValue() > currentMaxNextBuild.getValue() 
          ? existingVersionNextBuild 
          : currentMaxNextBuild;
          
        console.info(`[DEBUG] Selected build number: ${nextBuild.getValue()}`);
      } else {
        // No builds for this version yet, use current max + 1
        nextBuild = currentMaxBuild.increment();
      }

      return {
        action: VERSION_ACTIONS.INCREMENT_BUILD,
        buildNumber: nextBuild,
        requiresVersionCreation: false,
      };
    }

    // Version exists but cannot be incremented - throw error with detailed message
    const stateMessages: Record<string, string> = {
      READY_FOR_SALE: 'This version is already live on the App Store. Create a new version (e.g., increment to next patch version).',
      ACCEPTED: 'This version has been accepted by Apple and is waiting to be released. Either release it first or create a new version.',
      PROCESSING_FOR_APP_STORE: 'This version is being processed by Apple. Wait for processing to complete or create a new version.',
      PENDING_CONTRACT: 'This version is pending contract agreement. Resolve contract issues in App Store Connect or create a new version.',
      WAITING_FOR_EXPORT_COMPLIANCE: 'This version is waiting for export compliance. Complete export compliance in App Store Connect or create a new version.',
      REPLACED_WITH_NEW_VERSION: 'This version has been replaced by a newer version. Use a higher version number.',
      REMOVED_FROM_SALE: 'This version has been removed from sale. Create a new version.',
      NOT_APPLICABLE_FOR_REVIEW: 'This version is not applicable for review. Create a new version.',
    };

    const message = stateMessages[nextVersion.state] || 
      `This version is in state ${nextVersion.state} which does not allow new builds.`;

    throw createBusinessLogicError(
      `Cannot add builds to version ${nextVersion.version.toString()}: ${message}`,
      ERROR_CODES.VERSION_NOT_INCREMENTABLE,
      nextVersion.state,
    );
  }

  /**
   * Validate version transition
   * @param {Version} currentVersion - Current version
   * @param {Version} nextVersion - Proposed next version
   * @returns {boolean} Whether the transition is valid
   */
  static isValidVersionTransition(currentVersion: Version, nextVersion: Version): boolean {
    return nextVersion.compareTo(currentVersion) > 0;
  }
}
