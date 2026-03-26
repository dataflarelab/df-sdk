import { DatasetService } from './services/datasets';
import { AuthenticationError, RateLimitError, APIError } from './exceptions';

/**
 * Options for initializing the DFClient.
 */
export interface DFClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export class DFClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  public readonly datasets: DatasetService;

  constructor(options: DFClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.DF_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('DF API key must be provided or set as DF_API_KEY environment variable.');
    }
    this.validateApiKey(this.apiKey);

    this.baseUrl = (options.baseUrl || 'https://api.dataflare.com').replace(/\/+$/, '');
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries ?? 3;

    this.datasets = new DatasetService(this);
  }

  /**
   * Internal request helper with retries and exponential backoff using native fetch.
   */
  public async request(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': `df-typescript/fetch`,
      ...options.headers,
    };

    let lastError: any;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
        clearTimeout(id);

        if (response.ok) {
          // For 204 No Content
          if (response.status === 204) return null;
          return await response.json();
        }

        const status = response.status;
        if (status === 401) throw new AuthenticationError('Invalid API Key.');
        if (status === 403) throw new APIError('Access denied. No permission for this dataset.', 403);
        if (status === 429) {
          if (attempt === this.maxRetries) throw new RateLimitError('Rate limit exceeded.');
          // Continue to retry logic below
        } else if (status >= 500) {
          if (attempt === this.maxRetries) {
             const text = await response.text();
             throw new APIError(`API Error: ${text}`, status);
          }
        } else {
          const text = await response.text();
          throw new APIError(`API Error: ${text}`, status);
        }

        // Retryable status codes (429, 5xx) reached here if attempt < maxRetries
        await this.backoff(attempt);
      } catch (error: any) {
        lastError = error;
        if (error instanceof AuthenticationError || error instanceof APIError && error.statusCode && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }
        
        if (attempt === this.maxRetries) throw error;
        await this.backoff(attempt);
      }
    }
    throw lastError;
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(Math.pow(2, attempt + 1) * 1000, 10000);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private validateApiKey(apiKey: string): void {
    const keyRegex = /^dfk_[a-zA-Z0-9]{40}$/;
    if (!keyRegex.test(apiKey)) {
      throw new AuthenticationError("Invalid API Key format.");
    }
  }

  public toString(): string {
    const masked = `${this.apiKey.slice(0, 4)}****${this.apiKey.slice(-4)}`;
    return `DFClient(key=${masked}, baseUrl=${this.baseUrl})`;
  }

  public toJSON() {
    return {
      baseUrl: this.baseUrl,
      apiKey: `${this.apiKey.slice(0, 4)}****${this.apiKey.slice(-4)}`
    };
  }

  public close(): void {}
}
