import { Version } from '../valueObjects/version.js';
import { BuildNumber } from '../valueObjects/buildNumber.js';
import {
  APP_STORE_STATES,
  BUILD_NUMBER_INCREMENTABLE_STATES,
} from '../../shared/constants/index.js';
import type { AppStoreState, PlatformType } from '../../shared/constants/index.js';
import type { ApiResource, AppStoreVersionAttributes } from '../../shared/types/api.js';

// ===== Type Definitions =====

type VersionApiResponse = ApiResource<AppStoreVersionAttributes>;

export interface AppStoreVersionData {
  readonly id: string;
  readonly version: string | Version;
  readonly buildNumber: string | number | BuildNumber;
  readonly state: AppStoreState;
  readonly platform: PlatformType;
  readonly createdDate: string;
}

// ===== Domain Entity =====

export class AppStoreVersion {
  private readonly _id: string;
  private readonly _version: Version;
  private readonly _buildNumber: BuildNumber;
  private readonly _state: AppStoreState;
  private readonly _platform: PlatformType;
  private readonly _createdDate: string;

  constructor(data: AppStoreVersionData) {
    this._id = data.id;
    this._version = data.version instanceof Version ? data.version : new Version(data.version);
    this._buildNumber =
      data.buildNumber instanceof BuildNumber
        ? data.buildNumber
        : new BuildNumber(data.buildNumber || 0);
    this._state = data.state;
    this._platform = data.platform;
    this._createdDate = data.createdDate;
  }

  // Getters for read-only access
  get id(): string {
    return this._id;
  }

  get version(): Version {
    return this._version;
  }

  get buildNumber(): BuildNumber {
    return this._buildNumber;
  }

  get state(): AppStoreState {
    return this._state;
  }

  get platform(): PlatformType {
    return this._platform;
  }

  get createdDate(): string {
    return this._createdDate;
  }

  /**
   * Check if this version allows build number increment
   */
  canIncrementBuildNumber(): boolean {
    return BUILD_NUMBER_INCREMENTABLE_STATES.includes(this._state);
  }

  /**
   * Check if this version is live (ready for sale)
   */
  isLiveVersion(): boolean {
    return this._state === APP_STORE_STATES.READY_FOR_SALE;
  }

  /**
   * Calculate the next build number
   */
  calculateNextBuildNumber(): BuildNumber {
    return this._buildNumber.increment();
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject() {
    return {
      id: this._id,
      version: this._version.toString(),
      buildNumber: this._buildNumber.getValue(),
      state: this._state,
      platform: this._platform,
      createdDate: this._createdDate,
    };
  }

  /**
   * Factory method to create from API response
   */
  static createFromApiResponse(response: VersionApiResponse): AppStoreVersion {
    return new AppStoreVersion({
      id: response.id,
      version: response.attributes.versionString,
      buildNumber: 0, // Build number will be populated separately from builds endpoint
      state: response.attributes.appStoreState,
      platform: response.attributes.platform,
      createdDate: response.attributes.createdDate,
    });
  }
}
