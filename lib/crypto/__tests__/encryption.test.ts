/**
 * Tests for Email Encryption at Rest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptEmailBody,
  decryptEmailBody,
  encryptFields,
  decryptFields,
  generateEncryptionKey,
  isEncryptionConfigured,
} from '../encryption';

describe('Encryption', () => {
  // Set a test encryption key
  beforeEach(() => {
    process.env.EMAIL_ENCRYPTION_KEY = generateEncryptionKey();
  });

  describe('encrypt() and decrypt()', () => {
    it('should encrypt and decrypt plaintext correctly', () => {
      const plaintext = 'This is a secret email body';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toBeTruthy();
      expect(decrypted).toBe(plaintext);
    });

    it('should return null for null input', () => {
      expect(encrypt(null)).toBe(null);
      expect(decrypt(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(encrypt(undefined)).toBe(null);
      expect(decrypt(undefined)).toBe(null);
    });

    it('should produce different ciphertext for same plaintext (unique IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle special characters and emojis', () => {
      const plaintext = 'Special chars: <>&"\'\\n\\t 🔒🔐✉️';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text (10KB+)', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return null for corrupted ciphertext', () => {
      const plaintext = 'Test message';
      const encrypted = encrypt(plaintext)!;

      // Corrupt the ciphertext
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      const decrypted = decrypt(corrupted);

      expect(decrypted).toBe(null);
    });

    it('should return null for invalid base64', () => {
      const invalid = 'not-valid-base64!!!';
      const decrypted = decrypt(invalid);

      expect(decrypted).toBe(null);
    });
  });

  describe('encryptEmailBody() and decryptEmailBody()', () => {
    it('should encrypt and decrypt email body with both HTML and text', () => {
      const body = {
        html: '<p>This is HTML body</p>',
        text: 'This is plain text body',
      };

      const encrypted = encryptEmailBody(body);
      const decrypted = decryptEmailBody(encrypted);

      expect(encrypted.html).not.toBe(body.html);
      expect(encrypted.text).not.toBe(body.text);
      expect(decrypted.html).toBe(body.html);
      expect(decrypted.text).toBe(body.text);
    });

    it('should handle null values in body', () => {
      const body = {
        html: null,
        text: 'Only text',
      };

      const encrypted = encryptEmailBody(body);
      const decrypted = decryptEmailBody(encrypted);

      expect(encrypted.html).toBe(null);
      expect(encrypted.text).not.toBe(body.text);
      expect(decrypted.html).toBe(null);
      expect(decrypted.text).toBe(body.text);
    });

    it('should handle undefined values in body', () => {
      const body = {
        html: '<p>HTML only</p>',
        text: undefined,
      };

      const encrypted = encryptEmailBody(body);
      const decrypted = decryptEmailBody(encrypted);

      expect(encrypted.html).not.toBe(body.html);
      expect(encrypted.text).toBe(null);
      expect(decrypted.html).toBe(body.html);
      expect(decrypted.text).toBe(null);
    });
  });

  describe('encryptFields() and decryptFields()', () => {
    it('should encrypt and decrypt specific fields in an object', () => {
      const email = {
        id: '123',
        subject: 'Confidential Report',
        body: 'This is secret',
        from: 'sender@example.com',
      };

      const encrypted = encryptFields(email, ['subject', 'body']);
      const decrypted = decryptFields(encrypted, ['subject', 'body']);

      expect(encrypted.id).toBe(email.id);
      expect(encrypted.from).toBe(email.from);
      expect(encrypted.subject).not.toBe(email.subject);
      expect(encrypted.body).not.toBe(email.body);

      expect(decrypted.id).toBe(email.id);
      expect(decrypted.from).toBe(email.from);
      expect(decrypted.subject).toBe(email.subject);
      expect(decrypted.body).toBe(email.body);
    });

    it('should skip non-string fields', () => {
      const obj = {
        text: 'Encrypt me',
        number: 123,
        bool: true,
        obj: { nested: 'value' },
      };

      const encrypted = encryptFields(obj, ['text', 'number', 'bool', 'obj'] as any);

      expect(encrypted.text).not.toBe(obj.text);
      expect(encrypted.number).toBe(obj.number); // Not encrypted
      expect(encrypted.bool).toBe(obj.bool); // Not encrypted
      expect(encrypted.obj).toBe(obj.obj); // Not encrypted
    });
  });

  describe('generateEncryptionKey()', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('isEncryptionConfigured()', () => {
    it('should return true when key is configured', () => {
      process.env.EMAIL_ENCRYPTION_KEY = generateEncryptionKey();
      expect(isEncryptionConfigured()).toBe(true);
    });

    it('should return false when key is not configured', () => {
      delete process.env.EMAIL_ENCRYPTION_KEY;
      expect(isEncryptionConfigured()).toBe(false);
    });

    it('should return false when key is invalid length', () => {
      process.env.EMAIL_ENCRYPTION_KEY = 'tooshort';
      expect(isEncryptionConfigured()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when encrypting without key', () => {
      const originalKey = process.env.EMAIL_ENCRYPTION_KEY;
      delete process.env.EMAIL_ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('EMAIL_ENCRYPTION_KEY not configured');

      // Restore key for other tests
      process.env.EMAIL_ENCRYPTION_KEY = originalKey;
    });

    it('should throw error for invalid key length', () => {
      const originalKey = process.env.EMAIL_ENCRYPTION_KEY;
      process.env.EMAIL_ENCRYPTION_KEY = 'invalid_key';

      expect(() => encrypt('test')).toThrow('must be 32 bytes');

      // Restore key for other tests
      process.env.EMAIL_ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Security Properties', () => {
    it('should not leak plaintext in error messages', () => {
      const plaintext = 'SECRET_PASSWORD_12345';

      try {
        delete process.env.EMAIL_ENCRYPTION_KEY;
        encrypt(plaintext);
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain(plaintext);
      }
    });

    it('should produce ciphertext longer than plaintext (includes IV + tag)', () => {
      const plaintext = 'Short';
      const encrypted = encrypt(plaintext);

      // Base64 encoded (IV=12 + tag=16 + ciphertext) should be longer
      expect(encrypted!.length).toBeGreaterThan(plaintext.length);
    });

    it('should use GCM authenticated encryption (tampering detection)', () => {
      const plaintext = 'Original message';
      const encrypted = encrypt(plaintext)!;

      // Tamper with the ciphertext (change last character)
      const tampered = encrypted.slice(0, -1) + (encrypted.slice(-1) === 'A' ? 'B' : 'A');

      // Decryption should fail (return null) for tampered data
      const decrypted = decrypt(tampered);
      expect(decrypted).toBe(null);
    });
  });

  describe('Performance', () => {
    it('should encrypt quickly (< 5ms for typical email)', () => {
      const plaintext = '<html><body><p>Typical email body with some content</p></body></html>'.repeat(10);

      const start = performance.now();
      encrypt(plaintext);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('should decrypt quickly (< 3ms for typical email)', () => {
      const plaintext = '<html><body><p>Typical email body</p></body></html>'.repeat(10);
      const encrypted = encrypt(plaintext)!;

      const start = performance.now();
      decrypt(encrypted);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3);
    });
  });
});
