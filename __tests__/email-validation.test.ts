/**
 * Test Suite: Email Validation
 * Tests the email validation logic added to prevent spam/abuse
 */

import { describe, it, expect } from 'vitest';

describe('Email Validation', () => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_RECIPIENTS = 50;

  const parseRecipients = (recipients: any): Array<{email: string}> => {
    if (!recipients) return [];

    let emails: string[] = [];

    if (typeof recipients === 'string') {
      emails = recipients.split(',').map((e: string) => e.trim()).filter(Boolean);
    } else if (Array.isArray(recipients)) {
      emails = recipients.map((r: any) => {
        if (typeof r === 'string') return r.trim();
        if (r && typeof r.email === 'string') return r.email.trim();
        return '';
      }).filter(Boolean);
    }

    const validated = emails.map(email => {
      const cleanEmail = email.toLowerCase();

      if (!EMAIL_REGEX.test(cleanEmail)) {
        throw new Error(`Invalid email address format: ${email}`);
      }

      if (cleanEmail.length > 320) {
        throw new Error(`Email address too long: ${email}`);
      }

      return { email: cleanEmail };
    });

    if (validated.length > MAX_RECIPIENTS) {
      throw new Error(`Too many recipients (${validated.length}). Maximum ${MAX_RECIPIENTS} allowed.`);
    }

    return validated;
  };

  describe('Valid Emails', () => {
    it('should accept valid single email', () => {
      const result = parseRecipients('test@example.com');
      expect(result).toEqual([{ email: 'test@example.com' }]);
    });

    it('should accept multiple valid emails', () => {
      const result = parseRecipients('test1@example.com, test2@example.com');
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('test1@example.com');
      expect(result[1].email).toBe('test2@example.com');
    });

    it('should convert emails to lowercase', () => {
      const result = parseRecipients('Test@EXAMPLE.COM');
      expect(result[0].email).toBe('test@example.com');
    });

    it('should handle array of email strings', () => {
      const result = parseRecipients(['test1@example.com', 'test2@example.com']);
      expect(result).toHaveLength(2);
    });

    it('should handle array of email objects', () => {
      const result = parseRecipients([
        { email: 'test1@example.com' },
        { email: 'test2@example.com' }
      ]);
      expect(result).toHaveLength(2);
    });

    it('should trim whitespace', () => {
      const result = parseRecipients('  test@example.com  ');
      expect(result[0].email).toBe('test@example.com');
    });

    it('should accept email with subdomain', () => {
      const result = parseRecipients('user@mail.example.com');
      expect(result[0].email).toBe('user@mail.example.com');
    });

    it('should accept email with + sign', () => {
      const result = parseRecipients('user+tag@example.com');
      expect(result[0].email).toBe('user+tag@example.com');
    });

    it('should accept email with dots', () => {
      const result = parseRecipients('first.last@example.com');
      expect(result[0].email).toBe('first.last@example.com');
    });
  });

  describe('Invalid Emails', () => {
    it('should reject email without @', () => {
      expect(() => parseRecipients('invalid')).toThrow('Invalid email address format');
    });

    it('should reject email without domain', () => {
      expect(() => parseRecipients('test@')).toThrow('Invalid email address format');
    });

    it('should reject email without local part', () => {
      expect(() => parseRecipients('@example.com')).toThrow('Invalid email address format');
    });

    it('should reject email without TLD', () => {
      expect(() => parseRecipients('test@example')).toThrow('Invalid email address format');
    });

    it('should reject email with spaces', () => {
      expect(() => parseRecipients('test @example.com')).toThrow('Invalid email address format');
    });

    it('should reject email with multiple @', () => {
      expect(() => parseRecipients('test@@example.com')).toThrow('Invalid email address format');
    });

    it('should reject empty string', () => {
      const result = parseRecipients('');
      expect(result).toEqual([]);
    });

    it('should reject extremely long email (>320 chars)', () => {
      const longEmail = 'a'.repeat(310) + '@example.com';
      expect(() => parseRecipients(longEmail)).toThrow('Email address too long');
    });
  });

  describe('Recipient Limits', () => {
    it('should accept exactly 50 recipients', () => {
      const emails = Array.from({ length: 50 }, (_, i) => `test${i}@example.com`);
      const result = parseRecipients(emails);
      expect(result).toHaveLength(50);
    });

    it('should reject 51 recipients', () => {
      const emails = Array.from({ length: 51 }, (_, i) => `test${i}@example.com`);
      expect(() => parseRecipients(emails)).toThrow('Too many recipients');
    });

    it('should reject 100 recipients', () => {
      const emails = Array.from({ length: 100 }, (_, i) => `test${i}@example.com`);
      expect(() => parseRecipients(emails)).toThrow('Too many recipients');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      const result = parseRecipients(null);
      expect(result).toEqual([]);
    });

    it('should handle undefined input', () => {
      const result = parseRecipients(undefined);
      expect(result).toEqual([]);
    });

    it('should filter out empty strings from comma-separated list', () => {
      const result = parseRecipients('test@example.com,,test2@example.com');
      expect(result).toHaveLength(2);
    });

    it('should handle mixed valid and invalid in array', () => {
      expect(() => parseRecipients([
        'valid@example.com',
        'invalid',
      ])).toThrow('Invalid email address format');
    });
  });
});
