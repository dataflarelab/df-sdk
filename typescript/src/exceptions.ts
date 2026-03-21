/**
 * Base exception for all DF SDK errors.
 */
export class DFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when the API returns a 401 Unauthorized.
 */
export class AuthenticationError extends DFError {}

/**
 * Raised when the API returns a 429 Too Many Requests, and retries are exhausted.
 */
export class RateLimitError extends DFError {}

/**
 * Raised when the API returns a 4xx or 5xx status code.
 */
export class APIError extends DFError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, any>
  ) {
    super(message);
  }
}
