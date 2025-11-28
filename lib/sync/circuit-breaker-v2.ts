/**
 * Enhanced Circuit Breaker Pattern for Rate Limit Protection
 *
 * Improvements over v1:
 * 1. Exponential backoff instead of fixed duration
 * 2. Per-account circuit breakers (not just per-provider)
 * 3. Redis persistence for cross-instance state
 * 4. Smarter recovery with gradual ramp-up
 * 5. Metrics for monitoring
 *
 * States:
 * - CLOSED: Normal operation, all requests allowed
 * - OPEN: Too many failures, requests rejected
 * - HALF_OPEN: Testing recovery with limited requests
 */

import { cache } from '@/lib/redis/client';

// Circuit breaker configuration
const CONFIG = {
  // Number of failures before opening circuit
  FAILURE_THRESHOLD: 5,

  // Initial backoff duration (30 seconds)
  INITIAL_BACKOFF_MS: 30 * 1000,

  // Maximum backoff duration (5 minutes)
  MAX_BACKOFF_MS: 5 * 60 * 1000,

  // Backoff multiplier for exponential growth
  BACKOFF_MULTIPLIER: 2,

  // Number of test requests in half-open state
  HALF_OPEN_MAX_REQUESTS: 3,

  // Time before a success resets backoff (5 minutes of success)
  BACKOFF_RESET_AFTER_MS: 5 * 60 * 1000,

  // Redis key prefix
  REDIS_PREFIX: 'easemail:circuit:',

  // TTL for Redis keys (1 hour)
  REDIS_TTL_SECONDS: 60 * 60,
};

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number;
  openUntil: number | null;
  currentBackoffMs: number;
  halfOpenRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  lastSuccessTime: number;
}

// In-memory cache for hot path performance
const stateCache = new Map<string, CircuitBreakerState>();

/**
 * Get circuit breaker key (provider:accountId)
 */
function getKey(provider: string, accountId?: string): string {
  return accountId ? `${provider}:${accountId}` : provider;
}

/**
 * Get initial circuit breaker state
 */
function getInitialState(): CircuitBreakerState {
  return {
    state: 'CLOSED',
    consecutiveFailures: 0,
    lastFailureTime: 0,
    openUntil: null,
    currentBackoffMs: CONFIG.INITIAL_BACKOFF_MS,
    halfOpenRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    lastSuccessTime: 0,
  };
}

/**
 * Load circuit breaker state from Redis or cache
 */
async function loadState(key: string): Promise<CircuitBreakerState> {
  // Check in-memory cache first
  const cached = stateCache.get(key);
  if (cached) {
    return cached;
  }

  // Try Redis
  try {
    const redisKey = `${CONFIG.REDIS_PREFIX}${key}`;
    const state = await cache.get<CircuitBreakerState>(redisKey);
    if (state) {
      stateCache.set(key, state);
      return state;
    }
  } catch (error) {
    console.warn(`[Circuit Breaker] Failed to load from Redis: ${error}`);
  }

  // Return initial state
  const initial = getInitialState();
  stateCache.set(key, initial);
  return initial;
}

/**
 * Save circuit breaker state to Redis and cache
 */
async function saveState(key: string, state: CircuitBreakerState): Promise<void> {
  stateCache.set(key, state);

  try {
    const redisKey = `${CONFIG.REDIS_PREFIX}${key}`;
    await cache.set(redisKey, state, CONFIG.REDIS_TTL_SECONDS);
  } catch (error) {
    console.warn(`[Circuit Breaker] Failed to save to Redis: ${error}`);
  }
}

/**
 * Check if circuit breaker allows the request
 */
export async function canMakeRequest(provider: string, accountId?: string): Promise<{
  allowed: boolean;
  state: CircuitState;
  reason?: string;
  retryAfterMs?: number;
}> {
  const key = getKey(provider, accountId);
  const breaker = await loadState(key);
  const now = Date.now();

  // CLOSED state - allow all requests
  if (breaker.state === 'CLOSED') {
    return { allowed: true, state: 'CLOSED' };
  }

  // OPEN state - check if should transition to HALF_OPEN
  if (breaker.state === 'OPEN') {
    if (breaker.openUntil && now >= breaker.openUntil) {
      // Transition to HALF_OPEN
      breaker.state = 'HALF_OPEN';
      breaker.halfOpenRequests = 0;
      await saveState(key, breaker);

      console.log(`🟡 [Circuit Breaker] ${key} → HALF_OPEN (testing recovery)`);
      return { allowed: true, state: 'HALF_OPEN' };
    }

    // Still open
    const retryAfterMs = breaker.openUntil ? breaker.openUntil - now : breaker.currentBackoffMs;
    return {
      allowed: false,
      state: 'OPEN',
      reason: `Circuit OPEN for ${key} - too many rate limits. Retry in ${Math.round(retryAfterMs / 1000)}s`,
      retryAfterMs,
    };
  }

  // HALF_OPEN state - allow limited requests
  if (breaker.state === 'HALF_OPEN') {
    if (breaker.halfOpenRequests < CONFIG.HALF_OPEN_MAX_REQUESTS) {
      breaker.halfOpenRequests++;
      await saveState(key, breaker);
      return { allowed: true, state: 'HALF_OPEN' };
    }

    // Too many half-open requests without success - reopen
    return {
      allowed: false,
      state: 'HALF_OPEN',
      reason: `Circuit HALF_OPEN for ${key} - waiting for test results`,
      retryAfterMs: 5000, // Short retry for half-open
    };
  }

  return { allowed: true, state: 'CLOSED' };
}

/**
 * Record a successful request
 */
export async function recordSuccess(provider: string, accountId?: string): Promise<void> {
  const key = getKey(provider, accountId);
  const breaker = await loadState(key);
  const now = Date.now();

  // Update success metrics
  breaker.totalSuccesses++;
  breaker.lastSuccessTime = now;

  if (breaker.state === 'HALF_OPEN') {
    // Successful test in half-open - close the circuit
    console.log(`✅ [Circuit Breaker] ${key} → CLOSED (recovery confirmed)`);

    breaker.state = 'CLOSED';
    breaker.consecutiveFailures = 0;
    breaker.halfOpenRequests = 0;
    breaker.openUntil = null;

    // Gradually reduce backoff on success
    if (now - breaker.lastFailureTime > CONFIG.BACKOFF_RESET_AFTER_MS) {
      breaker.currentBackoffMs = CONFIG.INITIAL_BACKOFF_MS;
    }
  } else if (breaker.state === 'CLOSED' && breaker.consecutiveFailures > 0) {
    // Reset failure count on success
    console.log(`✅ [Circuit Breaker] ${key}: Success after ${breaker.consecutiveFailures} failures - resetting`);
    breaker.consecutiveFailures = 0;
  }

  await saveState(key, breaker);
}

/**
 * Record a rate limit failure
 */
export async function recordRateLimitFailure(provider: string, accountId?: string): Promise<{
  circuitOpened: boolean;
  consecutiveFailures: number;
  backoffMs: number;
}> {
  const key = getKey(provider, accountId);
  const breaker = await loadState(key);
  const now = Date.now();

  // Update failure metrics
  breaker.consecutiveFailures++;
  breaker.totalFailures++;
  breaker.lastFailureTime = now;

  console.log(`⚠️ [Circuit Breaker] ${key}: Rate limit #${breaker.consecutiveFailures}/${CONFIG.FAILURE_THRESHOLD}`);

  // Check if we should open the circuit
  if (breaker.consecutiveFailures >= CONFIG.FAILURE_THRESHOLD) {
    if (breaker.state !== 'OPEN') {
      // Open the circuit with exponential backoff
      breaker.state = 'OPEN';
      breaker.openUntil = now + breaker.currentBackoffMs;

      console.log(`🔴 [Circuit Breaker] ${key} → OPEN (${breaker.consecutiveFailures} failures)`);
      console.log(`🔴 [Circuit Breaker] Backoff: ${breaker.currentBackoffMs / 1000}s`);

      // Increase backoff for next time (exponential)
      breaker.currentBackoffMs = Math.min(
        breaker.currentBackoffMs * CONFIG.BACKOFF_MULTIPLIER,
        CONFIG.MAX_BACKOFF_MS
      );

      await saveState(key, breaker);

      return {
        circuitOpened: true,
        consecutiveFailures: breaker.consecutiveFailures,
        backoffMs: breaker.currentBackoffMs / CONFIG.BACKOFF_MULTIPLIER, // Current backoff
      };
    }
  }

  // Half-open failure - reopen circuit
  if (breaker.state === 'HALF_OPEN') {
    breaker.state = 'OPEN';
    breaker.openUntil = now + breaker.currentBackoffMs;
    breaker.halfOpenRequests = 0;

    console.log(`🔴 [Circuit Breaker] ${key} → OPEN (half-open test failed)`);

    // Increase backoff
    breaker.currentBackoffMs = Math.min(
      breaker.currentBackoffMs * CONFIG.BACKOFF_MULTIPLIER,
      CONFIG.MAX_BACKOFF_MS
    );
  }

  await saveState(key, breaker);

  return {
    circuitOpened: breaker.state === 'OPEN',
    consecutiveFailures: breaker.consecutiveFailures,
    backoffMs: breaker.currentBackoffMs,
  };
}

/**
 * Record a non-rate-limit failure (network errors, etc.)
 */
export async function recordOtherFailure(provider: string, accountId?: string): Promise<void> {
  const key = getKey(provider, accountId);
  const breaker = await loadState(key);

  // Don't count non-rate-limit errors toward circuit breaker
  // But log for monitoring
  console.log(`ℹ️ [Circuit Breaker] ${key}: Non-rate-limit error (not counted toward threshold)`);
}

/**
 * Manually reset circuit breaker
 */
export async function resetCircuitBreaker(provider: string, accountId?: string): Promise<void> {
  const key = getKey(provider, accountId);

  console.log(`🔄 [Circuit Breaker] ${key} manually reset`);

  const state = getInitialState();
  stateCache.set(key, state);

  try {
    const redisKey = `${CONFIG.REDIS_PREFIX}${key}`;
    await cache.del(redisKey);
  } catch (error) {
    console.warn(`[Circuit Breaker] Failed to clear Redis: ${error}`);
  }
}

/**
 * Get circuit breaker statistics
 */
export async function getCircuitBreakerStats(provider?: string, accountId?: string): Promise<Record<string, {
  state: CircuitState;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  currentBackoffMs: number;
  openUntilMs: number | null;
  lastFailureAgo: number | null;
}>> {
  const now = Date.now();
  const stats: Record<string, any> = {};

  if (provider) {
    const key = getKey(provider, accountId);
    const breaker = await loadState(key);

    stats[key] = {
      state: breaker.state,
      consecutiveFailures: breaker.consecutiveFailures,
      totalFailures: breaker.totalFailures,
      totalSuccesses: breaker.totalSuccesses,
      currentBackoffMs: breaker.currentBackoffMs,
      openUntilMs: breaker.openUntil ? breaker.openUntil - now : null,
      lastFailureAgo: breaker.lastFailureTime ? now - breaker.lastFailureTime : null,
    };
  } else {
    // Return all cached circuit breakers
    for (const [key, breaker] of stateCache.entries()) {
      stats[key] = {
        state: breaker.state,
        consecutiveFailures: breaker.consecutiveFailures,
        totalFailures: breaker.totalFailures,
        totalSuccesses: breaker.totalSuccesses,
        currentBackoffMs: breaker.currentBackoffMs,
        openUntilMs: breaker.openUntil ? breaker.openUntil - now : null,
        lastFailureAgo: breaker.lastFailureTime ? now - breaker.lastFailureTime : null,
      };
    }
  }

  return stats;
}

/**
 * Check if any circuit breakers are currently open
 */
export function hasOpenCircuits(): boolean {
  for (const breaker of stateCache.values()) {
    if (breaker.state === 'OPEN') {
      return true;
    }
  }
  return false;
}

/**
 * Get list of providers/accounts with open circuits
 */
export function getOpenCircuits(): string[] {
  const open: string[] = [];
  for (const [key, breaker] of stateCache.entries()) {
    if (breaker.state === 'OPEN') {
      open.push(key);
    }
  }
  return open;
}
