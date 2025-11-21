/**
 * Circuit Breaker Pattern for Rate Limit Protection
 * Prevents cascading failures when rate limits are consistently hit
 */

interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureTime: number;
  isOpen: boolean;
  openUntil: number | null;
}

// Circuit breaker thresholds
const FAILURE_THRESHOLD = 5; // Open circuit after 5 consecutive rate limit errors
const CIRCUIT_OPEN_DURATION_MS = 5 * 60 * 1000; // Keep circuit open for 5 minutes
const HALF_OPEN_TEST_DELAY_MS = 30 * 1000; // Test recovery after 30 seconds in half-open state

// Track circuit breaker state per provider
const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Get or initialize circuit breaker for a provider
 */
function getCircuitBreaker(provider: string): CircuitBreakerState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, {
      consecutiveFailures: 0,
      lastFailureTime: 0,
      isOpen: false,
      openUntil: null,
    });
  }
  return circuitBreakers.get(provider)!;
}

/**
 * Check if circuit breaker allows the request
 */
export function canMakeRequest(provider: string): {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
} {
  const breaker = getCircuitBreaker(provider);
  const now = Date.now();

  // Circuit is closed (normal operation)
  if (!breaker.isOpen) {
    return { allowed: true };
  }

  // Circuit is open - check if it should transition to half-open
  if (breaker.openUntil && now >= breaker.openUntil) {
    console.log(`🟡 Circuit breaker for ${provider} entering HALF-OPEN state (testing recovery)`);
    breaker.isOpen = false; // Allow one test request
    return { allowed: true };
  }

  // Circuit still open - reject request
  const retryAfterMs = breaker.openUntil ? breaker.openUntil - now : CIRCUIT_OPEN_DURATION_MS;
  return {
    allowed: false,
    reason: `Circuit breaker OPEN for ${provider} (too many rate limit errors). Will retry in ${Math.round(retryAfterMs / 1000)}s`,
    retryAfterMs,
  };
}

/**
 * Record a successful request
 */
export function recordSuccess(provider: string): void {
  const breaker = getCircuitBreaker(provider);

  if (breaker.consecutiveFailures > 0) {
    console.log(`✅ Circuit breaker for ${provider}: Success after ${breaker.consecutiveFailures} failures - resetting`);
  }

  // Reset circuit breaker on success
  breaker.consecutiveFailures = 0;
  breaker.lastFailureTime = 0;
  breaker.isOpen = false;
  breaker.openUntil = null;
}

/**
 * Record a rate limit failure
 */
export function recordRateLimitFailure(provider: string): {
  shouldOpenCircuit: boolean;
  consecutiveFailures: number;
} {
  const breaker = getCircuitBreaker(provider);
  const now = Date.now();

  breaker.consecutiveFailures++;
  breaker.lastFailureTime = now;

  console.log(`⚠️ Circuit breaker for ${provider}: Rate limit failure #${breaker.consecutiveFailures}/${FAILURE_THRESHOLD}`);

  // Open circuit if threshold reached
  if (breaker.consecutiveFailures >= FAILURE_THRESHOLD && !breaker.isOpen) {
    breaker.isOpen = true;
    breaker.openUntil = now + CIRCUIT_OPEN_DURATION_MS;

    console.log(`🔴 Circuit breaker OPENED for ${provider} (${FAILURE_THRESHOLD} consecutive failures)`);
    console.log(`🔴 All syncing for ${provider} paused for ${CIRCUIT_OPEN_DURATION_MS / 1000}s`);

    return {
      shouldOpenCircuit: true,
      consecutiveFailures: breaker.consecutiveFailures,
    };
  }

  return {
    shouldOpenCircuit: false,
    consecutiveFailures: breaker.consecutiveFailures,
  };
}

/**
 * Record a non-rate-limit failure (resets if it's a different error)
 */
export function recordOtherFailure(provider: string): void {
  const breaker = getCircuitBreaker(provider);

  // Non-rate-limit errors don't count toward circuit breaker
  // but we should still track them
  if (breaker.consecutiveFailures > 0) {
    console.log(`ℹ️ Circuit breaker for ${provider}: Non-rate-limit error - keeping failure count at ${breaker.consecutiveFailures}`);
  }

  // Don't reset on other errors - we only care about rate limits
}

/**
 * Manually reset circuit breaker (for admin override)
 */
export function resetCircuitBreaker(provider: string): void {
  const breaker = getCircuitBreaker(provider);

  console.log(`🔄 Circuit breaker for ${provider} manually reset`);

  breaker.consecutiveFailures = 0;
  breaker.lastFailureTime = 0;
  breaker.isOpen = false;
  breaker.openUntil = null;
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats(provider?: string): Record<string, {
  isOpen: boolean;
  consecutiveFailures: number;
  openUntilMs: number | null;
  lastFailureAgo: number | null;
}> {
  const now = Date.now();
  const stats: Record<string, any> = {};

  // If specific provider requested
  if (provider) {
    const breaker = getCircuitBreaker(provider);
    return {
      [provider]: {
        isOpen: breaker.isOpen,
        consecutiveFailures: breaker.consecutiveFailures,
        openUntilMs: breaker.openUntil ? breaker.openUntil - now : null,
        lastFailureAgo: breaker.lastFailureTime ? now - breaker.lastFailureTime : null,
      },
    };
  }

  // Return all circuit breakers
  Array.from(circuitBreakers.entries()).forEach(([providerName, breaker]) => {
    stats[providerName] = {
      isOpen: breaker.isOpen,
      consecutiveFailures: breaker.consecutiveFailures,
      openUntilMs: breaker.openUntil ? breaker.openUntil - now : null,
      lastFailureAgo: breaker.lastFailureTime ? now - breaker.lastFailureTime : null,
    };
  });

  return stats;
}

/**
 * Check if any circuit breakers are currently open
 */
export function hasOpenCircuits(): boolean {
  return Array.from(circuitBreakers.values()).some(breaker => breaker.isOpen);
}

/**
 * Get list of providers with open circuits
 */
export function getOpenCircuits(): string[] {
  return Array.from(circuitBreakers.entries())
    .filter(([_, breaker]) => breaker.isOpen)
    .map(([provider]) => provider);
}
