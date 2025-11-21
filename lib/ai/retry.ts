/**
 * Retry Utility for OpenAI API Calls
 * Implements exponential backoff for transient errors
 */

import { AI_CONFIG } from './config';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = AI_CONFIG.retry.maxAttempts,
    initialDelay = AI_CONFIG.retry.initialDelay,
    maxDelay = AI_CONFIG.retry.maxDelay,
    backoffMultiplier = AI_CONFIG.retry.backoffMultiplier,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      console.log(
        `[Retry] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );

      // Call retry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  // Retryable errors
  const retryablePatterns = [
    'rate limit',
    'timeout',
    'econnreset',
    'enotfound',
    'econnrefused',
    'network',
    '429',
    '500',
    '502',
    '503',
    '504',
  ];

  // Check if error matches any retryable pattern
  for (const pattern of retryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return true;
    }
  }

  // Non-retryable errors (client errors)
  const nonRetryablePatterns = [
    '400',
    '401',
    '403',
    '404',
    'invalid api key',
    'authentication failed',
  ];

  for (const pattern of nonRetryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return false;
    }
  }

  // Default to retryable for unknown errors
  return true;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper for OpenAI completion calls with retry logic
 */
export async function createCompletionWithRetry<T>(
  completionFn: () => Promise<T>,
  context: string = 'OpenAI API call'
): Promise<T> {
  return retryWithBackoff(completionFn, {
    onRetry: (error, attempt) => {
      console.error(`[${context}] Retry attempt ${attempt}: ${error.message}`);
    },
  });
}
