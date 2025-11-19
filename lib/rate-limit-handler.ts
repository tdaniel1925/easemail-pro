/**
 * Rate Limit Handler
 * Provides intelligent rate limit handling with exponential backoff and retry logic
 */

export interface RateLimitConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
}

export interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfterMs?: number;
  retryAfterSeconds?: number;
  remaining?: number;
  limit?: number;
  resetAt?: Date;
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  error?: Error;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRetries: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2,
  jitterMs: 500,
};

/**
 * Extracts rate limit information from HTTP response headers
 */
export function extractRateLimitInfo(response: Response): RateLimitInfo {
  const headers = response.headers;

  // Try standard rate limit headers
  const remaining = headers.get('x-ratelimit-remaining');
  const limit = headers.get('x-ratelimit-limit');
  const reset = headers.get('x-ratelimit-reset');
  const retryAfter = headers.get('retry-after');

  const info: RateLimitInfo = {
    isRateLimited: response.status === 429,
  };

  if (remaining !== null) {
    info.remaining = parseInt(remaining, 10);
  }

  if (limit !== null) {
    info.limit = parseInt(limit, 10);
  }

  if (reset !== null) {
    const resetTimestamp = parseInt(reset, 10);
    info.resetAt = new Date(resetTimestamp * 1000);
  }

  if (retryAfter !== null) {
    const retryAfterValue = parseInt(retryAfter, 10);
    if (!isNaN(retryAfterValue)) {
      // Retry-After can be in seconds or a date
      if (retryAfterValue < 1000000) {
        // Likely seconds
        info.retryAfterSeconds = retryAfterValue;
        info.retryAfterMs = retryAfterValue * 1000;
      } else {
        // Likely a timestamp
        const retryDate = new Date(retryAfterValue * 1000);
        info.retryAfterMs = retryDate.getTime() - Date.now();
        info.retryAfterSeconds = Math.ceil(info.retryAfterMs / 1000);
      }
    }
  }

  return info;
}

/**
 * Calculates exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RateLimitConfig = DEFAULT_CONFIG
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = config.jitterMs ? Math.random() * config.jitterMs : 0;

  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleeps for the specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if an error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  if (error?.response?.status === 429) return true;
  if (error?.status === 429) return true;
  if (error?.statusCode === 429) return true;
  
  // Nylas provider errors (Gmail, Microsoft, etc.)
  if (error?.providerError?.error?.code === 429) return true;
  if (error?.type === 'rate_limit_error') return true;
  
  if (error?.message && /rate limit|too many requests|429/i.test(error.message)) return true;
  return false;
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Rate limit errors are retryable
  if (isRateLimitError(error)) return true;

  // Timeout errors are retryable
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED') return true;
  if (error?.message && /timeout|ETIMEDOUT|ECONNREFUSED/i.test(error.message)) return true;

  // 5xx server errors are retryable (including Nylas provider errors)
  const status = error?.response?.status || error?.status || error?.statusCode;
  if (status >= 500 && status < 600) return true;
  
  // Nylas provider 5xx errors (e.g., Gmail 503)
  if (error?.providerError?.error?.code >= 500 && error?.providerError?.error?.code < 600) return true;
  if (error?.type === 'provider_error' && error?.statusCode >= 500) return true;

  // Network errors are retryable
  if (error?.message && /network|fetch failed|connection|service unavailable|503/i.test(error.message)) return true;

  return false;
}

/**
 * Executes a function with automatic retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RateLimitConfig> = {},
  onRetry?: (context: RetryContext) => void
): Promise<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= fullConfig.maxRetries) {
        throw error;
      }

      // Calculate delay
      let delayMs: number;

      if (isRateLimitError(error)) {
        // For rate limit errors, use the Retry-After header if available
        const response = error?.response;
        if (response) {
          const rateLimitInfo = extractRateLimitInfo(response);
          delayMs = rateLimitInfo.retryAfterMs || calculateBackoffDelay(attempt, fullConfig);
        } else {
          delayMs = calculateBackoffDelay(attempt, fullConfig);
        }
      } else {
        delayMs = calculateBackoffDelay(attempt, fullConfig);
      }

      // Cap delay at maxDelayMs
      delayMs = Math.min(delayMs, fullConfig.maxDelayMs);

      // Notify retry callback
      if (onRetry) {
        onRetry({
          attempt,
          maxAttempts: fullConfig.maxRetries,
          delayMs,
          error: lastError,
        });
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Creates a fetch wrapper with automatic retry logic
 */
export function createRetryableFetch(config: Partial<RateLimitConfig> = {}) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    return withRetry(
      async () => {
        const response = await fetch(url, init);

        // Check for rate limit
        if (response.status === 429) {
          const rateLimitInfo = extractRateLimitInfo(response);
          const error: any = new Error('Rate limit exceeded');
          error.status = 429;
          error.response = response;
          error.rateLimitInfo = rateLimitInfo;
          throw error;
        }

        // Check for other server errors
        if (response.status >= 500) {
          const error: any = new Error(`Server error: ${response.status}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }

        return response;
      },
      config
    );
  };
}

/**
 * Rate limit tracker for client-side throttling
 */
export class RateLimitTracker {
  private requestTimestamps: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
 * Checks if a request can be made for the given key
   */
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(key) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);

    return validTimestamps.length < this.maxRequests;
  }

  /**
   * Records a request for the given key
   */
  recordRequest(key: string): void {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(key) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    validTimestamps.push(now);

    this.requestTimestamps.set(key, validTimestamps);
  }

  /**
   * Gets the time until the next request can be made (in ms)
   */
  getTimeUntilNextRequest(key: string): number {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(key) || [];

    if (timestamps.length < this.maxRequests) {
      return 0;
    }

    // Get the oldest timestamp
    const oldestTimestamp = Math.min(...timestamps);
    const timeUntilExpiry = (oldestTimestamp + this.windowMs) - now;

    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Clears tracking for a specific key
   */
  clear(key: string): void {
    this.requestTimestamps.delete(key);
  }

  /**
   * Clears all tracking
   */
  clearAll(): void {
    this.requestTimestamps.clear();
  }
}

/**
 * Formats a duration in milliseconds to a human-readable string
 */
export function formatRetryDelay(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}
