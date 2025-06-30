const core = require("@actions/core");
const { generateJwt } = require("./jwt");
const { callApi, createAppStoreVersion } = require("./api");
const { determineNextVersionAndBuild } = require("./versioning");

async function run() {
  try {
    // Get inputs
    const issuerId = core.getInput("issuer-id", { required: true });
    const keyId = core.getInput("key-id", { required: true });
    const key = core.getInput("key", { required: true });
    const bundleId = core.getInput("bundle-id", { required: true });
    const platform = core.getInput("platform", { required: false }) || "IOS";
    const createNewVersion =
      core.getInput("create-new-version", { required: false }) === "true";

    let versionCreated = false;

    core.info("Starting to determine next build version...");

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

    let liveVersionInfo, liveVersion;

    if (!versionsResponse.data || versionsResponse.data.length === 0) {
      // No live version found, try to get the latest version regardless of state
      core.info("No live version found. Checking for the latest version...");
      const latestVersionUrl = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions?sort=-createdDate&limit=1`;
      const latestVersionResponse = await callApi(latestVersionUrl, token);

      if (
        !latestVersionResponse.data ||
        latestVersionResponse.data.length === 0
      ) {
        // No version exists at all - new app case
        core.info(
          "No versions found. This appears to be a new app. Using base version 1.0.0"
        );
        liveVersion = "1.0.0";
        liveVersionInfo = null;
      } else {
        liveVersionInfo = latestVersionResponse.data[0];
        liveVersion = liveVersionInfo.attributes.versionString;
        core.info(
          `Using latest version as base: ${liveVersion} (state: ${liveVersionInfo.attributes.appStoreState})`
        );
      }
    } else {
      liveVersionInfo = versionsResponse.data[0];
      liveVersion = liveVersionInfo.attributes.versionString;
      core.info(`Found live version: ${liveVersion}`);
    }

    // Get the maximum build number for the live version
    let liveMaxBuild = 0;

    // First, try to get from the directly associated build (only if liveVersionInfo exists)
    if (liveVersionInfo) {
      const liveBuild = liveVersionInfo.relationships.build.data;
      if (liveBuild) {
        const buildUrl = `https://api.appstoreconnect.apple.com/v1/builds/${liveBuild.id}`;
        const buildResponse = await callApi(buildUrl, token);
        liveMaxBuild = parseInt(buildResponse.data.attributes.version, 10);
      }
    }

    // If no direct build or build number is 0, search via preReleaseVersion
    if (liveMaxBuild === 0) {
      const preReleaseVersionsUrl = `https://api.appstoreconnect.apple.com/v1/preReleaseVersions?filter[version]=${liveVersion}&filter[app]=${appId}&limit=1`;
      const preReleaseVersionsResponse = await callApi(
        preReleaseVersionsUrl,
        token
      );

      if (
        preReleaseVersionsResponse.data &&
        preReleaseVersionsResponse.data.length > 0
      ) {
        const preReleaseVersionId = preReleaseVersionsResponse.data[0].id;

        // Get the latest build for this preReleaseVersion
        const buildsUrl = `https://api.appstoreconnect.apple.com/v1/builds?filter[preReleaseVersion]=${preReleaseVersionId}&sort=-version&limit=1`;
        const buildsResponse = await callApi(buildsUrl, token);

        if (buildsResponse.data && buildsResponse.data.length > 0) {
          liveMaxBuild = parseInt(
            buildsResponse.data[0].attributes.version,
            10
          );
        }
      }
    }

    core.info(`Live version: ${liveVersion}, Live max build: ${liveMaxBuild}`);

    const { version, buildNumber, action } = await determineNextVersionAndBuild(
      liveVersion,
      liveMaxBuild,
      appId,
      token,
      callApi
    );

    // 新しいバージョンを作成する必要がある場合、かつフラグがtrueの場合のみ作成
    if (action === "new_version" && createNewVersion) {
      await createAppStoreVersion(appId, version, platform, token);
      versionCreated = true;
    }

    core.info(
      `Action: ${action}, Version: ${version || "N/A"}, BuildNumber: ${
        buildNumber || "N/A"
      }`
    );

    // Set outputs
    core.setOutput("version", version || "");
    core.setOutput("buildNumber", buildNumber || "");
    core.setOutput("action", action);
    core.setOutput("versionCreated", versionCreated);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
