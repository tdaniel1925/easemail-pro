/**
 * Enhanced Rate Limiting System
 *
 * Multi-tier rate limiting for different endpoint types:
 * - Tier 1 (Strict): Authentication endpoints
 * - Tier 2 (Expensive): AI, file uploads, external API calls
 * - Tier 3 (Moderate): Write operations (POST, PUT, DELETE)
 * - Tier 4 (Generous): Read operations (GET)
 * - Tier 5 (High): Webhook receivers
 *
 * Usage:
 *   import { authStrictLimit, enforceRateLimit } from '@/lib/security/enhanced-rate-limiter';
 *
 *   const result = await enforceRateLimit(authStrictLimit, userId || ip);
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: result.error }, {
 *       status: 429,
 *       headers: result.headers
 *     });
 *   }
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================================
// Redis Client
// ============================================================================

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// ============================================================================
// Rate Limit Tiers
// ============================================================================

/**
 * TIER 1: Authentication & Security (Very Strict)
 *
 * Use for:
 * - Login attempts
 * - Password reset requests
 * - Account creation
 * - 2FA verification
 *
 * Limit: 5 requests per 15 minutes
 * Reason: Prevent brute force attacks
 */
export const authStrictLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "ratelimit:auth:strict",
}) : null;

/**
 * TIER 2: Expensive Operations (Strict)
 *
 * Use for:
 * - AI/LLM API calls (OpenAI, Claude)
 * - File uploads
 * - Image processing
 * - Data imports
 *
 * Limit: 10 requests per 5 minutes
 * Reason: Prevent cost explosion and resource abuse
 */
export const expensiveLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "5 m"),
  analytics: true,
  prefix: "ratelimit:expensive",
}) : null;

/**
 * TIER 3: Write Operations (Moderate)
 *
 * Use for:
 * - Email send/draft/delete
 * - Contact create/update/delete
 * - Calendar event creation
 * - Sync operations
 *
 * Limit: 60 requests per 1 minute
 * Reason: Protect database and external API quotas
 */
export const writeLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix: "ratelimit:write",
}) : null;

/**
 * TIER 4: Read Operations (Generous)
 *
 * Use for:
 * - Email list/fetch
 * - Contact list/search
 * - Calendar events fetch
 * - Search operations
 *
 * Limit: 200 requests per 1 minute
 * Reason: Allow normal usage while preventing scraping
 */
export const readLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  analytics: true,
  prefix: "ratelimit:read",
}) : null;

/**
 * TIER 5: Webhook Receivers (High Volume)
 *
 * Use for:
 * - Nylas webhooks
 * - Stripe webhooks
 * - Other trusted webhook sources
 *
 * Limit: 100 requests per 1 minute
 * Reason: Handle burst traffic from legitimate sources
 */
export const webhookLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:webhook",
}) : null;

// Legacy exports (for backwards compatibility)
export const aiRateLimit = expensiveLimit;
export const authRateLimit = authStrictLimit;
export const apiRateLimit = readLimit;

// ============================================================================
// Helper Functions
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export type RateLimitEnforceResult = {
  allowed: true;
} | {
  allowed: false;
  error: string;
  headers: Record<string, string>;
}

/**
 * Check rate limit for a given identifier
 *
 * @param limiter - The Ratelimit instance to use
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  // If Redis is not configured, allow all requests (development mode)
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ CRITICAL: Rate limiting disabled in production - Redis not configured');
    } else {
      console.warn('⚠️ Rate limiting disabled - Redis not configured');
    }

    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);

    // Fail open (allow request) but log error
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Enforce rate limit - returns error response if exceeded
 *
 * @param limiter - The Ratelimit instance to use
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @returns Enforcement result
 */
export async function enforceRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitEnforceResult> {
  const result = await checkRateLimit(limiter, identifier);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    return {
      allowed: false,
      error: 'Rate limit exceeded. Please try again later.',
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.reset).toISOString(),
        'Retry-After': retryAfter.toString(),
      },
    };
  }

  return { allowed: true };
}

/**
 * Get identifier for rate limiting
 * Prioritizes user ID, falls back to IP address
 *
 * @param userId - User ID (if authenticated)
 * @param ip - IP address (from headers)
 * @returns Rate limit identifier
 */
export function getRateLimitIdentifier(userId?: string | null, ip?: string | null): string {
  if (userId) {
    return `user:${userId}`;
  }

  if (ip) {
    return `ip:${ip}`;
  }

  return 'anonymous';
}

/**
 * Extract IP address from request headers
 *
 * @param request - Next.js request object
 * @returns IP address or null
 */
export function getIpFromRequest(request: Request): string | null {
  // Try various headers
  const headers = (request as any).headers;

  return (
    headers.get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get?.('x-real-ip') ||
    headers.get?.('cf-connecting-ip') || // Cloudflare
    null
  );
}

/**
 * Add rate limit headers to response
 *
 * @param result - Rate limit check result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };
}

// ============================================================================
// In-Memory Fallback (Emergency)
// ============================================================================

/**
 * Simple in-memory rate limiter for when Redis is unavailable
 *
 * WARNING: This provides minimal protection and is not suitable for production
 * across multiple servers. It's only for emergencies.
 */

interface InMemoryEntry {
  requests: number[];
  window: number;
}

const inMemoryStore = new Map<string, InMemoryEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.requests.every(t => t < now - entry.window)) {
      inMemoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function inMemoryRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryStore.get(identifier) || { requests: [], window: windowMs };

  // Remove requests outside the window
  entry.requests = entry.requests.filter(t => t > now - windowMs);

  // Check limit
  if (entry.requests.length >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.min(...entry.requests) + windowMs,
    };
  }

  // Add current request
  entry.requests.push(now);
  inMemoryStore.set(identifier, entry);

  return {
    success: true,
    limit,
    remaining: limit - entry.requests.length,
    reset: now + windowMs,
  };
}

// ============================================================================
// Rate Limit Configuration Map (for middleware)
// ============================================================================

/**
 * Map of path patterns to rate limiters
 * Used by global middleware for automatic rate limiting
 */
export const RATE_LIMIT_MAP: Record<string, Ratelimit | null> = {
  // Authentication (Tier 1 - Strict)
  '/api/auth/login': authStrictLimit,
  '/api/auth/signup': authStrictLimit,
  '/api/auth/request-password-reset': authStrictLimit,
  '/api/auth/reset-password': authStrictLimit,
  '/api/auth/verify-2fa': authStrictLimit,
  '/api/admin/setup': authStrictLimit,

  // Expensive operations (Tier 2 - Expensive)
  '/api/ai/*': expensiveLimit,
  '/api/files/upload': expensiveLimit,
  '/api/attachments/upload': expensiveLimit,
  '/api/contacts/import': expensiveLimit,
  '/api/emails/import': expensiveLimit,

  // Write operations (Tier 3 - Moderate)
  '/api/emails/send': writeLimit,
  '/api/emails/draft': writeLimit,
  '/api/emails': writeLimit, // POST, PUT, DELETE
  '/api/contacts': writeLimit, // POST, PUT, DELETE
  '/api/calendar/events': writeLimit, // POST, PUT, DELETE
  '/api/sms/send': writeLimit,
  '/api/sync/start': writeLimit,

  // Read operations (Tier 4 - Generous)
  '/api/emails/list': readLimit,
  '/api/contacts/list': readLimit,
  '/api/calendar/events/list': readLimit,
  '/api/search': readLimit,

  // Webhooks (Tier 5 - High Volume)
  '/api/webhooks/*': webhookLimit,
};
