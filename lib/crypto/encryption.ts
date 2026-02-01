/**
 * Email Encryption at Rest
 * AES-256-GCM encryption for sensitive email data
 *
 * Security: Encrypts email bodies, subjects, and attachment content
 * before storing in database to protect against data breaches.
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Encryption algorithm (AES-256-GCM - Authenticated Encryption)
const ALGORITHM = 'aes-256-gcm';

// IV length for GCM mode (12 bytes recommended)
const IV_LENGTH = 12;

// Auth tag length for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * CRITICAL: This must be a 32-byte (256-bit) key stored securely
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.EMAIL_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'EMAIL_ENCRYPTION_KEY not configured. Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validate key length (must be 32 bytes = 64 hex characters)
  if (keyHex.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt data using AES-256-GCM
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) {
    return null;
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: IV + authTag + ciphertext
    const encrypted = Buffer.concat([iv, authTag, ciphertext]);

    // Return as base64
    return encrypted.toString('base64');
  } catch (error) {
    logger.error('Encryption failed', error, {
      component: 'Encryption',
    });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data encrypted with encrypt()
 * Input: base64(iv + authTag + ciphertext)
 */
export function decrypt(encryptedData: string | null | undefined): string | null {
  if (!encryptedData) {
    return null;
  }

  try {
    const key = getEncryptionKey();

    // Decode from base64
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract components
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  } catch (error) {
    logger.error('Decryption failed', error, {
      component: 'Encryption',
    });
    // Return null instead of throwing to handle corrupted data gracefully
    return null;
  }
}

/**
 * Encrypt email body (HTML and text)
 */
export function encryptEmailBody(body: {
  html?: string | null;
  text?: string | null;
}): {
  html: string | null;
  text: string | null;
} {
  return {
    html: encrypt(body.html),
    text: encrypt(body.text),
  };
}

/**
 * Decrypt email body (HTML and text)
 */
export function decryptEmailBody(encryptedBody: {
  html?: string | null;
  text?: string | null;
}): {
  html: string | null;
  text: string | null;
} {
  return {
    html: decrypt(encryptedBody.html),
    text: decrypt(encryptedBody.text),
  };
}

/**
 * Generate a new encryption key
 * This should be run ONCE during setup and stored securely in environment variables
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Encrypt sensitive fields in an object
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const encrypted = { ...obj };

  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field] as string) as any;
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in an object
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const decrypted = { ...obj };

  for (const field of fields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decrypt(decrypted[field] as string) as any;
    }
  }

  return decrypted;
}
