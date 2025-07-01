'use strict';

const Version = require('../valueObjects/version');
const BuildNumber = require('../valueObjects/buildNumber');
const { INCREMENTABLE_STATES } = require('../../shared/constants');

/**
 * Entity representing an App Store version
 */
class AppStoreVersion {
  constructor({ id, version, buildNumber, state, platform, createdDate }) {
    this.id = id;
    this.version = version instanceof Version ? version : new Version(version);
    this.buildNumber =
      buildNumber instanceof BuildNumber ? buildNumber : new BuildNumber(buildNumber || 0);
    this.state = state;
    this.platform = platform;
    this.createdDate = createdDate;
  }

  /**
   * Check if this version can have its build number incremented
   */
  canIncrementBuild() {
    return INCREMENTABLE_STATES.includes(this.state);
  }

  /**
   * Check if this version is live (ready for sale)
   */
  isLive() {
    return this.state === 'READY_FOR_SALE';
  }

  /**
   * Get the next build number
   */
  getNextBuildNumber() {
    return this.buildNumber.increment();
  }

  /**
   * Convert to plain object
   */
  toObject() {
    return {
      id: this.id,
      version: this.version.toString(),
      buildNumber: this.buildNumber.getValue(),
      state: this.state,
      platform: this.platform,
      createdDate: this.createdDate,
    };
  }

  /**
   * Create from API response
   */
  static fromApiResponse(data) {
    return new AppStoreVersion({
      id: data.id,
      version: data.attributes.versionString,
      buildNumber: 0, // Will be populated separately
      state: data.attributes.appStoreState,
      platform: data.attributes.platform,
      createdDate: data.attributes.createdDate,
    });
  }
}

module.exports = AppStoreVersion;
