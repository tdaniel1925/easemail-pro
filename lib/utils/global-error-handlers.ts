/**
 * Global Error Handlers
 *
 * Prevents application crashes by catching unhandled errors at the global level
 * Call initializeGlobalErrorHandlers() once at app startup
 */

import { logger } from './logger';

let isInitialized = false;

/**
 * Initialize global error handlers
 * Call this ONCE in your root layout or _app.tsx
 */
export function initializeGlobalErrorHandlers() {
  if (isInitialized) return;
  if (typeof window === 'undefined') return; // Only run in browser

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason,
      promise: event.promise,
      stack: event.reason?.stack,
    });

    // Send to external error tracking
    if ((window as any).Sentry) {
      (window as any).Sentry.captureException(event.reason, {
        tags: {
          type: 'unhandled_rejection',
        },
      });
    }

    // Prevent default browser behavior (console error)
    event.preventDefault();

    // Show user-friendly notification (optional)
    if (process.env.NODE_ENV === 'development') {
      console.error('🔴 Unhandled Promise Rejection:', event.reason);
    }
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logger.error('Uncaught Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack,
    });

    // Send to external error tracking
    if ((window as any).Sentry) {
      (window as any).Sentry.captureException(event.error, {
        tags: {
          type: 'uncaught_error',
        },
      });
    }

    // Don't prevent default - let browser handle it
  });

  // Handle console errors in production (optional monitoring)
  if (process.env.NODE_ENV === 'production') {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Log to our service
      logger.error('Console Error', {
        args: args.map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ),
      });

      // Call original
      originalConsoleError.apply(console, args);
    };
  }

  isInitialized = true;
  logger.info('Global error handlers initialized');
}

/**
 * Safe async function wrapper
 * Catches errors and logs them instead of crashing
 *
 * Usage:
 * const safeLoad = safeAsync(async () => {
 *   const data = await fetchData();
 *   return data;
 * });
 * await safeLoad();
 */
export function safeAsync<T>(
  fn: () => Promise<T>,
  errorMessage = 'Async operation failed'
): () => Promise<T | null> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      logger.error(errorMessage, error);
      return null;
    }
  };
}

/**
 * Safe sync function wrapper
 * Catches errors and logs them instead of crashing
 *
 * Usage:
 * const safeCompute = safeSync(() => {
 *   return complexCalculation();
 * });
 * const result = safeCompute();
 */
export function safeSync<T>(
  fn: () => T,
  errorMessage = 'Operation failed'
): () => T | null {
  return () => {
    try {
      return fn();
    } catch (error) {
      logger.error(errorMessage, error);
      return null;
    }
  };
}

/**
 * Safe useEffect wrapper for async operations
 * Prevents "Can't perform a React state update on an unmounted component" errors
 *
 * Usage in React components:
 * useEffect(() => {
 *   return safeUseEffectAsync(async (signal) => {
 *     const data = await fetch('/api/data', { signal });
 *     if (!signal.aborted) {
 *       setData(data);
 *     }
 *   });
 * }, []);
 */
export function safeUseEffectAsync(
  asyncFn: (signal: AbortSignal) => Promise<void>
): () => void {
  const controller = new AbortController();

  asyncFn(controller.signal).catch((error) => {
    if (error.name === 'AbortError') {
      // Expected - component unmounted
      return;
    }
    logger.error('useEffect async error', error);
  });

  return () => {
    controller.abort();
  };
}

/**
 * Safe array access
 * Returns undefined instead of crashing on out-of-bounds access
 *
 * Usage:
 * const first = safeArrayAccess(array, 0); // Instead of array[0]
 * const sender = safeArrayAccess(message.from, 0)?.email;
 */
export function safeArrayAccess<T>(
  array: T[] | undefined | null,
  index: number
): T | undefined {
  if (!array || !Array.isArray(array)) return undefined;
  if (index < 0 || index >= array.length) return undefined;
  return array[index];
}

/**
 * Safe JSON parse
 * Returns null instead of crashing on invalid JSON
 *
 * Usage:
 * const data = safeJsonParse(jsonString);
 */
export function safeJsonParse<T = any>(
  jsonString: string | null | undefined
): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error('JSON parse failed', { jsonString, error });
    return null;
  }
}

/**
 * Safe date parse
 * Returns null instead of Invalid Date
 *
 * Usage:
 * const date = safeDateParse(event.startTime);
 * if (date) {
 *   // Use date safely
 * }
 */
export function safeDateParse(
  dateInput: string | number | Date | null | undefined
): Date | null {
  if (!dateInput) return null;
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    logger.error('Date parse failed', { dateInput, error });
    return null;
  }
}

/**
 * Safe number parse
 * Returns null instead of NaN
 *
 * Usage:
 * const num = safeNumberParse(userInput);
 * if (num !== null) {
 *   // Use number safely
 * }
 */
export function safeNumberParse(
  input: string | number | null | undefined
): number | null {
  if (input === null || input === undefined) return null;
  const num = typeof input === 'number' ? input : parseFloat(input);
  if (isNaN(num)) return null;
  return num;
}

/**
 * Retry async operation with exponential backoff
 * Prevents crashes from temporary failures
 *
 * Usage:
 * const data = await retryAsync(
 *   async () => await fetch('/api/data'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error,
        });

        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`All ${maxRetries} retry attempts failed`, { error: lastError });
  throw lastError;
}

/**
 * Safe local storage access
 * Handles quota exceeded, disabled storage, etc.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logger.error('localStorage.getItem failed', { key, error });
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      logger.error('localStorage.setItem failed', { key, error });
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error('localStorage.removeItem failed', { key, error });
      return false;
    }
  },
};

/**
 * Create AbortController with timeout
 * Prevents hanging requests
 *
 * Usage:
 * const { signal, cleanup } = createAbortSignal(5000);
 * try {
 *   const response = await fetch('/api/data', { signal });
 * } finally {
 *   cleanup();
 * }
 */
export function createAbortSignal(timeoutMs?: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | undefined;

  if (timeoutMs) {
    timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) clearTimeout(timeoutId);
      controller.abort();
    },
  };
}
