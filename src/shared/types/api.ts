/**
 * API Response Types for App Store Connect
 */

import type { AppStoreState, Platform } from '../constants/index.js';

// Base types for API responses
export interface ApiResourceAttributes {
  [key: string]: unknown;
}

export interface ApiResourceRelationships {
  [key: string]: {
    data?: ApiResourceIdentifier | ApiResourceIdentifier[];
    links?: ApiLinks;
  };
}

export interface ApiResourceIdentifier {
  type: string;
  id: string;
}

export interface ApiResource<T extends ApiResourceAttributes = ApiResourceAttributes> {
  type: string;
  id: string;
  attributes: T;
  relationships?: ApiResourceRelationships;
  links?: ApiLinks;
}

export interface ApiLinks {
  self?: string;
  related?: string;
  next?: string;
}

export interface ApiResponse<T extends ApiResourceAttributes = ApiResourceAttributes> {
  data: ApiResource<T> | ApiResource<T>[];
  included?: ApiResource[];
  links?: ApiLinks;
  meta?: {
    paging?: {
      total: number;
      limit: number;
    };
  };
}

export interface ApiError {
  id?: string;
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: {
    parameter?: string;
    pointer?: string;
  };
}

export interface ApiErrorResponse {
  errors: ApiError[];
}

// Specific App Store Connect types
export interface AppAttributes extends ApiResourceAttributes {
  bundleId: string;
  name: string;
  sku: string;
  primaryLocale: string;
}

export interface AppStoreVersionAttributes extends ApiResourceAttributes {
  versionString: string;
  appStoreState: AppStoreState;
  platform: Platform;
  createdDate: string;
  downloadable?: boolean;
  releaseType?: string;
}

export interface BuildAttributes extends ApiResourceAttributes {
  version: string;
  uploadedDate: string;
  processingState: string;
  expired?: boolean;
  minOsVersion?: string;
  lsMinimumSystemVersion?: string;
  computedMinMacOsVersion?: string;
  iconAssetToken?: string;
  usesNonExemptEncryption?: boolean;
}

export interface PreReleaseVersionAttributes extends ApiResourceAttributes {
  version: string;
  platform: Platform;
}

// Response types
export type AppResponse = ApiResponse<AppAttributes>;
export type AppStoreVersionResponse = ApiResponse<AppStoreVersionAttributes>;
export type BuildResponse = ApiResponse<BuildAttributes>;
export type PreReleaseVersionResponse = ApiResponse<PreReleaseVersionAttributes>;

// Request body types
export interface CreateAppStoreVersionRequest {
  data: {
    type: 'appStoreVersions';
    attributes: {
      platform: Platform;
      versionString: string;
    };
    relationships: {
      app: {
        data: ApiResourceIdentifier;
      };
    };
  };
}

// HTTP client types
export interface HttpRequestConfig {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// Error types with proper typing
export interface ErrorDetails {
  field?: string;
  value?: unknown;
  reason?: string;
  statusCode?: number;
  response?: ApiErrorResponse | unknown;
}

export interface ErrorWithDetails extends Error {
  details?: ErrorDetails;
  code?: string;
  statusCode?: number;
}
