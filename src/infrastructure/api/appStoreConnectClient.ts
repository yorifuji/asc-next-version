import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import { Application } from '../../domain/entities/app.js';
import { AppStoreVersion } from '../../domain/entities/appStoreVersion.js';
import { BuildNumber } from '../../domain/valueObjects/buildNumber.js';
import type { Version } from '../../domain/valueObjects/version.js';
import { createApiError } from '../../shared/errors/customErrors.js';
import { APP_STORE_CONNECT_API } from '../../shared/constants/index.js';
import type { JwtGenerator } from '../auth/jwtGenerator.js';
import type { AppStoreState, PlatformType } from '../../shared/constants/index.js';
import type {
  ApiErrorResponse,
  ApiResponse,
  AppAttributes,
  AppStoreVersionAttributes,
  BuildAttributes,
  CreateAppStoreVersionRequest,
} from '../../shared/types/api.js';

// ===== Type Definitions =====

export interface VersionFilterOptions {
  readonly state?: AppStoreState;
  readonly version?: string;
  readonly platform?: PlatformType;
  readonly limit?: number;
}

export interface BuildFilterOptions {
  readonly limit?: number;
  readonly version?: string;
  readonly preReleaseVersion?: string;
}

export interface BuildInfo {
  readonly id: string;
  readonly version: BuildNumber;
  readonly uploadedDate: string;
  readonly processingState: string;
}

// ===== App Store Connect API Client =====

export class AppStoreConnectApiClient {
  private readonly _httpClient: AxiosInstance;
  private readonly _jwtGenerator: JwtGenerator;
  private _currentToken: string = '';

  constructor(config: { jwtGenerator: JwtGenerator }) {
    this._httpClient = axios.create({
      baseURL: APP_STORE_CONNECT_API.BASE_URL,
      timeout: APP_STORE_CONNECT_API.TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this._jwtGenerator = config.jwtGenerator;
    this._refreshAuthToken();
    this._configureInterceptors();
  }

  /**
   * Search for an application by bundle identifier
   */
  async findApplicationByBundleId(bundleId: string): Promise<Application> {
    this._ensureValidToken();

    const response = await this._httpClient.get<ApiResponse<AppAttributes>>('/apps', {
      params: {
        'filter[bundleId]': bundleId,
      },
    });

    const data = response.data.data;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw createApiError(`No app found with bundle ID: ${bundleId}`, 404, null);
    }

    const appData = Array.isArray(data) ? data[0] : data;
    if (!appData) {
      throw createApiError(`No app found with bundle ID: ${bundleId}`, 404, null);
    }
    return Application.createFromApiResponse(appData);
  }

  /**
   * Retrieve app store versions with optional filters
   */
  async fetchAppStoreVersions(
    appId: string,
    filters: VersionFilterOptions = {},
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
    if (filters.limit) {
      params.limit = filters.limit;
    }

    const response = await this._httpClient.get<ApiResponse<AppStoreVersionAttributes>>(
      `/apps/${appId}/appStoreVersions`,
      { params },
    );

    const data = response.data.data;
    const versions = Array.isArray(data) ? data : [data];
    return versions.map((versionData) => AppStoreVersion.createFromApiResponse(versionData));
  }

  /**
   * Get build for a specific version
   */
  async fetchBuildNumberForVersion(versionId: string): Promise<BuildNumber> {
    this._ensureValidToken();

    const response = await this._httpClient.get<ApiResponse<BuildAttributes>>(
      `/appStoreVersions/${versionId}/build`,
    );

    const data = response.data.data;
    const build = Array.isArray(data) ? data[0] : data;

    if (!build?.attributes) {
      // Return 0 for INCREMENT_BUILD case where version exists but no builds yet
      return new BuildNumber(0);
    }

    const versionString = build.attributes.version;
    const versionNumber = parseInt(versionString, 10);

    if (isNaN(versionNumber)) {
      throw createApiError(`Invalid build version: ${versionString}`, 400, null);
    }
    const buildNumber = new BuildNumber(versionNumber);
    return buildNumber;
  }

  /**
   * Get builds for an app
   */
  async fetchBuilds(appId: string, filters: BuildFilterOptions = {}): Promise<BuildInfo[]> {
    this._ensureValidToken();

    const params: Record<string, string | number> = {
      'filter[app]': appId,
      sort: '-version',
      limit: filters.limit || 10,
    };

    if (filters.version) {
      params['filter[version]'] = filters.version;
    }
    if (filters.preReleaseVersion) {
      params['filter[preReleaseVersion]'] = filters.preReleaseVersion;
    }

    const response = await this._httpClient.get<ApiResponse<BuildAttributes>>('/builds', {
      params,
    });

    const data = response.data.data;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return [];
    }

    const builds = Array.isArray(data) ? data : [data];
    return builds.map((build) => ({
      id: build.id,
      version: new BuildNumber(parseInt(build.attributes.version, 10)),
      uploadedDate: build.attributes.uploadedDate,
      processingState: build.attributes.processingState,
    }));
  }

  /**
   * Create a new app store version entry
   */
  async createNewAppStoreVersion(
    appId: string,
    version: Version,
    platform: PlatformType,
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

    const response = await this._httpClient.post<ApiResponse<AppStoreVersionAttributes>>(
      '/appStoreVersions',
      request,
    );

    const data = response.data.data;
    const versionData = Array.isArray(data) ? data[0] : data;
    if (!versionData) {
      throw createApiError('Failed to create app store version', 500, null);
    }
    return AppStoreVersion.createFromApiResponse(versionData);
  }

  /**
   * Configure HTTP interceptors for logging and error handling
   */
  private _configureInterceptors(): void {
    // Request interceptor for logging
    this._httpClient.interceptors.request.use(
      (config) => {
        console.info(`  └─ [API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error.message);
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling
    this._httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        if (!error.response) {
          throw createApiError(`Network error: ${error.message}`, 0, null);
        }

        const { status, data } = error.response;
        let message = `API request failed with status ${status}`;

        if (data?.errors && data.errors.length > 0) {
          const firstError = data.errors[0];
          if (firstError) {
            message = firstError.detail || firstError.title || message;
          }
        }

        throw createApiError(message, status, data);
      },
    );
  }

  /**
   * Refresh authentication token
   */
  private _refreshAuthToken(): void {
    this._currentToken = this._jwtGenerator.generateAuthToken();
    this._httpClient.defaults.headers.common['Authorization'] = `Bearer ${this._currentToken}`;
  }

  /**
   * Ensure token is valid
   */
  private _ensureValidToken(): void {
    if (this._jwtGenerator.isTokenExpiringSoon(this._currentToken)) {
      this._refreshAuthToken();
    }
  }
}

// Backward compatibility alias
export { AppStoreConnectApiClient as AppStoreConnectClient };
