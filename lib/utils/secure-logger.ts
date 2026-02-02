/**
 * Secure Logger Utility
 * Prevents sensitive data from being logged in production
 */

/**
 * Masks sensitive data for logging
 * @param value - The value to mask
 * @param showChars - Number of characters to show at start/end (default: 4)
 */
export function maskSensitive(value: string | null | undefined, showChars: number = 4): string {
  if (!value) return '[empty]';

  const str = String(value);

  if (str.length <= showChars * 2) {
    return '***';
  }

  const start = str.substring(0, showChars);
  const end = str.substring(str.length - showChars);

  return `${start}...${end}`;
}

/**
 * Hash a user ID for logging (non-reversible)
 */
export function hashUserId(userId: string): string {
  // Simple hash for logging purposes
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return `user_${Math.abs(hash).toString(16)}`;
}

/**
 * Sanitize an email address for logging
 * Example: john.doe@example.com → j***e@e***e.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '[no email]';

  const [localPart, domain] = email.split('@');

  if (!domain) return maskSensitive(email, 2);

  const maskedLocal = localPart.length > 2
    ? `${localPart[0]}***${localPart[localPart.length - 1]}`
    : '***';

  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? `${domainParts[0][0]}***${domainParts[0][domainParts[0].length - 1]}.${domainParts[domainParts.length - 1]}`
    : domain[0] + '***';

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Secure logger that only logs sensitive data in development
 */
export const secureLog = {
  /**
   * Log in development, mask in production
   */
  dev(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data || '');
    }
  },

  /**
   * Log sensitive info (only in development)
   */
  sensitive(message: string, sensitiveData: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, sensitiveData);
    } else {
      // In production, log sanitized version
      const sanitized: Record<string, any> = {};

      for (const [key, value] of Object.entries(sensitiveData)) {
        if (typeof value === 'string') {
          if (key.toLowerCase().includes('email')) {
            sanitized[key] = maskEmail(value);
          } else if (key.toLowerCase().includes('token') ||
                     key.toLowerCase().includes('password') ||
                     key.toLowerCase().includes('secret') ||
                     key.toLowerCase().includes('cursor')) {
            sanitized[key] = maskSensitive(value, 4);
          } else if (key.toLowerCase().includes('userid') || key.toLowerCase().includes('user_id')) {
            sanitized[key] = hashUserId(value);
          } else {
            sanitized[key] = value;
          }
        } else {
          sanitized[key] = value;
        }
      }

      console.log(message, sanitized);
    }
  },

  /**
   * Always log (safe for production)
   */
  info(message: string, data?: any) {
    console.log(message, data || '');
  },

  /**
   * Always log errors (but mask sensitive data)
   */
  error(message: string, error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error(message, error);
    } else {
      // In production, log error message but not full stack
      console.error(message, {
        message: error?.message || 'Unknown error',
        code: error?.code,
      });
    }
  },
};
