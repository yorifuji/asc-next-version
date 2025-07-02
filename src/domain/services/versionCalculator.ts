import { Version } from '../valueObjects/version.js';
import type { BuildNumber } from '../valueObjects/buildNumber.js';
import type { AppStoreVersion } from '../entities/appStoreVersion.js';
import { VERSION_ACTIONS } from '../../shared/constants/index.js';
import type { VersionAction } from '../../shared/constants/index.js';
import { BusinessLogicError } from '../../shared/errors/customErrors.js';

type IncrementType = 'patch' | 'minor' | 'major';

interface ActionResult {
  action: VersionAction;
  buildNumber?: BuildNumber | null;
  requiresVersionCreation?: boolean;
  reason?: string;
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
      throw new BusinessLogicError(
        'Current version must be a Version instance',
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
        throw new BusinessLogicError(
          `Invalid increment type: ${incrementType}`,
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
      const nextBuild =
        nextVersion.buildNumber.getValue() > 0
          ? nextVersion.getNextBuildNumber()
          : currentMaxBuild.increment();

      return {
        action: VERSION_ACTIONS.INCREMENT_BUILD,
        buildNumber: nextBuild,
        requiresVersionCreation: false,
      };
    }

    // Version exists but cannot be incremented
    return {
      action: VERSION_ACTIONS.SKIP,
      buildNumber: null,
      requiresVersionCreation: false,
      reason: `Version ${nextVersion.version.toString()} is in state ${nextVersion.state} which does not allow new builds`,
    };
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
