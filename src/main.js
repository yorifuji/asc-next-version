const core = require('@actions/core');
const { generateJwt } = require('./jwt');
const { callApi } = require('./api');
const { determineNextVersionAndBuild } = require('./versioning');

async function run() {
  try {
    // Get inputs
    const issuerId = core.getInput('issuer-id', { required: true });
    const keyId = core.getInput('key-id', { required: true });
    const key = core.getInput('key', { required: true });
    const bundleId = core.getInput('bundle-id', { required: true });
    const platform = core.getInput('platform', { required: false }) || 'IOS';
    const createNewVersion = core.getInput('create-new-version', { required: false }) === 'true';

    let versionCreated = false;

    core.info('Starting to determine next build version...');

    const token = generateJwt(issuerId, keyId, key);

    // 1. Get app id
    const appsUrl = `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${bundleId}`;
    const appsResponse = await callApi(appsUrl, token);
    if (!appsResponse.data || appsResponse.data.length === 0) {
      throw new Error(`No app found with bundle ID: ${bundleId}`);
    }
    const appId = appsResponse.data[0].id;

    // 2. Get live version info
    const appStoreVersionsUrl = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions?filter[appStoreState]=READY_FOR_SALE&limit=1`;
    const versionsResponse = await callApi(appStoreVersionsUrl, token);
    if (!versionsResponse.data || versionsResponse.data.length === 0) {
      throw new Error('No live version found for the app.');
    }
    const liveVersionInfo = versionsResponse.data[0];
    const liveVersion = liveVersionInfo.attributes.versionString;
    const liveBuild = liveVersionInfo.relationships.build.data;
    let liveMaxBuild = 0;
    if (liveBuild) {
      const buildUrl = `https://api.appstoreconnect.apple.com/v1/builds/${liveBuild.id}`;
      const buildResponse = await callApi(buildUrl, token);
      liveMaxBuild = parseInt(buildResponse.data.attributes.version, 10);
    }

    core.info(`Live version: ${liveVersion}, Live max build: ${liveMaxBuild}`);

    const { version, buildNumber, action } = await determineNextVersionAndBuild(liveVersion, liveMaxBuild, appId, token, callApi);

    // 新しいバージョンを作成する必要がある場合、かつフラグがtrueの場合のみ作成
    if (action === 'new_version' && createNewVersion) {
      await callApi.createAppStoreVersion(appId, version, platform, token);
      versionCreated = true;
    }

    core.info(`Action: ${action}, Version: ${version}, BuildNumber: ${buildNumber}`);

    // Set outputs
    core.setOutput('version', version);
    core.setOutput('buildNumber', buildNumber);
    core.setOutput('action', action);
    core.setOutput('versionCreated', versionCreated);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
