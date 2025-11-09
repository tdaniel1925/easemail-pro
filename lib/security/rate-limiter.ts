/**
 * API Rate Limiting
 *
 * Protects API endpoints from abuse using Upstash Redis
 * Critical for production SaaS deployment
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client
// Note: Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// ============================================================================
// Rate Limit Configurations
// ============================================================================

/**
 * AI Endpoints Rate Limit
 * - 20 requests per 10 seconds
 * - Prevents AI cost explosion
 */
export const aiRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
  analytics: true,
  prefix: "ratelimit:ai",
}) : null;

/**
 * Auth Endpoints Rate Limit
 * - 5 requests per 10 seconds
 * - Prevents brute force attacks
 */
export const authRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
  prefix: "ratelimit:auth",
}) : null;

/**
 * General API Rate Limit
 * - 100 requests per 10 seconds
 * - General API protection
 */
export const apiRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "ratelimit:api",
}) : null;

/**
 * Webhook Endpoints Rate Limit
 * - 50 requests per 10 seconds
 * - Higher limit for webhooks
 */
export const webhookRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "10 s"),
  analytics: true,
  prefix: "ratelimit:webhook",
}) : null;

// ============================================================================
// Helper Functions
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier
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
    console.warn('⚠️ Rate limiting disabled - Redis not configured');
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 10000,
    };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Middleware helper to check rate limit and return error if exceeded
 */
export async function enforceRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: true } | { allowed: false; error: string; headers: Record<string, string> }> {
  const result = await checkRateLimit(limiter, identifier);

  if (!result.success) {
    return {
      allowed: false,
      error: 'Rate limit exceeded. Please try again later.',
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.reset).toISOString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    };
  }

  return { allowed: true };
}

/**
 * Get identifier for rate limiting
 * Prefers userId, falls back to IP address
 */
export function getRateLimitIdentifier(userId?: string, ip?: string): string {
  return userId || ip || 'anonymous';
}
