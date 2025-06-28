const core = require('@actions/core');

async function determineNextVersionAndBuild(liveVersion, liveMaxBuild, appId, token, callApi) {
  // 3. Calculate next version
  const versionParts = liveVersion.split('.').map(Number);
  versionParts[2] += 1;
  const nextVersion = versionParts.join('.');
  core.info(`Calculated next version: ${nextVersion}`);

  // 4. Check if next version exists
  const nextVersionUrl = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions?filter[versionString]=${nextVersion}`;
  const nextVersionResponse = await callApi(nextVersionUrl, token);

  let version, buildNumber, action;

  if (!nextVersionResponse.data || nextVersionResponse.data.length === 0) {
    // 3-A: New version
    core.info(`Version ${nextVersion} does not exist. Creating new version.`);
    version = nextVersion;
    buildNumber = liveMaxBuild + 1;
    action = 'new_version';
  } else {
    // 3-B: Version exists
    const nextVersionInfo = nextVersionResponse.data[0];
    const state = nextVersionInfo.attributes.appStoreState;
    core.info(`Version ${nextVersion} exists with state: ${state}`);

    const incrementStates = [
      'PREPARE_FOR_SUBMISSION',
      'REJECTED',
      'DEVELOPER_REJECTED',
      'METADATA_REJECTED',
      'WAITING_FOR_REVIEW',
      'IN_REVIEW'
    ];

    if (incrementStates.includes(state)) {
      // Get preReleaseVersion ID for the nextVersion
      const preReleaseVersionsUrl = `https://api.appstoreconnect.apple.com/v1/preReleaseVersions?filter[version]=${nextVersion}&filter[app]=${appId}&limit=1`;
      const preReleaseVersionsResponse = await callApi(preReleaseVersionsUrl, token);

      let maxBuild = 0;
      if (preReleaseVersionsResponse.data && preReleaseVersionsResponse.data.length > 0) {
        const preReleaseVersionId = preReleaseVersionsResponse.data[0].id;

        // Get builds associated with this preReleaseVersion, sorted by version (build number)
        const buildsUrl = `https://api.appstoreconnect.apple.com/v1/builds?filter[preReleaseVersion]=${preReleaseVersionId}&sort=-version&limit=1`;
        const buildsResponse = await callApi(buildsUrl, token);

        if (buildsResponse.data && buildsResponse.data.length > 0) {
          maxBuild = parseInt(buildsResponse.data[0].attributes.version, 10);
        }
      }
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
