const core = require('@actions/core');
const axios = require('axios');

/**
 * Generic HTTP GET request to App Store Connect API
 */
async function get(url, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    core.error(`API GET failed: ${error.message}`);
    if (error.response) {
      core.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Generic HTTP POST request to App Store Connect API
 */
async function post(url, data, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    core.error(`API POST failed: ${error.message}`);
    if (error.response) {
      core.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Get apps by bundle ID
 */
async function getApps(bundleId, token) {
  const url = `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${bundleId}`;
  return await get(url, token);
}

/**
 * Get app store versions with filters
 */
async function getAppStoreVersions(appId, filters = {}, token) {
  let url = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions`;

  const queryParams = [];
  if (filters.appStoreState) {
    queryParams.push(`filter[appStoreState]=${filters.appStoreState}`);
  }
  if (filters.versionString) {
    queryParams.push(`filter[versionString]=${filters.versionString}`);
  }
  if (filters.sort) {
    queryParams.push(`sort=${filters.sort}`);
  }
  if (filters.limit) {
    queryParams.push(`limit=${filters.limit}`);
  }

  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  return await get(url, token);
}

/**
 * Get build for a specific app store version
 */
async function getBuildForVersion(versionId, token) {
  const url = `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${versionId}/build`;
  return await get(url, token);
}

/**
 * Get pre-release versions
 */
async function getPreReleaseVersions(appId, versionString, token) {
  const url = `https://api.appstoreconnect.apple.com/v1/preReleaseVersions?filter[version]=${versionString}&filter[app]=${appId}&limit=1`;
  return await get(url, token);
}

/**
 * Get builds with filters
 */
async function getBuilds(filters = {}, token) {
  let url = 'https://api.appstoreconnect.apple.com/v1/builds';

  const queryParams = [];
  if (filters.preReleaseVersion) {
    queryParams.push(`filter[preReleaseVersion]=${filters.preReleaseVersion}`);
  }
  if (filters.app) {
    queryParams.push(`filter[app]=${filters.app}`);
  }
  if (filters.version) {
    queryParams.push(`filter[version]=${filters.version}`);
  }
  if (filters.sort) {
    queryParams.push(`sort=${filters.sort}`);
  }
  if (filters.limit) {
    queryParams.push(`limit=${filters.limit}`);
  }

  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  return await get(url, token);
}

/**
 * Create a new app store version
 */
async function createAppStoreVersion(appId, versionString, platform, token) {
  const url = 'https://api.appstoreconnect.apple.com/v1/appStoreVersions';
  const data = {
    data: {
      type: 'appStoreVersions',
      attributes: {
        platform: platform,
        versionString: versionString,
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

  const result = await post(url, data, token);
  core.info(`Successfully created App Store Version ${versionString} for app ${appId}`);
  return result;
}

module.exports = {
  get,
  post,
  getApps,
  getAppStoreVersions,
  getBuildForVersion,
  getPreReleaseVersions,
  getBuilds,
  createAppStoreVersion,
};
