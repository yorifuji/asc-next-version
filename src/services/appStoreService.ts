import * as core from '@actions/core';
import * as appStoreClient from '../clients/appStoreClient.js';
import type {
  ApiResource,
  AppAttributes,
  AppStoreVersionAttributes,
  ErrorWithDetails,
} from '../shared/types/api.js';

type VersionInfo = ApiResource<AppStoreVersionAttributes>;

/**
 * Find app by bundle ID
 */
export async function findApp(bundleId: string, token: string): Promise<ApiResource<AppAttributes>> {
  const appsResponse = await appStoreClient.getApps(bundleId, token);
  const data = appsResponse.data;
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error(`No app found with bundle ID: ${bundleId}`);
  }
  
  const app = Array.isArray(data) ? data[0] : data;
  if (!app) {
    throw new Error(`No app found with bundle ID: ${bundleId}`);
  }
  return app;
}

/**
 * Get live version info (READY_FOR_SALE state)
 */
export async function getLiveVersion(
  appId: string,
  token: string,
): Promise<{ liveVersionInfo: ApiResource<AppStoreVersionAttributes>; liveVersion: string }> {
  const versionsResponse = await appStoreClient.getAppStoreVersions(
    appId,
    { appStoreState: 'READY_FOR_SALE', limit: 1 },
    token,
  );

  const data = versionsResponse.data;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error('No live version found for app. This action requires a published app.');
  }

  const liveVersionInfo = Array.isArray(data) ? data[0] : data;
  if (!liveVersionInfo) {
    throw new Error('No live version found for app. This action requires a published app.');
  }
  
  const liveVersion = liveVersionInfo.attributes.versionString;
  core.info(`Found live version: ${liveVersion}`);

  return { liveVersionInfo, liveVersion };
}

/**
 * Get build number for a specific app store version using fallback strategy
 */
export async function getMaxBuildNumber(
  versionInfo: VersionInfo | null,
  appId: string,
  token: string,
): Promise<number> {
  if (!versionInfo) {
    return 0;
  }

  const versionString = versionInfo.attributes.versionString;
  const versionId = versionInfo.id;

  // Method 1: Direct appStoreVersions/{id}/build endpoint (recommended)
  try {
    const buildResponse = await appStoreClient.getBuildForVersion(versionId, token);
    const buildData = buildResponse.data;
    const build = Array.isArray(buildData) ? buildData[0] : buildData;

    if (build?.attributes) {
      const buildNumber = parseInt(build.attributes.version, 10);
      core.info(`Found build via direct endpoint for ${versionString}: ${buildNumber}`);
      return buildNumber;
    }
  } catch (error) {
    const err = error as ErrorWithDetails;
    core.info(`Direct build endpoint failed for ${versionString}: ${err.message}`);
  }

  // Method 2: Fallback via preReleaseVersion
  try {
    const preReleaseVersionsResponse = await appStoreClient.getPreReleaseVersions(
      appId,
      versionString,
      token,
    );

    const preReleaseData = preReleaseVersionsResponse.data;
    const preReleaseVersions = Array.isArray(preReleaseData) ? preReleaseData : [preReleaseData];
    
    if (preReleaseVersions.length > 0 && preReleaseVersions[0]) {
      const preReleaseVersionId = preReleaseVersions[0].id;
      const buildsResponse = await appStoreClient.getBuilds(
        { preReleaseVersion: preReleaseVersionId, sort: '-version', limit: 1 },
        token,
      );

      const buildsData = buildsResponse.data;
      const builds = Array.isArray(buildsData) ? buildsData : [buildsData];
      
      if (builds.length > 0 && builds[0]) {
        const buildNumber = parseInt(builds[0].attributes.version, 10);
        core.info(
          `Found build via preReleaseVersion fallback for ${versionString}: ${buildNumber}`,
        );
        return buildNumber;
      }
    }
  } catch (error) {
    const err = error as ErrorWithDetails;
    core.info(`PreReleaseVersion fallback failed for ${versionString}: ${err.message}`);
  }

  // Method 3: Direct builds search by version and app
  try {
    const directBuildsResponse = await appStoreClient.getBuilds(
      { app: appId, version: versionString, sort: '-version', limit: 1 },
      token,
    );

    const directBuildsData = directBuildsResponse.data;
    const directBuilds = Array.isArray(directBuildsData) ? directBuildsData : [directBuildsData];
    
    if (directBuilds.length > 0 && directBuilds[0]) {
      const buildNumber = parseInt(directBuilds[0].attributes.version, 10);
      core.info(`Found build via direct builds search for ${versionString}: ${buildNumber}`);
      return buildNumber;
    }
  } catch (error) {
    const err = error as ErrorWithDetails;
    core.info(`Direct builds search failed for ${versionString}: ${err.message}`);
  }

  core.info(`No build found for ${versionString}, returning 0`);
  return 0;
}

/**
 * Create a new app store version
 */
export async function createNewVersion(
  appId: string,
  versionString: string,
  platform: string,
  token: string,
): Promise<ApiResource<AppStoreVersionAttributes>> {
  const response = await appStoreClient.createAppStoreVersion(appId, versionString, platform, token);
  const data = response.data;
  const version = Array.isArray(data) ? data[0] : data;
  if (!version) {
    throw new Error('Failed to create app store version');
  }
  return version;
}

/**
 * Check if a specific version exists
 */
export async function checkVersionExists(
  appId: string,
  versionString: string,
  token: string,
): Promise<ApiResource<AppStoreVersionAttributes> | null> {
  const nextVersionResponse = await appStoreClient.getAppStoreVersions(
    appId,
    { versionString },
    token,
  );

  const data = nextVersionResponse.data;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const version = Array.isArray(data) ? data[0] : data;
  return version || null;
}
