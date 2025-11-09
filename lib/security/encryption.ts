/**
 * Email Content Encryption
 * AES-256-GCM encryption for sensitive email data at rest
 *
 * CRITICAL: Set ENCRYPTION_KEY environment variable (32 characters minimum)
 */

import * as crypto from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization vector length
const AUTH_TAG_LENGTH = 16; // Authentication tag length
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * In production, use AWS KMS or similar key management service
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  if (key.length < KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be at least ${KEY_LENGTH} characters`);
  }

  // Derive a consistent 32-byte key from the environment variable
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive text data
 * Returns base64-encoded encrypted data with IV and auth tag
 *
 * Format: iv:authTag:encryptedData (all base64)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted data
 * Accepts format: iv:authTag:encryptedData (all base64)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encrypted] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt email body (HTML and text)
 */
export function encryptEmailBody(bodyHtml?: string, bodyText?: string): {
  bodyHtml?: string;
  bodyText?: string;
} {
  return {
    bodyHtml: bodyHtml ? encrypt(bodyHtml) : undefined,
    bodyText: bodyText ? encrypt(bodyText) : undefined,
  };
}

/**
 * Decrypt email body (HTML and text)
 */
export function decryptEmailBody(encryptedBodyHtml?: string, encryptedBodyText?: string): {
  bodyHtml?: string;
  bodyText?: string;
} {
  return {
    bodyHtml: encryptedBodyHtml ? decrypt(encryptedBodyHtml) : undefined,
    bodyText: encryptedBodyText ? decrypt(encryptedBodyText) : undefined,
  };
}

/**
 * Encrypt OAuth tokens
 */
export function encryptToken(token: string): string {
  return encrypt(token);
}

/**
 * Decrypt OAuth tokens
 */
export function decryptToken(encryptedToken: string): string {
  return decrypt(encryptedToken);
}

/**
 * Generate a random encryption key
 * Use this to generate ENCRYPTION_KEY for .env.local
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    const key = process.env.ENCRYPTION_KEY;
    return !!(key && key.length >= KEY_LENGTH);
  } catch {
    return false;
  }
}

// Export utility for generating new keys (development only)
if (require.main === module) {
  console.log('Generated encryption key:');
  console.log(generateEncryptionKey());
  console.log('\nAdd this to your .env.local:');
  console.log(`ENCRYPTION_KEY=${generateEncryptionKey()}`);
}
