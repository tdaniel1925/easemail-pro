'use client';

import { useState, useCallback, useRef } from 'react';
import {
  withRetry,
  RateLimitConfig,
  RetryContext,
  isRateLimitError,
  formatRetryDelay,
} from '@/lib/rate-limit-handler';

export interface RateLimitedFetchState {
  loading: boolean;
  error: Error | null;
  isRateLimited: boolean;
  retryingIn: number | null;
  retryAttempt: number;
}

export interface RateLimitedFetchOptions extends Partial<RateLimitConfig> {
  onRetry?: (context: RetryContext) => void;
  onRateLimit?: (retryAfterMs: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for making fetch requests with automatic rate limit handling and retries
 */
export function useRateLimitedFetch<T = any>(
  options: RateLimitedFetchOptions = {}
) {
  const [state, setState] = useState<RateLimitedFetchState>({
    loading: false,
    error: null,
    isRateLimited: false,
    retryingIn: null,
    retryAttempt: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback(
    async (url: string, init?: RequestInit): Promise<T> => {
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      setState({
        loading: true,
        error: null,
        isRateLimited: false,
        retryingIn: null,
        retryAttempt: 0,
      });

      try {
        const result = await withRetry<T>(
          async () => {
            const response = await fetch(url, init);

            // Handle rate limit
            if (response.status === 429) {
              const retryAfter = response.headers.get('retry-after');
              const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;

              setState(prev => ({
                ...prev,
                isRateLimited: true,
                retryingIn: retryAfterMs,
              }));

              if (options.onRateLimit) {
                options.onRateLimit(retryAfterMs);
              }

              const error: any = new Error('Rate limit exceeded');
              error.status = 429;
              error.response = response;
              throw error;
            }

            // Handle other errors
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const error: any = new Error(errorData.error || `HTTP ${response.status}`);
              error.status = response.status;
              error.response = response;
              throw error;
            }

            // Parse response
            const data = await response.json();
            return data as T;
          },
          options,
          (context: RetryContext) => {
            setState(prev => ({
              ...prev,
              retryAttempt: context.attempt,
              retryingIn: context.delayMs,
            }));

            // Set timeout to update retryingIn
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }

            retryTimeoutRef.current = setTimeout(() => {
              setState(prev => ({
                ...prev,
                retryingIn: null,
              }));
            }, context.delayMs);

            if (options.onRetry) {
              options.onRetry(context);
            }
          }
        );

        setState({
          loading: false,
          error: null,
          isRateLimited: false,
          retryingIn: null,
          retryAttempt: 0,
        });

        return result;
      } catch (error: any) {
        const isRateLimit = isRateLimitError(error);

        setState({
          loading: false,
          error,
          isRateLimited: isRateLimit,
          retryingIn: null,
          retryAttempt: 0,
        });

        if (options.onError) {
          options.onError(error);
        }

        throw error;
      }
    },
    [options]
  );

  return {
    ...state,
    execute,
    formattedRetryDelay: state.retryingIn ? formatRetryDelay(state.retryingIn) : null,
  };
}

/**
 * Hook for making POST requests with rate limit handling
 */
export function useRateLimitedPost<TResponse = any, TBody = any>(
  options: RateLimitedFetchOptions = {}
) {
  const { execute, ...state } = useRateLimitedFetch<TResponse>(options);

  const post = useCallback(
    async (url: string, body: TBody): Promise<TResponse> => {
      return execute(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    },
    [execute]
  );

  return {
    ...state,
    post,
  };
}

/**
 * Hook for making GET requests with rate limit handling
 */
export function useRateLimitedGet<T = any>(
  options: RateLimitedFetchOptions = {}
) {
  const { execute, ...state } = useRateLimitedFetch<T>(options);

  const get = useCallback(
    async (url: string): Promise<T> => {
      return execute(url, {
        method: 'GET',
      });
    },
    [execute]
  );

  return {
    ...state,
    get,
  };
}
