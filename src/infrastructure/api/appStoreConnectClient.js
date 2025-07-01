'use strict';

const HttpClient = require('./httpClient');
const App = require('../../domain/entities/app');
const AppStoreVersion = require('../../domain/entities/appStoreVersion');
const BuildNumber = require('../../domain/valueObjects/buildNumber');
const { ApiError } = require('../../shared/errors/customErrors');

/**
 * Client for App Store Connect API
 */
class AppStoreConnectClient {
  constructor(jwtGenerator) {
    this.httpClient = new HttpClient();
    this.jwtGenerator = jwtGenerator;
    this._refreshToken();
  }

  /**
   * Find app by bundle ID
   */
  async findApp(bundleId) {
    this._ensureValidToken();

    const response = await this.httpClient.get('/apps', {
      params: {
        'filter[bundleId]': bundleId,
      },
    });

    if (!response.data || response.data.length === 0) {
      throw new ApiError(`No app found with bundle ID: ${bundleId}`, 404, null);
    }

    return App.fromApiResponse(response.data[0]);
  }

  /**
   * Get app store versions
   */
  async getAppStoreVersions(appId, filters = {}) {
    this._ensureValidToken();

    const params = {};
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

    const response = await this.httpClient.get(`/apps/${appId}/appStoreVersions`, { params });

    return response.data.map((data) => AppStoreVersion.fromApiResponse(data));
  }

  /**
   * Get build for a specific version
   */
  async getBuildForVersion(versionId) {
    this._ensureValidToken();

    try {
      const response = await this.httpClient.get(`/appStoreVersions/${versionId}/build`);

      if (response.data && response.data.attributes) {
        return new BuildNumber(response.data.attributes.version);
      }

      return new BuildNumber(0);
    } catch (error) {
      if (error.statusCode === 404) {
        // No build associated with this version yet
        return new BuildNumber(0);
      }
      throw error;
    }
  }

  /**
   * Get builds for an app
   */
  async getBuilds(appId, filters = {}) {
    this._ensureValidToken();

    const params = {
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

    const response = await this.httpClient.get('/builds', { params });

    if (!response.data || response.data.length === 0) {
      return [];
    }

    return response.data.map((build) => ({
      id: build.id,
      version: new BuildNumber(build.attributes.version),
      uploadedDate: build.attributes.uploadedDate,
      processingState: build.attributes.processingState,
    }));
  }

  /**
   * Get pre-release versions
   */
  async getPreReleaseVersions(appId, version) {
    this._ensureValidToken();

    const params = {
      'filter[app]': appId,
      'filter[version]': version,
      limit: 1,
    };

    const response = await this.httpClient.get('/preReleaseVersions', { params });

    return response.data || [];
  }

  /**
   * Create a new app store version
   */
  async createAppStoreVersion(appId, version, platform) {
    this._ensureValidToken();

    const data = {
      data: {
        type: 'appStoreVersions',
        attributes: {
          platform: platform,
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

    const response = await this.httpClient.post('/appStoreVersions', data);

    return AppStoreVersion.fromApiResponse(response.data);
  }

  /**
   * Refresh JWT token if needed
   */
  _refreshToken() {
    this.token = this.jwtGenerator.generateToken();
    this.httpClient.setAuthToken(this.token);
  }

  /**
   * Ensure token is valid
   */
  _ensureValidToken() {
    if (this.jwtGenerator.isTokenExpiringSoon(this.token)) {
      this._refreshToken();
    }
  }
}

module.exports = AppStoreConnectClient;
