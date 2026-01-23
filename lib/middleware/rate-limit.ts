/**
 * Enhanced Rate Limiting Middleware
 *
 * Uses Upstash Redis for distributed rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiter configurations
const limiters = {
  // AI operations - expensive, limit strictly
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
    analytics: true,
    prefix: 'ratelimit:ai',
  }),

  // Authentication endpoints - prevent brute force
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // Admin operations - moderate limiting
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
    analytics: true,
    prefix: 'ratelimit:admin',
  }),

  // Bulk operations - prevent abuse
  bulk: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '10 m'), // 20 bulk ops per 10 minutes
    analytics: true,
    prefix: 'ratelimit:bulk',
  }),

  // SMS sending - costly, limit strictly
  sms: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'), // 50 SMS per hour
    analytics: true,
    prefix: 'ratelimit:sms',
  }),

  // Contact imports - resource intensive
  import: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 imports per hour
    analytics: true,
    prefix: 'ratelimit:import',
  }),

  // General API - default for other endpoints
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 h'), // 1000 requests per hour
    analytics: true,
    prefix: 'ratelimit:api',
  }),
};

export type RateLimitType = keyof typeof limiters;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  response?: NextResponse;
}

/**
 * Check rate limit for a specific identifier
 *
 * @param type - Type of rate limit to apply
 * @param identifier - Unique identifier (usually user ID or IP)
 * @returns Rate limit result with response if blocked
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = limiters[type];

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    const resetDate = new Date(reset);
    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
      response: NextResponse.json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        details: {
          limit,
          remaining: 0,
          resetAt: resetDate.toISOString(),
          retryAfter,
        },
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }),
    };
  }

  return {
    allowed: true,
    limit,
    remaining,
    reset,
  };
}

/**
 * Middleware wrapper to apply rate limiting to a route handler
 */
export function withRateLimit(
  type: RateLimitType,
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  getIdentifier?: (request: NextRequest) => string
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Get identifier (default to IP address from headers)
    const identifier = getIdentifier
      ? getIdentifier(request)
      : request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';

    // Check rate limit
    const result = await checkRateLimit(type, identifier);

    if (!result.allowed) {
      return result.response!;
    }

    // Add rate limit headers to response
    const response = await handler(request, ...args);
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());

    return response;
  };
}

/**
 * Get user identifier from authenticated request
 */
export function getUserIdentifier(request: NextRequest): string {
  // This should be called after authentication
  // Extract user ID from session or JWT
  // For now, fall back to IP from headers
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
}
