const core = require('@actions/core');
const appStoreService = require('./appStoreService');

/**
 * Determine next version and build number based on current state
 */
async function determineNextVersionAndBuild(liveVersion, liveMaxBuild, appId, token) {
  // Calculate next version
  const versionParts = liveVersion.split('.').map(Number);
  versionParts[2] += 1;
  const nextVersion = versionParts.join('.');
  core.info(`Calculated next version: ${nextVersion}`);

  // Check if next version exists
  const nextVersionInfo = await appStoreService.checkVersionExists(appId, nextVersion, token);

  let version, buildNumber, action;

  if (!nextVersionInfo) {
    // New version case
    core.info(`Version ${nextVersion} does not exist. Creating new version.`);
    version = nextVersion;
    buildNumber = liveMaxBuild + 1;
    action = 'new_version';
  } else {
    // Version exists
    const state = nextVersionInfo.attributes.appStoreState;
    core.info(`Version ${nextVersion} exists with state: ${state}`);

    const incrementStates = [
      'PREPARE_FOR_SUBMISSION',
      'REJECTED',
      'DEVELOPER_REJECTED',
      'METADATA_REJECTED',
      'WAITING_FOR_REVIEW',
      'IN_REVIEW',
    ];

    if (incrementStates.includes(state)) {
      // Get existing build number for this version
      const maxBuild = await appStoreService.getMaxBuildNumber(nextVersionInfo, appId, token);

      version = nextVersion;
      buildNumber = maxBuild + 1;
      action = 'increment_build';
    } else {
      action = 'skip';
    }
  }

  return { version, buildNumber, action };
}

module.exports = {
  determineNextVersionAndBuild,
};
