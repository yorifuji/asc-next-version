const core = require('@actions/core');
const axios = require('axios');

async function callApi(url, token) {
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    core.error(`API call failed: ${error.message}`);
    if (error.response) {
      core.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function createAppStoreVersion(appId, versionString, platform, token) {
  const url = `https://api.appstoreconnect.apple.com/v1/appStoreVersions`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
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

  try {
    const response = await axios.post(url, data, { headers });
    core.info(`Successfully created App Store Version ${versionString} for app ${appId}`);
    return response.data;
  } catch (error) {
    core.error(`Failed to create App Store Version: ${error.message}`);
    if (error.response) {
      core.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

module.exports = {
  callApi,
  createAppStoreVersion,
};
