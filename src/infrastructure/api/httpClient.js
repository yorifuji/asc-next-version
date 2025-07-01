'use strict';

const axios = require('axios');
const { API_CONFIG } = require('../../shared/constants');
const { ApiError } = require('../../shared/errors/customErrors');

/**
 * HTTP client with retry logic and error handling
 */
class HttpClient {
  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this._setupInterceptors();
  }

  /**
   * Set authorization token
   */
  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * GET request with retry
   */
  async get(url, config = {}) {
    return this._requestWithRetry('get', url, null, config);
  }

  /**
   * POST request with retry
   */
  async post(url, data, config = {}) {
    return this._requestWithRetry('post', url, data, config);
  }

  /**
   * PATCH request with retry
   */
  async patch(url, data, config = {}) {
    return this._requestWithRetry('patch', url, data, config);
  }

  /**
   * DELETE request with retry
   */
  async delete(url, config = {}) {
    return this._requestWithRetry('delete', url, null, config);
  }

  /**
   * Setup request and response interceptors
   */
  _setupInterceptors() {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.info(`[HTTP] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[HTTP] Request error:', error.message);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.info(`[HTTP] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          console.error(`[HTTP] Response error ${error.response.status} from ${error.config.url}`);
        } else {
          console.error('[HTTP] Network error:', error.message);
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Make request with retry logic
   */
  async _requestWithRetry(method, url, data, config, retryCount = 0) {
    try {
      const response = await this.client[method](url, data, config);
      return response.data;
    } catch (error) {
      if (this._shouldRetry(error, retryCount)) {
        const delay = this._getRetryDelay(retryCount);
        console.warn(`[HTTP] Retrying request after ${delay}ms (attempt ${retryCount + 1})`);
        await this._sleep(delay);
        return this._requestWithRetry(method, url, data, config, retryCount + 1);
      }

      throw this._transformError(error);
    }
  }

  /**
   * Determine if request should be retried
   */
  _shouldRetry(error, retryCount) {
    if (retryCount >= API_CONFIG.MAX_RETRIES) {
      return false;
    }

    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on specific status codes
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response.status);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  _getRetryDelay(retryCount) {
    return API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
  }

  /**
   * Sleep for specified milliseconds
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Transform axios error to custom error
   */
  _transformError(error) {
    if (!error.response) {
      return new ApiError(`Network error: ${error.message}`, 0, null);
    }

    const { status, data } = error.response;
    let message = `API request failed with status ${status}`;

    if (data && data.errors && data.errors.length > 0) {
      message = data.errors[0].detail || data.errors[0].title || message;
    }

    return new ApiError(message, status, data);
  }
}

module.exports = HttpClient;
