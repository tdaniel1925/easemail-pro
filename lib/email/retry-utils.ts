/**
 * Retry Utility with Exponential Backoff
 * 
 * Automatically retries failed operations with increasing delays
 * to handle temporary network issues and API failures
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors - require reconnection
      if (
        error.message?.includes('401') || 
        error.message?.includes('403') ||
        error.message?.includes('unauthorized') ||
        error.message?.includes('authentication')
      ) {
        console.log('🔐 Auth error detected - not retrying');
        throw error;
      }

      // Last attempt - throw error
      if (attempt === maxRetries - 1) {
        console.log(`❌ All ${maxRetries} retry attempts failed`);
        throw error;
      }

      // Calculate backoff delay
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );

      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      onRetry?.(attempt + 1, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const statusCode = error.status || error.statusCode;

  // Auth errors - not retryable
  if (statusCode === 401 || statusCode === 403) {
    return false;
  }

  // Rate limit - retryable
  if (statusCode === 429) {
    return true;
  }

  // Server errors - retryable
  if (statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // Network errors - retryable
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('etimedout')
  ) {
    return true;
  }

  // Service unavailable - retryable
  if (errorMessage.includes('service unavailable')) {
    return true;
  }

  return false;
}

