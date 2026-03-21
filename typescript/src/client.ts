import axios, { AxiosInstance, AxiosError } from 'axios';
import { DatasetService } from './services/datasets';
import { AuthenticationError, RateLimitError, APIError } from './exceptions';

/**
 * Options for initializing the DFClient.
 */
export interface DFClientOptions {
  /**
   * Your API Key. Defaults to the `DF_API_KEY` environment variable.
   */
  apiKey?: string;
  /**
   * The base URL for the DF API. Defaults to `https://api.dataflare.com`.
   */
  baseUrl?: string;
  /**
   * HTTP request timeout in milliseconds. Defaults to 30,000 (30 seconds).
   */
  timeout?: number;
  /**
   * The maximum number of background retries for transient errors. Defaults to 3.
   */
  maxRetries?: number;
}

/**
 * The official DF (DataFlare) API Client.
 * Manages connection pooling, authentication, and HTTP retries globally.
 */
export class DFClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly axiosInstance: AxiosInstance;

  public readonly datasets: DatasetService;

  constructor(options: DFClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.DF_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('DF API key must be provided or set as DF_API_KEY environment variable.');
    }

    this.baseUrl = (options.baseUrl || 'https://api.dataflare.com').replace(/\/+$/, '');
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries ?? 3;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'X-API-Key': this.apiKey,
        'Accept': 'application/json',
        'User-Agent': `df-typescript/0.1.0`,
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    // Configure resilient requests via interceptors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any;
        
        // Handle specific status codes
        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            throw new AuthenticationError('Invalid API Key.');
          } else if (status === 403) {
            throw new APIError(
              'Access denied. You do not have permission for this dataset.',
              403
            );
          } else if (status === 429) {
            // Only retry if we haven't exhausted attempts
            if (!config || config.__retryCount >= this.maxRetries) {
              throw new RateLimitError('Rate limit exceeded.');
            }
          } else if (status >= 500) {
            if (!config || config.__retryCount >= this.maxRetries) {
              throw new APIError(`API Error: ${error.response.data || error.message}`, status);
            }
          } else {
            // Other 4xx errors
            throw new APIError(`API Error: ${error.response.data || error.message}`, status);
          }
        }

        // Retry logic for transient errors (network, 429, 5xx)
        if (!config || config.__retryCount >= this.maxRetries) {
          return Promise.reject(error);
        }

        config.__retryCount = config.__retryCount || 0;
        config.__retryCount += 1;

        // Exponential backoff: Multiplier = 1s, Min = 1s, Max = 10s (matches Python tenacity config)
        const delay = Math.min(Math.pow(2, config.__retryCount) * 1000, 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.axiosInstance(config);
      }
    );

    this.datasets = new DatasetService(this.axiosInstance);
  }

  /**
   * Close the underlying HTTP connection pool.
   * Note: Axios doesn't have an explicit 'close' for its internal pool in most environments
   * but we provide this for symmetry with the Python SDK.
   */
  public close(): void {
    // No-op for axios in standard Node context
  }
}
