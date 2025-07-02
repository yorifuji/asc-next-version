/**
 * App Store state constants
 */
export const APP_STORE_STATES = {
  READY_FOR_SALE: 'READY_FOR_SALE',
  PREPARE_FOR_SUBMISSION: 'PREPARE_FOR_SUBMISSION',
  REJECTED: 'REJECTED',
  DEVELOPER_REJECTED: 'DEVELOPER_REJECTED',
  METADATA_REJECTED: 'METADATA_REJECTED',
  WAITING_FOR_REVIEW: 'WAITING_FOR_REVIEW',
  IN_REVIEW: 'IN_REVIEW',
} as const;

export type AppStoreState = (typeof APP_STORE_STATES)[keyof typeof APP_STORE_STATES];

/**
 * States that allow build number increment
 */
export const INCREMENTABLE_STATES: readonly AppStoreState[] = [
  APP_STORE_STATES.PREPARE_FOR_SUBMISSION,
  APP_STORE_STATES.REJECTED,
  APP_STORE_STATES.DEVELOPER_REJECTED,
  APP_STORE_STATES.METADATA_REJECTED,
  APP_STORE_STATES.WAITING_FOR_REVIEW,
  APP_STORE_STATES.IN_REVIEW,
];

/**
 * Action types for version determination
 */
export const VERSION_ACTIONS = {
  NEW_VERSION: 'new_version',
  INCREMENT_BUILD: 'increment_build',
  SKIP: 'skip',
} as const;

export type VersionAction = (typeof VERSION_ACTIONS)[keyof typeof VERSION_ACTIONS];

/**
 * Platform types
 */
export const PLATFORMS = {
  IOS: 'IOS',
  MAC_OS: 'MAC_OS',
  TV_OS: 'TV_OS',
} as const;

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS];

/**
 * API configuration
 */
export const API_CONFIG = {
  BASE_URL: 'https://api.appstoreconnect.apple.com/v1',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * JWT configuration
 */
export const JWT_CONFIG = {
  ALGORITHM: 'ES256' as const,
  EXPIRATION_TIME: 20 * 60, // 20 minutes in seconds
  AUDIENCE: 'appstoreconnect-v1',
} as const;

/**
 * Version format regex
 */
export const VERSION_REGEX = /^\d+\.\d+\.\d+$/;
