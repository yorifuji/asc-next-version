const core = require('@actions/core');
const appStoreClient = require('../clients/appStoreClient');

/**
 * Find app by bundle ID
 */
async function findApp(bundleId, token) {
  const appsResponse = await appStoreClient.getApps(bundleId, token);
  if (!appsResponse.data || appsResponse.data.length === 0) {
    throw new Error(`No app found with bundle ID: ${bundleId}`);
  }
  return appsResponse.data[0];
}

/**
 * Get live version info (READY_FOR_SALE state)
 */
async function getLiveVersion(appId, token) {
  const versionsResponse = await appStoreClient.getAppStoreVersions(
    appId,
    { appStoreState: 'READY_FOR_SALE', limit: 1 },
    token,
  );

  if (!versionsResponse.data || versionsResponse.data.length === 0) {
    throw new Error('No live version found for app. This action requires a published app.');
  }

  const liveVersionInfo = versionsResponse.data[0];
  const liveVersion = liveVersionInfo.attributes.versionString;
  core.info(`Found live version: ${liveVersion}`);

  return { liveVersionInfo, liveVersion };
}

/**
 * Get build number for a specific app store version using fallback strategy
 */
async function getMaxBuildNumber(versionInfo, appId, token) {
  if (!versionInfo) {
    return 0;
  }

  const versionString = versionInfo.attributes.versionString;
  const versionId = versionInfo.id;

  // Method 1: Direct appStoreVersions/{id}/build endpoint (recommended)
  try {
    const buildResponse = await appStoreClient.getBuildForVersion(versionId, token);

    if (buildResponse.data && buildResponse.data.attributes) {
      const buildNumber = parseInt(buildResponse.data.attributes.version, 10);
      core.info(`Found build via direct endpoint for ${versionString}: ${buildNumber}`);
      return buildNumber;
    }
  } catch (error) {
    core.info(`Direct build endpoint failed for ${versionString}: ${error.message}`);
  }

  // Method 2: Fallback via preReleaseVersion
  try {
    const preReleaseVersionsResponse = await appStoreClient.getPreReleaseVersions(
      appId,
      versionString,
      token,
    );

    if (preReleaseVersionsResponse.data && preReleaseVersionsResponse.data.length > 0) {
      const preReleaseVersionId = preReleaseVersionsResponse.data[0].id;
      const buildsResponse = await appStoreClient.getBuilds(
        { preReleaseVersion: preReleaseVersionId, sort: '-version', limit: 1 },
        token,
      );

      if (buildsResponse.data && buildsResponse.data.length > 0) {
        const buildNumber = parseInt(buildsResponse.data[0].attributes.version, 10);
        core.info(
          `Found build via preReleaseVersion fallback for ${versionString}: ${buildNumber}`,
        );
        return buildNumber;
      }
    }
  } catch (error) {
    core.info(`PreReleaseVersion fallback failed for ${versionString}: ${error.message}`);
  }

  // Method 3: Direct builds search by version and app
  try {
    const directBuildsResponse = await appStoreClient.getBuilds(
      { app: appId, version: versionString, sort: '-version', limit: 1 },
      token,
    );

    if (directBuildsResponse.data && directBuildsResponse.data.length > 0) {
      const buildNumber = parseInt(directBuildsResponse.data[0].attributes.version, 10);
      core.info(`Found build via direct builds search for ${versionString}: ${buildNumber}`);
      return buildNumber;
    }
  } catch (error) {
    core.info(`Direct builds search failed for ${versionString}: ${error.message}`);
  }

  core.info(`No build found for ${versionString}, returning 0`);
  return 0;
}

/**
 * Create a new app store version
 */
async function createNewVersion(appId, versionString, platform, token) {
  return await appStoreClient.createAppStoreVersion(appId, versionString, platform, token);
}

/**
 * Check if a specific version exists
 */
async function checkVersionExists(appId, versionString, token) {
  const nextVersionResponse = await appStoreClient.getAppStoreVersions(
    appId,
    { versionString: versionString },
    token,
  );

  if (!nextVersionResponse.data || nextVersionResponse.data.length === 0) {
    return null;
  }

  return nextVersionResponse.data[0];
}

module.exports = {
  findApp,
  getLiveVersion,
  getMaxBuildNumber,
  createNewVersion,
  checkVersionExists,
};
