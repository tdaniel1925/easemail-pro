/**
 * Retry Utility with Exponential Backoff
 * Handles transient failures for API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'NetworkError',
    'FetchError',
  ],
  onRetry: () => {},
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  // Check error code
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Check error type
  if (error.type && retryableErrors.includes(error.type)) {
    return true;
  }

  // Check error name
  if (error.name && retryableErrors.includes(error.name)) {
    return true;
  }

  // Check for rate limit (429) or server errors (5xx)
  if (error.statusCode >= 429 && error.statusCode < 600) {
    return true;
  }

  // Check error message
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('rate limit')
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (±25% random variance)
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5) * 2;

  return Math.floor(cappedDelay + jitter);
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await retry(
 *   async () => await fetch('https://api.nylas.com/messages'),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        console.log(`[Retry] Error not retryable, failing immediately:`, error.message);
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      console.log(
        `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delay}ms...`,
        { error: error.message, code: error.code, statusCode: error.statusCode }
      );

      // Call retry callback
      opts.onRetry(error, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript doesn't know that
  throw lastError!;
}

/**
 * Retry specifically for fetch calls
 * Automatically handles Nylas API errors
 */
export async function retryFetch(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retry(async () => {
    const response = await fetch(url, options);

    // Throw on 5xx or 429 to trigger retry
    if (response.status >= 500 || response.status === 429) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.statusCode = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, retryOptions);
}

/**
 * Retry wrapper for Nylas SDK calls
 * Example: await retryNylas(() => nylas.messages.list({...}))
 */
export async function retryNylas<T>(
  fn: () => Promise<T>,
  retryOptions?: RetryOptions
): Promise<T> {
  return retry(fn, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    retryableErrors: [
      ...DEFAULT_OPTIONS.retryableErrors,
      'NylasApiError',
      'NylasRateLimitError',
      'NylasServerError',
    ],
    ...retryOptions,
  });
}
