/**
 * Global Rate Limiting Middleware
 *
 * Applies rate limiting to all API routes based on path patterns.
 * Provides quick protection for all endpoints until granular limits are implemented.
 *
 * Usage: Import and call in middleware.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authStrictLimit,
  expensiveLimit,
  writeLimit,
  readLimit,
  webhookLimit,
  enforceRateLimit,
  getIpFromRequest,
  getRateLimitHeaders,
} from '@/lib/security/enhanced-rate-limiter';
import type { Ratelimit } from '@upstash/ratelimit';

/**
 * Route patterns and their corresponding rate limiters
 * More specific patterns should come first
 */
const RATE_LIMIT_RULES: Array<{
  pattern: RegExp;
  limiter: Ratelimit | null;
  name: string;
}> = [
  // Tier 1: Authentication (Very Strict - 5 req / 15 min)
  {
    pattern: /^\/api\/auth\/(login|signup|request-password-reset|reset-password|verify-2fa)/,
    limiter: authStrictLimit,
    name: 'auth-strict',
  },
  {
    pattern: /^\/api\/admin\/setup/,
    limiter: authStrictLimit,
    name: 'admin-setup',
  },

  // Tier 2: Expensive Operations (Strict - 10 req / 5 min)
  {
    pattern: /^\/api\/ai\//,
    limiter: expensiveLimit,
    name: 'ai-operations',
  },
  {
    pattern: /^\/api\/(files|attachments)\/upload/,
    limiter: expensiveLimit,
    name: 'file-upload',
  },
  {
    pattern: /^\/api\/(contacts|emails)\/import/,
    limiter: expensiveLimit,
    name: 'data-import',
  },

  // Tier 3: Write Operations (Moderate - 60 req / 1 min)
  {
    pattern: /^\/api\/emails\/(send|draft)/,
    limiter: writeLimit,
    name: 'email-send',
  },
  {
    pattern: /^\/api\/sms\/send/,
    limiter: writeLimit,
    name: 'sms-send',
  },
  {
    pattern: /^\/api\/sync\/start/,
    limiter: writeLimit,
    name: 'sync-start',
  },
  {
    pattern: /^\/api\/(emails|contacts|calendar\/events)/,
    limiter: writeLimit,
    name: 'crud-operations',
  },

  // Tier 5: Webhooks (High Volume - 100 req / 1 min)
  {
    pattern: /^\/api\/webhooks\//,
    limiter: webhookLimit,
    name: 'webhooks',
  },

  // Tier 4: Read Operations (Generous - 200 req / 1 min)
  // This catches everything else under /api
  {
    pattern: /^\/api\//,
    limiter: readLimit,
    name: 'api-read',
  },
];

/**
 * Paths that should skip rate limiting
 */
const RATE_LIMIT_SKIP_PATHS = [
  '/api/health',              // Health checks
  '/api/cron/',               // Cron jobs (protected by CRON_SECRET)
  '/_next/',                  // Next.js internals
  '/favicon.ico',             // Static assets
  '/robots.txt',              // SEO files
];

/**
 * Check if a path should skip rate limiting
 */
function shouldSkipRateLimit(pathname: string): boolean {
  return RATE_LIMIT_SKIP_PATHS.some(skip =>
    pathname.startsWith(skip)
  );
}

/**
 * Find the appropriate rate limiter for a given path
 */
function getRateLimiterForPath(pathname: string): {
  limiter: Ratelimit | null;
  name: string;
} | null {
  for (const rule of RATE_LIMIT_RULES) {
    if (rule.pattern.test(pathname)) {
      return {
        limiter: rule.limiter,
        name: rule.name,
      };
    }
  }
  return null;
}

/**
 * Get identifier for rate limiting
 * Prefers authenticated user ID, falls back to IP
 */
function getRateLimitIdentifier(request: NextRequest): string {
  // Check for user ID in headers (set by auth middleware)
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip = getIpFromRequest(request);
  if (ip) {
    return `ip:${ip}`;
  }

  // Last resort: use a fixed identifier (will rate limit everyone together)
  // This is not ideal but better than no rate limiting
  return 'anonymous';
}

/**
 * Global rate limiting middleware
 *
 * Call this from your main middleware.ts file:
 *
 * ```typescript
 * import { globalRateLimitMiddleware } from '@/lib/middleware/global-rate-limit';
 *
 * export async function middleware(request: NextRequest) {
 *   // Apply rate limiting
 *   const rateLimitResponse = await globalRateLimitMiddleware(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Continue with other middleware...
 * }
 * ```
 */
export async function globalRateLimitMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Skip rate limiting for certain paths
  if (shouldSkipRateLimit(pathname)) {
    return null; // Continue to next middleware
  }

  // Find appropriate rate limiter
  const rule = getRateLimiterForPath(pathname);
  if (!rule) {
    // No rate limiter found, allow request
    // This shouldn't happen if we have a catch-all rule
    return null;
  }

  // Get identifier for rate limiting
  const identifier = getRateLimitIdentifier(request);

  // Check rate limit
  const result = await enforceRateLimit(rule.limiter, identifier);

  if (!result.allowed) {
    // Rate limit exceeded
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Rate limit exceeded', {
        path: pathname,
        identifier,
        rule: rule.name,
      });
    }

    return NextResponse.json(
      {
        error: result.error,
        message: 'Too many requests. Please try again later.',
        retryAfter: result.headers['Retry-After'],
      },
      {
        status: 429,
        headers: result.headers,
      }
    );
  }

  // Rate limit check passed, continue to next middleware
  return null;
}

/**
 * Configuration helper for easy customization
 */
export const rateLimitConfig = {
  /**
   * Enable/disable rate limiting globally
   * Set to false for development or testing
   */
  enabled: process.env.RATE_LIMITING_ENABLED !== 'false',

  /**
   * Log rate limit hits
   */
  logHits: process.env.NODE_ENV !== 'production',

  /**
   * Fail open vs fail closed
   * If true, allow requests when rate limiter fails
   * If false, block requests when rate limiter fails
   */
  failOpen: true,
};

/**
 * Helper to check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return rateLimitConfig.enabled && process.env.NODE_ENV !== 'test';
}
