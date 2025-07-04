import type { AppStoreState, PlatformType } from '../constants/index.js';

// ===== Base API Types =====

export interface ApiResourceAttributes {
  [key: string]:
    | string
    | number
    | boolean
    | Date
    | null
    | undefined
    | ApiResourceAttributes
    | ApiResourceAttributes[];
}

export interface ApiResourceRelationship {
  data?: ApiResourceIdentifier | ApiResourceIdentifier[];
  links?: ApiLinks;
}

export interface ApiResourceRelationships {
  [key: string]: ApiResourceRelationship;
}

export interface ApiResourceIdentifier {
  readonly type: string;
  readonly id: string;
}

export interface ApiResource<T extends ApiResourceAttributes = ApiResourceAttributes> {
  type: string;
  id: string;
  attributes: T;
  relationships?: ApiResourceRelationships;
  links?: ApiLinks;
}

export interface ApiLinks {
  readonly self?: string;
  readonly related?: string;
  readonly next?: string;
}

export interface ApiPaging {
  readonly total: number;
  readonly limit: number;
}

export interface ApiMeta {
  readonly paging?: ApiPaging;
}

export interface ApiResponse<T extends ApiResourceAttributes = ApiResourceAttributes> {
  readonly data: ApiResource<T> | ApiResource<T>[];
  readonly included?: ApiResource[];
  readonly links?: ApiLinks;
  readonly meta?: ApiMeta;
}

export interface ApiErrorSource {
  readonly parameter?: string;
  readonly pointer?: string;
}

export interface ApiError {
  readonly id?: string;
  readonly status?: string;
  readonly code?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly source?: ApiErrorSource;
}

export interface ApiErrorResponse {
  readonly errors: readonly ApiError[];
}

// ===== App Store Connect Resource Types =====
export interface AppAttributes extends ApiResourceAttributes {
  readonly bundleId: string;
  readonly name: string;
  readonly sku: string;
  readonly primaryLocale: string;
}

export interface AppStoreVersionAttributes extends ApiResourceAttributes {
  readonly versionString: string;
  readonly appStoreState: AppStoreState;
  readonly platform: PlatformType;
  readonly createdDate: string;
  readonly downloadable?: boolean;
  readonly releaseType?: 'MANUAL' | 'SCHEDULED' | 'AUTOMATIC';
}

export interface BuildAttributes extends ApiResourceAttributes {
  readonly version: string;
  readonly uploadedDate: string;
  readonly processingState: 'PROCESSING' | 'VALID' | 'INVALID' | 'FAILED';
  readonly expired?: boolean;
  readonly minOsVersion?: string;
  readonly lsMinimumSystemVersion?: string;
  readonly computedMinMacOsVersion?: string;
  readonly iconAssetToken?: string;
  readonly usesNonExemptEncryption?: boolean;
}

export interface PreReleaseVersionAttributes extends ApiResourceAttributes {
  readonly version: string;
  readonly platform: PlatformType;
}

// ===== API Request Types =====
export interface CreateAppStoreVersionRequestData {
  readonly type: 'appStoreVersions';
  readonly attributes: {
    readonly platform: PlatformType;
    readonly versionString: string;
  };
  readonly relationships: {
    readonly app: {
      readonly data: ApiResourceIdentifier;
    };
  };
}

export interface CreateAppStoreVersionRequest {
  readonly data: CreateAppStoreVersionRequestData;
}

// ===== Error Types =====
export interface ErrorDetails {
  readonly field?: string;
  readonly value?: string | number | boolean | null;
  readonly reason?: string;
  readonly statusCode?: number;
  readonly response?: ApiErrorResponse | Record<string, unknown>;
}

export interface ErrorWithDetails extends Error {
  readonly details?: ErrorDetails;
  readonly code?: string;
  readonly statusCode?: number;
}
