'use strict';

/**
 * App Store state constants
 */
const APP_STORE_STATES = {
  READY_FOR_SALE: 'READY_FOR_SALE',
  PREPARE_FOR_SUBMISSION: 'PREPARE_FOR_SUBMISSION',
  REJECTED: 'REJECTED',
  DEVELOPER_REJECTED: 'DEVELOPER_REJECTED',
  METADATA_REJECTED: 'METADATA_REJECTED',
  WAITING_FOR_REVIEW: 'WAITING_FOR_REVIEW',
  IN_REVIEW: 'IN_REVIEW',
};

/**
 * States that allow build number increment
 */
const INCREMENTABLE_STATES = [
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
const VERSION_ACTIONS = {
  NEW_VERSION: 'new_version',
  INCREMENT_BUILD: 'increment_build',
  SKIP: 'skip',
};

/**
 * Platform types
 */
const PLATFORMS = {
  IOS: 'IOS',
  MAC_OS: 'MAC_OS',
  TV_OS: 'TV_OS',
};

/**
 * API configuration
 */
const API_CONFIG = {
  BASE_URL: 'https://api.appstoreconnect.apple.com/v1',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

/**
 * JWT configuration
 */
const JWT_CONFIG = {
  ALGORITHM: 'ES256',
  EXPIRATION_TIME: 20 * 60, // 20 minutes in seconds
  AUDIENCE: 'appstoreconnect-v1',
};

/**
 * Version format regex
 */
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

module.exports = {
  APP_STORE_STATES,
  INCREMENTABLE_STATES,
  VERSION_ACTIONS,
  PLATFORMS,
  API_CONFIG,
  JWT_CONFIG,
  VERSION_REGEX,
};
