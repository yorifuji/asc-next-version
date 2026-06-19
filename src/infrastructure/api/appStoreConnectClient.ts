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

interface HttpRequestOptions {
  readonly params?: Record<string, string | number>;
  readonly body?: unknown;
}

export class AppStoreConnectApiClient {
  private readonly _jwtGenerator: JwtGenerator;
  private _currentToken: string = '';

  constructor(config: { jwtGenerator: JwtGenerator }) {
    this._jwtGenerator = config.jwtGenerator;
    this._refreshAuthToken();
  }

  async findApplicationByBundleId(bundleId: string): Promise<Application> {
    this._ensureValidToken();

    const response = await this._request<ApiResponse<AppAttributes>>('GET', '/apps', {
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

    const response = await this._request<ApiResponse<AppStoreVersionAttributes>>(
      'GET',
      `/apps/${appId}/appStoreVersions`,
      { params },
    );

    const data = response.data.data;
    const versions = Array.isArray(data) ? data : [data];
    return versions.map((versionData) => AppStoreVersion.createFromApiResponse(versionData));
  }

  async fetchBuildNumberForVersion(versionId: string): Promise<BuildNumber> {
    this._ensureValidToken();

    const response = await this._request<ApiResponse<BuildAttributes>>(
      'GET',
      `/appStoreVersions/${versionId}/build`,
    );

    const data = response.data.data;
    const build = Array.isArray(data) ? data[0] : data;

    if (!build?.attributes) {
      return new BuildNumber(0);
    }

    const versionString = build.attributes.version;
    const versionNumber = parseInt(versionString, 10);

    if (isNaN(versionNumber)) {
      throw createApiError(`Invalid build version: ${versionString}`, 400, null);
    }

    return new BuildNumber(versionNumber);
  }

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

    const response = await this._request<ApiResponse<BuildAttributes>>('GET', '/builds', {
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

    const response = await this._request<ApiResponse<AppStoreVersionAttributes>>(
      'POST',
      '/appStoreVersions',
      { body: request },
    );

    const data = response.data.data;
    const versionData = Array.isArray(data) ? data[0] : data;
    if (!versionData) {
      throw createApiError('Failed to create app store version', 500, null);
    }

    return AppStoreVersion.createFromApiResponse(versionData);
  }

  private async _request<T>(
    method: 'GET' | 'POST',
    path: string,
    options: HttpRequestOptions = {},
  ): Promise<{ data: T }> {
    const relativePath = path.replace(/^\/+/, '');
    const url = new URL(relativePath, `${APP_STORE_CONNECT_API.BASE_URL}/`);
    for (const [key, value] of Object.entries(options.params ?? {})) {
      url.searchParams.set(key, String(value));
    }

    console.info(`  └─ [API] ${method} ${path}`);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this._currentToken}`,
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(APP_STORE_CONNECT_API.TIMEOUT_MS),
      });

      const data = (await response.json()) as T | ApiErrorResponse;
      if (!response.ok) {
        throw this._createApiError(response.status, data as ApiErrorResponse);
      }

      return { data: data as T };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'ApplicationError') {
          throw error;
        }

        console.error('[API] Request error:', error.message);
        throw createApiError(`Network error: ${error.message}`, 0, null);
      }

      throw createApiError('Network error: Unknown error', 0, null);
    }
  }

  private _createApiError(status: number, data: ApiErrorResponse): Error {
    let message = `API request failed with status ${status}`;

    if (data.errors.length > 0) {
      const firstError = data.errors[0];
      if (firstError) {
        message = firstError.detail || firstError.title || message;
      }
    }

    return createApiError(message, status, data);
  }

  private _refreshAuthToken(): void {
    this._currentToken = this._jwtGenerator.generateAuthToken();
  }

  private _ensureValidToken(): void {
    if (this._jwtGenerator.isTokenExpiringSoon(this._currentToken)) {
      this._refreshAuthToken();
    }
  }
}

export { AppStoreConnectApiClient as AppStoreConnectClient };
