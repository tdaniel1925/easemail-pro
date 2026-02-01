/**
 * Cache Invalidation Utilities
 * Provides pattern-based cache invalidation for API responses
 */

import { cache } from '@/lib/redis/client';

/**
 * Invalidate all message caches for a specific account
 * This should be called when emails are modified (delete, move, archive, etc.)
 */
export async function invalidateMessagesCache(userId: string, accountId: string): Promise<void> {
  // Since we can't easily do pattern matching with Upstash REST API,
  // we'll track cache keys per account in a separate Redis set
  const trackingKey = `cache-keys:messages:${userId}:${accountId}`;

  try {
    // Get all tracked cache keys for this account
    const cacheKeys = await cache.get<string[]>(trackingKey);

    if (cacheKeys && Array.isArray(cacheKeys)) {
      // Delete all tracked cache keys
      const deletePromises = cacheKeys.map(key => cache.del(key));
      await Promise.all(deletePromises);

      console.log(`[Cache] Invalidated ${cacheKeys.length} message cache entries for account ${accountId}`);
    }

    // Clear the tracking set
    await cache.del(trackingKey);
  } catch (error) {
    console.error('[Cache] Failed to invalidate messages cache:', error);
    // Non-critical error, continue
  }
}

/**
 * Track a cache key for an account (so we can invalidate it later)
 */
export async function trackCacheKey(
  cacheKey: string,
  userId: string,
  accountId: string,
  ttl: number = 30
): Promise<void> {
  const trackingKey = `cache-keys:messages:${userId}:${accountId}`;

  try {
    // Get existing keys
    const existingKeys = await cache.get<string[]>(trackingKey) || [];

    // Add new key if not already tracked
    if (!existingKeys.includes(cacheKey)) {
      existingKeys.push(cacheKey);

      // Store with same TTL as the actual cache (plus a buffer)
      await cache.set(trackingKey, existingKeys, ttl + 10);
    }
  } catch (error) {
    console.error('[Cache] Failed to track cache key:', error);
    // Non-critical error, continue
  }
}

/**
 * Invalidate folder cache for an account
 */
export async function invalidateFoldersCache(userId: string, accountId: string): Promise<void> {
  const cacheKey = `folders:${userId}:${accountId}`;

  try {
    await cache.del(cacheKey);
    console.log(`[Cache] Invalidated folders cache for account ${accountId}`);
  } catch (error) {
    console.error('[Cache] Failed to invalidate folders cache:', error);
  }
}

/**
 * Invalidate contacts cache for a user
 */
export async function invalidateContactsCache(userId: string): Promise<void> {
  const cacheKey = `contacts:${userId}`;

  try {
    await cache.del(cacheKey);
    console.log(`[Cache] Invalidated contacts cache for user ${userId}`);
  } catch (error) {
    console.error('[Cache] Failed to invalidate contacts cache:', error);
  }
}

/**
 * Invalidate email detail cache for a specific message
 */
export async function invalidateEmailCache(messageId: string): Promise<void> {
  const cacheKey = `email:${messageId}`;

  try {
    await cache.del(cacheKey);
    console.log(`[Cache] Invalidated email cache for message ${messageId}`);
  } catch (error) {
    console.error('[Cache] Failed to invalidate email cache:', error);
  }
}

/**
 * Invalidate all caches related to an account (nuclear option)
 */
export async function invalidateAccountCache(userId: string, accountId: string): Promise<void> {
  try {
    await Promise.all([
      invalidateMessagesCache(userId, accountId),
      invalidateFoldersCache(userId, accountId),
    ]);

    console.log(`[Cache] Fully invalidated cache for account ${accountId}`);
  } catch (error) {
    console.error('[Cache] Failed to invalidate account cache:', error);
  }
}
