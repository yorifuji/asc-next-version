const appStoreService = require('./appStoreService');
const versioningService = require('./versioningService');

/**
 * Main orchestration logic for determining next version and build number
 * This service coordinates between different services and contains the main business logic
 * separated from GitHub Actions specific code
 */
async function determineNextVersion({ bundleId, platform, createNewVersion, token }) {
  let versionCreated = false;

  // Find app by bundle ID
  const app = await appStoreService.findApp(bundleId, token);
  const appId = app.id;

  // Get live version info
  const { liveVersionInfo, liveVersion } = await appStoreService.getLiveVersion(appId, token);

  // Get the maximum build number for the live version
  const liveMaxBuild = await appStoreService.getMaxBuildNumber(liveVersionInfo, appId, token);

  // Determine next version and build number
  const { version, buildNumber, action } = await versioningService.determineNextVersionAndBuild(
    liveVersion,
    liveMaxBuild,
    appId,
    token,
  );

  // Create new version if needed and flag is true
  if (action === 'new_version' && createNewVersion) {
    await appStoreService.createNewVersion(appId, version, platform, token);
    versionCreated = true;
  }

  return {
    version: version || '',
    buildNumber: buildNumber || '',
    action,
    versionCreated,
    liveVersion,
    liveMaxBuild,
  };
}

module.exports = {
  determineNextVersion,
};
