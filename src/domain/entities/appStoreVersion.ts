import { Version } from '../valueObjects/version.js';
import { BuildNumber } from '../valueObjects/buildNumber.js';
import { INCREMENTABLE_STATES } from '../../shared/constants/index.js';
import type { AppStoreState, Platform } from '../../shared/constants/index.js';

interface AppStoreVersionParams {
  id: string;
  version: string | Version;
  buildNumber: string | number | BuildNumber;
  state: AppStoreState;
  platform: Platform;
  createdDate: string;
}

interface ApiResponseData {
  id: string;
  attributes: {
    versionString: string;
    appStoreState: AppStoreState;
    platform: Platform;
    createdDate: string;
  };
}

/**
 * Entity representing an App Store version
 */
export class AppStoreVersion {
  id: string;
  version: Version;
  buildNumber: BuildNumber;
  state: AppStoreState;
  platform: Platform;
  createdDate: string;

  constructor({ id, version, buildNumber, state, platform, createdDate }: AppStoreVersionParams) {
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
  canIncrementBuild(): boolean {
    return INCREMENTABLE_STATES.includes(this.state);
  }

  /**
   * Check if this version is live (ready for sale)
   */
  isLive(): boolean {
    return this.state === 'READY_FOR_SALE';
  }

  /**
   * Get the next build number
   */
  getNextBuildNumber(): BuildNumber {
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
  static fromApiResponse(data: ApiResponseData): AppStoreVersion {
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
