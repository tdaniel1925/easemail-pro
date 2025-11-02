/**
 * Text sanitization utilities for database storage
 * 
 * PostgreSQL does not allow null bytes (\0 or 0x00) in TEXT/VARCHAR fields.
 * Email content from providers can contain null bytes from:
 * - Corrupted MIME encoding
 * - Binary data embedded in text fields
 * - Character encoding issues
 * - Malformed email headers
 */

/**
 * Removes null bytes from text that would cause PostgreSQL errors
 * @param text - The text to sanitize
 * @returns Sanitized text safe for PostgreSQL storage
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  // Remove null bytes (\0) which PostgreSQL doesn't allow in text fields
  return text.replace(/\0/g, '');
}

/**
 * Sanitizes email participant objects
 * @param participants - Array of email participants
 * @returns Sanitized array safe for PostgreSQL storage
 */
export function sanitizeParticipants(
  participants: Array<{ email?: string; name?: string }> | undefined
): Array<{ email: string; name?: string }> {
  if (!participants) return [];
  
  return participants.map(p => ({
    email: sanitizeText(p.email),
    name: p.name ? sanitizeText(p.name) : undefined,
  }));
}

