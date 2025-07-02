import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../../shared/constants/index.js';
import { ApiError } from '../../shared/errors/customErrors.js';
import type { ApiErrorResponse } from '../../shared/types/api.js';

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

/**
 * HTTP client with retry logic and error handling
 */
export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
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
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * GET request with retry
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this._requestWithRetry('get', url, null, config) as Promise<T>;
  }

  /**
   * POST request with retry
   */
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this._requestWithRetry('post', url, data, config) as Promise<T>;
  }

  /**
   * PATCH request with retry
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this._requestWithRetry('patch', url, data, config) as Promise<T>;
  }

  /**
   * DELETE request with retry
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this._requestWithRetry('delete', url, null, config) as Promise<T>;
  }

  /**
   * Setup request and response interceptors
   */
  private _setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.info(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
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
  private async _requestWithRetry(
    method: HttpMethod,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    retryCount: number = 0,
  ): Promise<unknown> {
    try {
      let response: AxiosResponse;

      if (method === 'get' || method === 'delete') {
        response = await this.client[method](url, config);
      } else {
        response = await this.client[method](url, data, config);
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (this._shouldRetry(axiosError, retryCount)) {
        const delay = this._getRetryDelay(retryCount);
        console.warn(`[HTTP] Retrying request after ${delay}ms (attempt ${retryCount + 1})`);
        await this._sleep(delay);
        return this._requestWithRetry(method, url, data, config, retryCount + 1);
      }

      throw this._transformError(axiosError as AxiosError<ApiErrorResponse>);
    }
  }

  /**
   * Determine if request should be retried
   */
  private _shouldRetry(error: AxiosError, retryCount: number): boolean {
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
  private _getRetryDelay(retryCount: number): number {
    return API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
  }

  /**
   * Sleep for specified milliseconds
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Transform axios error to custom error
   */
  private _transformError(error: AxiosError<ApiErrorResponse>): ApiError {
    if (!error.response) {
      return new ApiError(`Network error: ${error.message}`, 0, null);
    }

    const { status, data } = error.response;
    let message = `API request failed with status ${status}`;

    if (data?.errors && data.errors.length > 0) {
      const firstError = data.errors[0];
      if (firstError) {
        message = firstError.detail || firstError.title || message;
      }
    }

    return new ApiError(message, status, data);
  }
}
