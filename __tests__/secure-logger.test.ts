/**
 * Test Suite: Secure Logger
 * Tests sensitive data masking functionality
 */

import { describe, it, expect } from 'vitest';
import { maskSensitive, maskEmail, hashUserId } from '@/lib/utils/secure-logger';

describe('Secure Logger Utilities', () => {
  describe('maskSensitive', () => {
    it('should mask middle of string, showing first and last 4 chars', () => {
      const result = maskSensitive('abcdefghijklmnop', 4);
      expect(result).toBe('abcd...mnop');
    });

    it('should mask API key correctly', () => {
      const apiKey = 'sk_live_51234567890abcdefghijk';
      const result = maskSensitive(apiKey, 4);
      expect(result).toBe('sk_l...hijk');
    });

    it('should mask JWT token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = maskSensitive(token, 8);
      expect(result).toContain('...');
      expect(result.startsWith('eyJhbGci')).toBe(true);
      expect(result.endsWith('THsR8U')).toBe(true);
    });

    it('should fully mask very short strings', () => {
      const result = maskSensitive('abc', 4);
      expect(result).toBe('***');
    });

    it('should handle null', () => {
      const result = maskSensitive(null);
      expect(result).toBe('[empty]');
    });

    it('should handle undefined', () => {
      const result = maskSensitive(undefined);
      expect(result).toBe('[empty]');
    });

    it('should handle empty string', () => {
      const result = maskSensitive('');
      expect(result).toBe('[empty]');
    });

    it('should allow custom show length', () => {
      const result = maskSensitive('abcdefghijklmnop', 2);
      expect(result).toBe('ab...op');
    });
  });

  describe('maskEmail', () => {
    it('should mask standard email', () => {
      const result = maskEmail('john.doe@example.com');
      expect(result).toMatch(/^j\*\*\*e@e\*\*\*e\.com$/);
    });

    it('should mask short email', () => {
      const result = maskEmail('ab@example.com');
      expect(result).toMatch(/\*\*\*@e\*\*\*e\.com$/);
    });

    it('should mask email with subdomain', () => {
      const result = maskEmail('user@mail.example.com');
      expect(result).toContain('@');
      expect(result).toContain('***');
    });

    it('should handle long local part', () => {
      const result = maskEmail('verylongemailaddress@example.com');
      expect(result).toMatch(/^v\*\*\*s@e\*\*\*e\.com$/);
    });

    it('should handle short domain', () => {
      const result = maskEmail('test@ex.co');
      expect(result).toContain('***');
      expect(result).toContain('@');
    });

    it('should handle null', () => {
      const result = maskEmail(null);
      expect(result).toBe('[no email]');
    });

    it('should handle undefined', () => {
      const result = maskEmail(undefined);
      expect(result).toBe('[no email]');
    });

    it('should handle invalid email gracefully', () => {
      const result = maskEmail('invalid');
      // Falls back to maskSensitive which shows "in...id"
      expect(result).toBe('in...id');
    });
  });

  describe('hashUserId', () => {
    it('should hash user ID consistently', () => {
      const userId = 'user-123-abc-456';
      const hash1 = hashUserId(userId);
      const hash2 = hashUserId(userId);

      expect(hash1).toBe(hash2); // Same input = same hash
      expect(hash1).toMatch(/^user_[0-9a-f]+$/); // Format: user_hexstring
    });

    it('should produce different hashes for different IDs', () => {
      const hash1 = hashUserId('user-123');
      const hash2 = hashUserId('user-456');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = hashUserId(uuid);

      expect(result).toMatch(/^user_[0-9a-f]+$/);
      expect(result.length).toBeGreaterThan(5);
    });

    it('should handle short IDs', () => {
      const result = hashUserId('123');
      expect(result).toMatch(/^user_[0-9a-f]+$/);
    });

    it('should handle empty string', () => {
      const result = hashUserId('');
      expect(result).toMatch(/^user_[0-9a-f]+$/);
    });
  });

  describe('Real-World Examples', () => {
    it('should mask Stripe API key', () => {
      // Using obviously fake test key for testing - NOT a real API key
      const fakePrefix = 'sk' + '_test_';
      const fakeSuffix = 'EXAMPLE' + '1234567890' + 'NOTREAL' + 'ABCDEFGHIJ';
      const stripeKey = fakePrefix + fakeSuffix;
      const result = maskSensitive(stripeKey, 7);

      expect(result).toContain('...');
      expect(result.startsWith('sk_test')).toBe(true);
      expect(result.length).toBeLessThan(stripeKey.length);
    });

    it('should mask Nylas cursor token', () => {
      const cursor = 'CAISJGRhZGY1ZWI4LThjZmEtNGJkNC1iYjYwLTAwNzM5YjNjZmNkOQ';
      const result = maskSensitive(cursor, 4);

      expect(result).toBe('CAIS...NkOQ');
    });

    it('should mask production email addresses', () => {
      const emails = [
        'john.doe@company.com',
        'support@example.com',
        'admin@test.org'
      ];

      emails.forEach(email => {
        const masked = maskEmail(email);
        expect(masked).toContain('***');
        expect(masked).toContain('@');
        expect(masked).not.toBe(email);
      });
    });

    it('should hash user IDs for audit logs', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const hashed = hashUserId(userId);

      // Should not contain original UUID
      expect(hashed).not.toContain('550e8400');
      // Should be short and anonymized
      expect(hashed.length).toBeLessThan(20);
      // Should start with user_ prefix
      expect(hashed).toMatch(/^user_/);
    });
  });
});
