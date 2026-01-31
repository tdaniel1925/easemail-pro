/**
 * Tests for retry logic with exponential backoff
 * Ensures transient failures are retried correctly
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTransientError,
  calculateBackoffDelay,
  retryWithBackoff,
  retryFetch,
  sleep,
} from '../retry-logic';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isTransientError', () => {
    test('identifies network errors as transient', () => {
      const networkErrors = [
        new Error('network error'),
        new Error('ECONNRESET'),
        new Error('ECONNREFUSED'),
        new Error('fetch failed'),
        new Error('timeout'),
      ];

      networkErrors.forEach(error => {
        expect(isTransientError(error)).toBe(true);
      });
    });

    test('identifies rate limit errors as transient', () => {
      const rateLimitErrors = [
        new Error('rate limit exceeded'),
        new Error('429 Too Many Requests'),
        new Error('too many requests'),
      ];

      rateLimitErrors.forEach(error => {
        expect(isTransientError(error)).toBe(true);
      });
    });

    test('identifies server errors (5xx) as transient', () => {
      const serverErrors = [
        new Error('500 Internal Server Error'),
        new Error('502 Bad Gateway'),
        new Error('503 Service Unavailable'),
        new Error('504 Gateway Timeout'),
      ];

      serverErrors.forEach(error => {
        expect(isTransientError(error)).toBe(true);
      });
    });

    test('identifies auth errors as non-transient', () => {
      const authErrors = [
        new Error('401 Unauthorized'),
        new Error('403 Forbidden'),
        new Error('unauthorized'),
        new Error('invalid token'),
      ];

      authErrors.forEach(error => {
        expect(isTransientError(error)).toBe(false);
      });
    });

    test('identifies client errors (4xx) as non-transient', () => {
      const clientErrors = [
        new Error('400 Bad Request'),
        new Error('404 Not Found'),
      ];

      clientErrors.forEach(error => {
        expect(isTransientError(error)).toBe(false);
      });
    });

    test('identifies unknown errors as non-transient', () => {
      const unknownErrors = [
        new Error('unknown error'),
        new Error('something went wrong'),
      ];

      unknownErrors.forEach(error => {
        expect(isTransientError(error)).toBe(false);
      });
    });
  });

  describe('calculateBackoffDelay', () => {
    test('calculates exponential backoff correctly', () => {
      const options = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      };

      // First attempt (attempt 0)
      const delay0 = calculateBackoffDelay(0, options);
      expect(delay0).toBeGreaterThanOrEqual(750); // 1000 - 25% jitter
      expect(delay0).toBeLessThanOrEqual(1250); // 1000 + 25% jitter

      // Second attempt (attempt 1)
      const delay1 = calculateBackoffDelay(1, options);
      expect(delay1).toBeGreaterThanOrEqual(1500); // 2000 - 25% jitter
      expect(delay1).toBeLessThanOrEqual(2500); // 2000 + 25% jitter

      // Third attempt (attempt 2)
      const delay2 = calculateBackoffDelay(2, options);
      expect(delay2).toBeGreaterThanOrEqual(3000); // 4000 - 25% jitter
      expect(delay2).toBeLessThanOrEqual(5000); // 4000 + 25% jitter
    });

    test('respects maxDelayMs cap', () => {
      const options = {
        maxRetries: 10,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      };

      // Attempt that would exceed maxDelayMs (2^10 = 1024, so 1024 * 1000 = 1024000ms)
      const delay = calculateBackoffDelay(10, options);
      expect(delay).toBeLessThanOrEqual(5000 * 1.25); // Max delay + 25% jitter
    });

    test('adds jitter to prevent thundering herd', () => {
      const options = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      };

      // Run multiple times to check jitter variance
      const delays: number[] = [];
      for (let i = 0; i < 10; i++) {
        delays.push(calculateBackoffDelay(0, options));
      }

      // Check that we have variance (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('sleep', () => {
    test('resolves after specified time', async () => {
      const promise = sleep(1000);

      // Advance timers
      await vi.advanceTimersByTimeAsync(1000);

      // Promise should resolve
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('retryWithBackoff', () => {
    test('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn, { maxRetries: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries on transient errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
      });

      // Advance timers for retries
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('does not retry on non-transient errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('401 Unauthorized'));

      const result = await retryWithBackoff(fn, { maxRetries: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('401 Unauthorized');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('exhausts retries on persistent transient errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('network error'));

      const promise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelayMs: 100,
      });

      // Advance timers for all retries
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('network error');
      expect(result.attempts).toBe(4); // Initial + 3 retries
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('retryFetch', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    test('returns response on successful fetch', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response;

      (global.fetch as any).mockResolvedValue(mockResponse);

      const promise = retryFetch('https://example.com', { method: 'GET' });
      await vi.runAllTimersAsync();
      const response = await promise;

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('throws error on non-OK response', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response;

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(async () => {
        const promise = retryFetch('https://example.com', { method: 'GET' });
        await vi.runAllTimersAsync();
        await promise;
      }).rejects.toThrow('HTTP 404: Not Found');
    });

    test('retries on transient HTTP errors', async () => {
      const mockError = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response;

      const mockSuccess = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response;

      (global.fetch as any)
        .mockResolvedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccess);

      const promise = retryFetch('https://example.com', {
        method: 'GET',
      }, {
        maxRetries: 2,
        initialDelayMs: 100,
      });

      await vi.runAllTimersAsync();
      const response = await promise;

      expect(response).toBe(mockSuccess);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('retries on network errors', async () => {
      const mockSuccess = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response;

      (global.fetch as any)
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce(mockSuccess);

      const promise = retryFetch('https://example.com', {
        method: 'GET',
      }, {
        maxRetries: 2,
        initialDelayMs: 100,
      });

      await vi.runAllTimersAsync();
      const response = await promise;

      expect(response).toBe(mockSuccess);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
