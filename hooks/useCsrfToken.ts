/**
 * HIGH PRIORITY FIX: CSRF Token React Hook
 *
 * Provides easy access to CSRF token for client-side requests
 */

import { useEffect, useState } from 'react';
import { getCsrfTokenForFetch } from '@/lib/security/csrf';

/**
 * Hook to get CSRF token for API requests
 *
 * Usage:
 * ```typescript
 * const csrfToken = useCsrfToken();
 *
 * const handleSubmit = async () => {
 *   await fetch('/api/endpoint', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'x-csrf-token': csrfToken,
 *     },
 *     body: JSON.stringify(data),
 *   });
 * };
 * ```
 */
export function useCsrfToken(): string {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Get token on mount
    const csrfToken = getCsrfTokenForFetch();
    setToken(csrfToken);

    // Optional: Refresh token periodically (every 30 minutes)
    const interval = setInterval(() => {
      const refreshedToken = getCsrfTokenForFetch();
      setToken(refreshedToken);
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, []);

  return token;
}

/**
 * Hook to get fetch options with CSRF token included
 *
 * Usage:
 * ```typescript
 * const fetchWithCsrf = useFetchWithCsrf();
 *
 * const response = await fetchWithCsrf('/api/endpoint', {
 *   method: 'POST',
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useFetchWithCsrf() {
  const csrfToken = useCsrfToken();

  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    // Add CSRF token for state-changing methods
    if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase())) {
      headers.set('x-csrf-token', csrfToken);
    }

    // Add Content-Type if not already set and body is present
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };
}
