import { HttpClient } from './httpClient.js';
import { App } from '../../domain/entities/app.js';
import { AppStoreVersion } from '../../domain/entities/appStoreVersion.js';
import { BuildNumber } from '../../domain/valueObjects/buildNumber.js';
import type { Version } from '../../domain/valueObjects/version.js';
import { ApiError } from '../../shared/errors/customErrors.js';
import type { JwtGenerator } from '../auth/jwtGenerator.js';
import type { AppStoreState, Platform } from '../../shared/constants/index.js';
import type {
  ApiResource,
  ApiResponse,
  AppAttributes,
  AppStoreVersionAttributes,
  BuildAttributes,
  CreateAppStoreVersionRequest,
  PreReleaseVersionAttributes,
} from '../../shared/types/api.js';

interface VersionFilters {
  state?: AppStoreState;
  version?: string;
  platform?: Platform;
  sort?: string;
  limit?: number;
}

interface BuildFilters {
  limit?: number;
  version?: string;
  preReleaseVersion?: string;
}

interface Build {
  id: string;
  version: BuildNumber;
  uploadedDate: string;
  processingState: string;
}

/**
 * Client for App Store Connect API
 */
export class AppStoreConnectClient {
  private httpClient: HttpClient;
  private jwtGenerator: JwtGenerator;
  private token: string = '';

  constructor(jwtGenerator: JwtGenerator) {
    this.httpClient = new HttpClient();
    this.jwtGenerator = jwtGenerator;
    this._refreshToken();
  }

  /**
   * Find app by bundle ID
   */
  async findApp(bundleId: string): Promise<App> {
    this._ensureValidToken();

    const response = await this.httpClient.get<ApiResponse<AppAttributes>>('/apps', {
      params: {
        'filter[bundleId]': bundleId,
      },
    });

    const data = response.data;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new ApiError(`No app found with bundle ID: ${bundleId}`, 404, null);
    }

    const appData = Array.isArray(data) ? data[0] : data;
    if (!appData) {
      throw new ApiError(`No app found with bundle ID: ${bundleId}`, 404, null);
    }
    return App.fromApiResponse(appData);
  }

  /**
   * Get app store versions
   */
  async getAppStoreVersions(
    appId: string,
    filters: VersionFilters = {},
  ): Promise<AppStoreVersion[]> {
    this._ensureValidToken();

    const params: Record<string, string | number> = {};
    if (filters.state) {
      params['filter[appStoreState]'] = filters.state;
    }
    if (filters.version) {
      params['filter[versionString]'] = filters.version;
    }
    if (filters.platform) {
      params['filter[platform]'] = filters.platform;
    }
    if (filters.sort) {
      params.sort = filters.sort;
    }
    if (filters.limit) {
      params.limit = filters.limit;
    }

    const response = await this.httpClient.get<ApiResponse<AppStoreVersionAttributes>>(
      `/apps/${appId}/appStoreVersions`,
      { params },
    );

    const data = response.data;
    const versions = Array.isArray(data) ? data : [data];
    return versions.map((versionData) => AppStoreVersion.fromApiResponse(versionData));
  }

  /**
   * Get build for a specific version
   */
  async getBuildForVersion(versionId: string): Promise<BuildNumber> {
    this._ensureValidToken();

    try {
      const response = await this.httpClient.get<ApiResponse<BuildAttributes>>(
        `/appStoreVersions/${versionId}/build`,
      );

      const data = response.data;
      const build = Array.isArray(data) ? data[0] : data;

      if (build?.attributes) {
        return new BuildNumber(build.attributes.version);
      }

      return new BuildNumber(0);
    } catch (error) {
      if ((error as ApiError).statusCode === 404) {
        // No build associated with this version yet
        return new BuildNumber(0);
      }
      throw error;
    }
  }

  /**
   * Get builds for an app
   */
  async getBuilds(appId: string, filters: BuildFilters = {}): Promise<Build[]> {
    this._ensureValidToken();

    const params: Record<string, string | number> = {
      'filter[app]': appId,
      sort: '-version',
      limit: filters.limit || 200,
    };

    if (filters.version) {
      params['filter[version]'] = filters.version;
    }
    if (filters.preReleaseVersion) {
      params['filter[preReleaseVersion]'] = filters.preReleaseVersion;
    }

    const response = await this.httpClient.get<ApiResponse<BuildAttributes>>('/builds', { params });

    const data = response.data;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return [];
    }

    const builds = Array.isArray(data) ? data : [data];
    return builds.map((build) => ({
      id: build.id,
      version: new BuildNumber(build.attributes.version),
      uploadedDate: build.attributes.uploadedDate,
      processingState: build.attributes.processingState,
    }));
  }

  /**
   * Get pre-release versions
   */
  async getPreReleaseVersions(
    appId: string,
    version: string,
  ): Promise<ApiResource<PreReleaseVersionAttributes>[]> {
    this._ensureValidToken();

    const params = {
      'filter[app]': appId,
      'filter[version]': version,
      limit: 1,
    };

    const response = await this.httpClient.get<ApiResponse<PreReleaseVersionAttributes>>(
      '/preReleaseVersions',
      { params },
    );

    const data = response.data;
    if (!data) return [];

    return Array.isArray(data) ? data : [data];
  }

  /**
   * Create a new app store version
   */
  async createAppStoreVersion(
    appId: string,
    version: Version,
    platform: Platform,
  ): Promise<AppStoreVersion> {
    this._ensureValidToken();

    const request: CreateAppStoreVersionRequest = {
      data: {
        type: 'appStoreVersions',
        attributes: {
          platform,
          versionString: version.toString(),
        },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: appId,
            },
          },
        },
      },
    };

    const response = await this.httpClient.post<ApiResponse<AppStoreVersionAttributes>>(
      '/appStoreVersions',
      request,
    );

    const data = response.data;
    const versionData = Array.isArray(data) ? data[0] : data;
    if (!versionData) {
      throw new ApiError('Failed to create app store version', 500, null);
    }
    return AppStoreVersion.fromApiResponse(versionData);
  }

  /**
   * Refresh JWT token if needed
   */
  private _refreshToken(): void {
    this.token = this.jwtGenerator.generateToken();
    this.httpClient.setAuthToken(this.token);
  }

  /**
   * Ensure token is valid
   */
  private _ensureValidToken(): void {
    if (this.jwtGenerator.isTokenExpiringSoon(this.token)) {
      this._refreshToken();
    }
  }
}
