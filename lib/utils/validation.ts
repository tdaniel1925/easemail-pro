/**
 * Input Validation Utilities
 * Comprehensive validation helpers for API inputs
 */

import { z } from 'zod';

/**
 * Sanitize string input
 * Removes null bytes, trims whitespace, and limits length
 */
export function sanitizeString(input: any, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes (security)
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string): { valid: boolean; email?: string; error?: string } {
  const sanitized = sanitizeString(email, 255);

  // Basic format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' };
  }

  const [localPart, domain] = sanitized.split('@');

  // Check for consecutive dots
  if (localPart.includes('..') || domain.includes('..')) {
    return { valid: false, error: 'Email cannot contain consecutive dots' };
  }

  // Check for leading/trailing dots
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, error: 'Email local part cannot start or end with a dot' };
  }

  // Check domain length
  const domainParts = domain.split('.');
  if (domainParts[0].length < 2) {
    return { valid: false, error: 'Domain name must be at least 2 characters' };
  }

  return { valid: true, email: sanitized };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate and sanitize pagination parameters
 */
export function validatePagination(params: {
  page?: any;
  limit?: any;
  offset?: any;
}): { page: number; limit: number; offset: number } {
  const maxLimit = 100;
  const defaultLimit = 20;

  let page = parseInt(params.page) || 1;
  let limit = parseInt(params.limit) || defaultLimit;
  let offset = parseInt(params.offset) || 0;

  // Ensure positive values
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(limit, maxLimit));
  offset = Math.max(0, offset);

  return { page, limit, offset };
}

/**
 * Validate date string
 */
export function validateDate(dateString: string): { valid: boolean; date?: Date; error?: string } {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    // Check if date is reasonable (not too far in past or future)
    const minDate = new Date('1970-01-01');
    const maxDate = new Date('2100-01-01');

    if (date < minDate || date > maxDate) {
      return { valid: false, error: 'Date out of reasonable range' };
    }

    return { valid: true, date };
  } catch (error) {
    return { valid: false, error: 'Invalid date' };
  }
}

/**
 * Sanitize HTML input (basic XSS prevention)
 */
export function sanitizeHTML(html: string): string {
  const sanitized = sanitizeString(html);

  // Remove script tags
  let clean = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  clean = clean.replace(/javascript:/gi, '');

  return clean;
}

/**
 * Validate object against Zod schema with detailed errors
 */
export function validateWithSchema<T>(
  data: any,
  schema: z.ZodSchema<T>
): { valid: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map(issue => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });

  return { valid: false, errors };
}

/**
 * Validate file upload
 */
export function validateFile(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  const maxSize = 25 * 1024 * 1024; // 25MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 25MB limit' };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check filename
  const sanitizedName = sanitizeString(file.name, 255);
  if (sanitizedName.length === 0) {
    return { valid: false, error: 'Invalid filename' };
  }

  // Check for path traversal attempts
  if (sanitizedName.includes('..') || sanitizedName.includes('/') || sanitizedName.includes('\\')) {
    return { valid: false, error: 'Invalid filename characters' };
  }

  return { valid: true };
}

/**
 * Rate limiting validator
 * Returns true if request should be allowed, false if rate limited
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired records
  if (record && record.resetAt < now) {
    rateLimitStore.delete(key);
  }

  // Get or create record
  const currentRecord = rateLimitStore.get(key) || {
    count: 0,
    resetAt: now + windowMs,
  };

  // Check if limit exceeded
  if (currentRecord.count >= maxRequests) {
    const retryAfter = Math.ceil((currentRecord.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  currentRecord.count++;
  rateLimitStore.set(key, currentRecord);

  return { allowed: true };
}
