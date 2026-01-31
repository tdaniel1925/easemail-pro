/**
 * Retry Logic for Sync Operations
 *
 * Implements exponential backoff for transient failures
 * Handles network errors, rate limits, and temporary service issues
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Check if error is transient (should retry)
 */
export function isTransientError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || String(error).toLowerCase();

  // Network errors - should retry
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('fetch failed')
  ) {
    return true;
  }

  // Rate limit errors - should retry with backoff
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('429') ||
    errorMessage.includes('too many requests')
  ) {
    return true;
  }

  // Server errors (5xx) - should retry
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('504') ||
    errorMessage.includes('internal server error') ||
    errorMessage.includes('bad gateway') ||
    errorMessage.includes('service unavailable')
  ) {
    return true;
  }

  // Auth errors - should NOT retry (need user action)
  if (
    errorMessage.includes('401') ||
    errorMessage.includes('403') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('invalid token')
  ) {
    return false;
  }

  // Client errors (4xx except rate limit) - should NOT retry
  if (
    errorMessage.includes('400') ||
    errorMessage.includes('404') ||
    errorMessage.includes('bad request')
  ) {
    return false;
  }

  // Default: don't retry unknown errors
  return false;
}

/**
 * Calculate delay for next retry using exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const delay = Math.min(
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt),
    options.maxDelayMs
  );

  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25;
  const randomJitter = Math.random() * jitter * 2 - jitter;

  return Math.floor(delay + randomJitter);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => await syncEmails(accountId),
 *   { maxRetries: 3 }
 * );
 * if (result.success) {
 *   console.log('Sync succeeded:', result.data);
 * } else {
 *   console.error('Sync failed after retries:', result.error);
 * }
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1}`);
      const data = await fn();

      return {
        success: true,
        data,
        attempts: attempt + 1,
      };
    } catch (error: any) {
      lastError = error;
      console.error(`[Retry] Attempt ${attempt + 1} failed:`, error.message || error);

      // Check if we should retry
      if (!isTransientError(error)) {
        console.log('[Retry] Non-transient error, not retrying');
        return {
          success: false,
          error: error.message || String(error),
          attempts: attempt + 1,
        };
      }

      // If this was the last attempt, don't sleep
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate backoff delay and wait
      const delay = calculateBackoffDelay(attempt, opts);
      console.log(`[Retry] Waiting ${delay}ms before next attempt...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError?.message || String(lastError),
    attempts: opts.maxRetries + 1,
  };
}

/**
 * Retry wrapper for fetch requests
 *
 * @example
 * const response = await retryFetch('https://api.example.com/sync', {
 *   method: 'POST',
 *   body: JSON.stringify({ accountId }),
 * });
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const result = await retryWithBackoff(
    async () => {
      const response = await fetch(url, init);

      // Check for HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    },
    retryOptions
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Fetch failed after retries');
  }

  return result.data;
}
