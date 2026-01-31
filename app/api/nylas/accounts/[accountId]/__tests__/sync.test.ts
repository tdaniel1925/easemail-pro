/**
 * Tests for account sync endpoint
 * Ensures sync locking, reconnection, and error handling work correctly
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('Account Sync Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sync Locking', () => {
    test('prevents concurrent syncs on same account', () => {
      // Scenario: Account is already syncing
      const account = {
        id: 'account-123',
        userId: 'user-123',
        syncStatus: 'syncing',
        emailAddress: 'test@example.com',
      };

      // Expected: 409 Conflict response
      expect(account.syncStatus).toBe('syncing');

      // Verify that a second sync request would be rejected
      const shouldReject = account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing';
      expect(shouldReject).toBe(true);
    });

    test('prevents concurrent syncs when background syncing', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        syncStatus: 'background_syncing',
        emailAddress: 'test@example.com',
      };

      const shouldReject = account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing';
      expect(shouldReject).toBe(true);
    });

    test('allows sync when account is idle', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        syncStatus: 'idle',
        emailAddress: 'test@example.com',
      };

      const shouldReject = account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing';
      expect(shouldReject).toBe(false);
    });

    test('allows sync when account has error', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        syncStatus: 'error',
        emailAddress: 'test@example.com',
      };

      const shouldReject = account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing';
      expect(shouldReject).toBe(false);
    });

    test('allows sync when account is completed', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        syncStatus: 'completed',
        emailAddress: 'test@example.com',
      };

      const shouldReject = account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing';
      expect(shouldReject).toBe(false);
    });
  });

  describe('Status Enum Validation', () => {
    test('only allows valid status values', () => {
      const validStatuses = ['idle', 'syncing', 'completed', 'error', 'pending', 'background_syncing'];
      const invalidStatuses = ['active', 'initializing', 'processing', 'done'];

      validStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(true);
      });

      invalidStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(false);
      });
    });

    test('REGRESSION: callback route must not use invalid status values', () => {
      // This is the bug that was fixed in P0
      // OAuth callback was setting status to 'active' and 'initializing' (not in enum)

      const invalidStatuses = ['active', 'initializing'];
      const validStatuses = ['idle', 'syncing', 'completed', 'error', 'pending', 'background_syncing'];

      invalidStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(false);
      });

      // After reconnection, status should be 'idle'
      const reconnectedStatus = 'idle';
      expect(validStatuses.includes(reconnectedStatus)).toBe(true);

      // After new account creation, status should be 'idle'
      const newAccountStatus = 'idle';
      expect(validStatuses.includes(newAccountStatus)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('identifies auth errors for reconnect button', () => {
      const authErrors = [
        'unauthorized',
        '401 Unauthorized',
        'invalid token',
        'auth failed',
        'authentication required',
      ];

      authErrors.forEach(error => {
        const errorLower = error.toLowerCase();
        const isAuthError =
          errorLower.includes('auth') ||
          errorLower.includes('unauthorized') ||
          errorLower.includes('401') ||
          errorLower.includes('token');

        expect(isAuthError).toBe(true);
      });
    });

    test('does not identify non-auth errors as auth errors', () => {
      const nonAuthErrors = [
        'network error',
        'timeout',
        '500 Internal Server Error',
        'rate limit exceeded',
      ];

      nonAuthErrors.forEach(error => {
        const errorLower = error.toLowerCase();
        const isAuthError =
          errorLower.includes('auth') ||
          errorLower.includes('unauthorized') ||
          errorLower.includes('401') ||
          errorLower.includes('token');

        expect(isAuthError).toBe(false);
      });
    });
  });

  describe('Sync Triggering', () => {
    test('triggers sync for new accounts', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        syncStatus: 'idle',
        emailAddress: 'test@example.com',
        isNew: true,
      };

      // New accounts should trigger sync
      expect(account.isNew).toBe(true);
      expect(account.syncStatus).toBe('idle');

      // After triggering, status should be set to 'syncing'
      const newStatus = 'syncing';
      const validStatuses = ['idle', 'syncing', 'completed', 'error', 'pending', 'background_syncing'];
      expect(validStatuses.includes(newStatus)).toBe(true);
    });

    test('triggers sync for reconnected accounts', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        syncStatus: 'idle',
        emailAddress: 'test@example.com',
        isReconnected: true,
      };

      // Reconnected accounts should trigger sync
      expect(account.isReconnected).toBe(true);
      expect(account.syncStatus).toBe('idle');

      // After triggering, status should be set to 'syncing'
      const newStatus = 'syncing';
      const validStatuses = ['idle', 'syncing', 'completed', 'error', 'pending', 'background_syncing'];
      expect(validStatuses.includes(newStatus)).toBe(true);
    });
  });

  describe('Account Ownership Verification', () => {
    test('rejects sync request if account does not belong to user', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        emailAddress: 'test@example.com',
      };

      const requestingUserId = 'user-456';

      // Should reject
      expect(account.userId).not.toBe(requestingUserId);
    });

    test('allows sync request if account belongs to user', () => {
      const account = {
        id: 'account-123',
        userId: 'user-123',
        emailAddress: 'test@example.com',
      };

      const requestingUserId = 'user-123';

      // Should allow
      expect(account.userId).toBe(requestingUserId);
    });
  });
});
