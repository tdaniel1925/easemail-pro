/**
 * Tests for Cache Invalidation Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  invalidateMessagesCache,
  trackCacheKey,
  invalidateFoldersCache,
  invalidateContactsCache,
  invalidateEmailCache,
  invalidateAccountCache,
} from '../cache-invalidation';
import { cache } from '../client';

// Mock the cache client
vi.mock('../client', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

describe('Cache Invalidation', () => {
  const userId = 'user-123';
  const accountId = 'account-456';
  const messageId = 'msg-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackCacheKey()', () => {
    it('should track new cache keys for an account', async () => {
      const cacheKey = 'messages:user:account:folder';

      (cache.get as any).mockResolvedValue([]);

      await trackCacheKey(cacheKey, userId, accountId, 30);

      expect(cache.get).toHaveBeenCalledWith(`cache-keys:messages:${userId}:${accountId}`);
      expect(cache.set).toHaveBeenCalledWith(
        `cache-keys:messages:${userId}:${accountId}`,
        [cacheKey],
        40 // TTL + 10
      );
    });

    it('should not duplicate cache keys', async () => {
      const cacheKey = 'messages:user:account:folder';
      const existingKeys = [cacheKey, 'other-key'];

      (cache.get as any).mockResolvedValue(existingKeys);

      await trackCacheKey(cacheKey, userId, accountId, 30);

      // Should not add duplicate
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should add to existing keys list', async () => {
      const newKey = 'messages:user:account:newfolder';
      const existingKeys = ['messages:user:account:folder1'];

      (cache.get as any).mockResolvedValue(existingKeys);

      await trackCacheKey(newKey, userId, accountId, 30);

      expect(cache.set).toHaveBeenCalledWith(
        `cache-keys:messages:${userId}:${accountId}`,
        ['messages:user:account:folder1', newKey],
        40
      );
    });

    it('should handle cache errors gracefully', async () => {
      (cache.get as any).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(trackCacheKey('key', userId, accountId)).resolves.not.toThrow();
    });
  });

  describe('invalidateMessagesCache()', () => {
    it('should delete all tracked cache keys for an account', async () => {
      const trackedKeys = [
        'messages:user:account:inbox:null:50',
        'messages:user:account:sent:null:50',
        'messages:user:account:null:starred:50',
      ];

      (cache.get as any).mockResolvedValue(trackedKeys);

      await invalidateMessagesCache(userId, accountId);

      expect(cache.get).toHaveBeenCalledWith(`cache-keys:messages:${userId}:${accountId}`);

      // Should delete each tracked key
      trackedKeys.forEach(key => {
        expect(cache.del).toHaveBeenCalledWith(key);
      });

      // Should delete the tracking set
      expect(cache.del).toHaveBeenCalledWith(`cache-keys:messages:${userId}:${accountId}`);
      expect(cache.del).toHaveBeenCalledTimes(trackedKeys.length + 1);
    });

    it('should handle no tracked keys', async () => {
      (cache.get as any).mockResolvedValue(null);

      await invalidateMessagesCache(userId, accountId);

      // Should only try to delete the tracking set
      expect(cache.del).toHaveBeenCalledWith(`cache-keys:messages:${userId}:${accountId}`);
      expect(cache.del).toHaveBeenCalledTimes(1);
    });

    it('should handle empty tracked keys array', async () => {
      (cache.get as any).mockResolvedValue([]);

      await invalidateMessagesCache(userId, accountId);

      expect(cache.del).toHaveBeenCalledWith(`cache-keys:messages:${userId}:${accountId}`);
      expect(cache.del).toHaveBeenCalledTimes(1);
    });

    it('should handle cache errors gracefully', async () => {
      (cache.get as any).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(invalidateMessagesCache(userId, accountId)).resolves.not.toThrow();
    });
  });

  describe('invalidateFoldersCache()', () => {
    it('should delete folders cache key', async () => {
      await invalidateFoldersCache(userId, accountId);

      expect(cache.del).toHaveBeenCalledWith(`folders:${userId}:${accountId}`);
    });

    it('should handle errors gracefully', async () => {
      (cache.del as any).mockRejectedValue(new Error('Redis error'));

      await expect(invalidateFoldersCache(userId, accountId)).resolves.not.toThrow();
    });
  });

  describe('invalidateContactsCache()', () => {
    it('should delete contacts cache key', async () => {
      await invalidateContactsCache(userId);

      expect(cache.del).toHaveBeenCalledWith(`contacts:${userId}`);
    });

    it('should handle errors gracefully', async () => {
      (cache.del as any).mockRejectedValue(new Error('Redis error'));

      await expect(invalidateContactsCache(userId)).resolves.not.toThrow();
    });
  });

  describe('invalidateEmailCache()', () => {
    it('should delete email detail cache key', async () => {
      await invalidateEmailCache(messageId);

      expect(cache.del).toHaveBeenCalledWith(`email:${messageId}`);
    });

    it('should handle errors gracefully', async () => {
      (cache.del as any).mockRejectedValue(new Error('Redis error'));

      await expect(invalidateEmailCache(messageId)).resolves.not.toThrow();
    });
  });

  describe('invalidateAccountCache()', () => {
    it('should invalidate both messages and folders caches', async () => {
      (cache.get as any).mockResolvedValue([]);

      await invalidateAccountCache(userId, accountId);

      // Should call both invalidation functions
      expect(cache.del).toHaveBeenCalledWith(`cache-keys:messages:${userId}:${accountId}`);
      expect(cache.del).toHaveBeenCalledWith(`folders:${userId}:${accountId}`);
    });

    it('should handle partial failures', async () => {
      (cache.get as any).mockResolvedValue([]);
      (cache.del as any)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw even if one invalidation fails
      await expect(invalidateAccountCache(userId, accountId)).resolves.not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should track and invalidate complete cache lifecycle', async () => {
      vi.clearAllMocks();

      // Track cache keys
      (cache.get as any).mockResolvedValue([]);

      await trackCacheKey('key1', userId, accountId, 30);
      await trackCacheKey('key2', userId, accountId, 30);
      await trackCacheKey('key3', userId, accountId, 30);

      vi.clearAllMocks();

      // Simulate tracked keys exist when invalidating
      (cache.get as any).mockResolvedValue(['key1', 'key2', 'key3']);

      // Invalidate
      await invalidateMessagesCache(userId, accountId);

      // Verify all keys were deleted
      expect(cache.del).toHaveBeenCalledWith('key1');
      expect(cache.del).toHaveBeenCalledWith('key2');
      expect(cache.del).toHaveBeenCalledWith('key3');
      expect(cache.del).toHaveBeenCalledWith(`cache-keys:messages:${userId}:${accountId}`);
    });

    it('should handle bulk operations efficiently', async () => {
      vi.clearAllMocks();

      const keys = Array.from({ length: 50 }, (_, i) => `key${i}`);

      (cache.get as any).mockResolvedValue(keys);

      await invalidateMessagesCache(userId, accountId);

      // Should delete all keys + tracking set
      expect(cache.del).toHaveBeenCalledTimes(keys.length + 1);
    });
  });

  describe('Performance', () => {
    it('should invalidate cache quickly (< 10ms for 10 keys)', async () => {
      const keys = Array.from({ length: 10 }, (_, i) => `key${i}`);

      (cache.get as any).mockResolvedValue(keys);

      const start = performance.now();
      await invalidateMessagesCache(userId, accountId);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should track keys quickly (< 2ms)', async () => {
      (cache.get as any).mockResolvedValue([]);

      const start = performance.now();
      await trackCacheKey('key', userId, accountId, 30);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2);
    });
  });
});
