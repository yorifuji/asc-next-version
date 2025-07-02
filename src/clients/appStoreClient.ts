import * as core from '@actions/core';
import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import type {
  ApiErrorResponse,
  AppResponse,
  AppStoreVersionResponse,
  BuildResponse,
  CreateAppStoreVersionRequest,
  PreReleaseVersionResponse,
} from '../shared/types/api.js';
import type { Platform } from '../shared/constants/index.js';

interface AppStoreVersionFilters {
  appStoreState?: string;
  versionString?: string;
  sort?: string;
  limit?: number;
}

interface BuildFilters {
  preReleaseVersion?: string;
  app?: string;
  version?: string;
  sort?: string;
  limit?: number;
}

/**
 * Generic HTTP GET request to App Store Connect API
 */
export async function get<T = unknown>(url: string, token: string): Promise<T> {
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  try {
    const response: AxiosResponse = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    core.error(`API GET failed: ${axiosError.message}`);
    if (axiosError.response) {
      core.error(`Response data: ${JSON.stringify(axiosError.response.data)}`);
    }
    throw axiosError;
  }
}

/**
 * Generic HTTP POST request to App Store Connect API
 */
export async function post<T = unknown>(url: string, data: unknown, token: string): Promise<T> {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const response: AxiosResponse = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    core.error(`API POST failed: ${axiosError.message}`);
    if (axiosError.response) {
      core.error(`Response data: ${JSON.stringify(axiosError.response.data)}`);
    }
    throw axiosError;
  }
}

/**
 * Get apps by bundle ID
 */
export async function getApps(bundleId: string, token: string): Promise<AppResponse> {
  const url = `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${bundleId}`;
  return await get<AppResponse>(url, token);
}

/**
 * Get app store versions with filters
 */
export async function getAppStoreVersions(
  appId: string,
  filters: AppStoreVersionFilters = {},
  token: string,
): Promise<AppStoreVersionResponse> {
  let url = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions`;

  const queryParams: string[] = [];
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

  return await get<AppStoreVersionResponse>(url, token);
}

/**
 * Get build for a specific app store version
 */
export async function getBuildForVersion(versionId: string, token: string): Promise<BuildResponse> {
  const url = `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${versionId}/build`;
  return await get<BuildResponse>(url, token);
}

/**
 * Get pre-release versions
 */
export async function getPreReleaseVersions(
  appId: string,
  versionString: string,
  token: string,
): Promise<PreReleaseVersionResponse> {
  const url = `https://api.appstoreconnect.apple.com/v1/preReleaseVersions?filter[version]=${versionString}&filter[app]=${appId}&limit=1`;
  return await get<PreReleaseVersionResponse>(url, token);
}

/**
 * Get builds with filters
 */
export async function getBuilds(filters: BuildFilters = {}, token: string): Promise<BuildResponse> {
  let url = 'https://api.appstoreconnect.apple.com/v1/builds';

  const queryParams: string[] = [];
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

  return await get<BuildResponse>(url, token);
}

/**
 * Create a new app store version
 */
export async function createAppStoreVersion(
  appId: string,
  versionString: string,
  platform: string,
  token: string,
): Promise<AppStoreVersionResponse> {
  const url = 'https://api.appstoreconnect.apple.com/v1/appStoreVersions';
  const data: CreateAppStoreVersionRequest = {
    data: {
      type: 'appStoreVersions',
      attributes: {
        platform: platform as Platform,
        versionString,
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

  const result = await post<AppStoreVersionResponse>(url, data, token);
  core.info(`Successfully created App Store Version ${versionString} for app ${appId}`);
  return result;
}
