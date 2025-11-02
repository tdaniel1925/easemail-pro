/**
 * Password Utility Functions
 * - Generate secure temporary passwords
 * - Validate passwords against common password lists
 * - Encrypt/decrypt temporary passwords for storage
 */

import bcrypt from 'bcryptjs';

// List of common passwords to prevent (top 100 most common passwords)
const COMMON_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111',
  '1234567', 'dragon', '123123', 'baseball', 'iloveyou', 'trustno1', '1234567890',
  'sunshine', 'master', '123321', '666666', 'photoshop', '111111', '1qaz2wsx',
  'qwertyuiop', 'ashley', '000000', 'mustang', '654321', '123qwe', 'football',
  'michael', 'login', 'bailey', 'shadow', 'superman', 'ninja', 'password1', 'welcome',
  'admin', 'abc123', 'monkey', 'letmein', '696969', 'whatever', 'princess', 'qazwsx',
  'charlie', 'aa123456', 'donald', 'starwars', 'solo', 'passw0rd', 'zaq1zaq1',
  'jessica', 'freedom', 'password123', 'mynoob', 'password2', 'flower', 'lovely',
  'ranger', 'cookie', 'robert', 'hello123', 'purple', 'soccer', 'matrix', 'azerty',
  'cheese', 'jordan23', 'jennifer', 'hannah', 'fuckyou', 'pepper', 'buster',
  'tigger', 'thomas', 'batman', 'killer', 'summer', 'computer', 'secret', 'hunter',
  'fuckoff', 'harley', 'george', 'andrew', 'arsenal', 'gaming', 'gaming123',
  'blink182', 'yellow', 'password!', 'winner', 'qwerty123', 'alexander', 'joshua',
  'daniel', 'internet', 'london', 'michelle', '123456a', 'elizabeth',
]);

/**
 * Generate a secure random password
 * @param length - Length of password (default 16)
 * @returns Secure random password with mixed case, numbers, and special chars
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each character type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  return password;
}

/**
 * Check if a password is commonly used
 * @param password - Password to check
 * @returns True if password is common (should be rejected)
 */
export function isCommonPassword(password: string): boolean {
  const normalized = password.toLowerCase().trim();
  return COMMON_PASSWORDS.has(normalized);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid flag and error messages
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for special character
  if (!/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check if password is common
  if (isCommonPassword(password)) {
    errors.push('This password is too common. Please choose a more unique password');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hash a temporary password for storage
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate password expiry date (7 days from now)
 * @returns Date object 7 days in the future
 */
export function generatePasswordExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}

/**
 * Check if a temporary password has expired
 * @param expiresAt - Expiry date
 * @returns True if password has expired
 */
export function isPasswordExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

