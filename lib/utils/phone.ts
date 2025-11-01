/**
 * Phone number formatting and validation utilities
 * Handles international numbers and formats for display/Twilio
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

export interface PhoneParseResult {
  isValid: boolean;
  e164: string | null;
  display: string | null;
  country: string | null;
  type: string | null;
  error?: string;
}

/**
 * Parse and validate international phone numbers
 * Supports 200+ countries with proper validation
 */
export function parseInternationalPhone(
  input: string,
  defaultCountry: CountryCode = 'US'
): PhoneParseResult {
  try {
    if (!input) {
      return {
        isValid: false,
        e164: null,
        display: null,
        country: null,
        type: null,
        error: 'Phone number is required',
      };
    }

    // Parse with libphonenumber-js
    const phoneNumber = parsePhoneNumber(input, defaultCountry);

    if (!phoneNumber) {
      return {
        isValid: false,
        e164: null,
        display: null,
        country: null,
        type: null,
        error: 'Invalid phone number format',
      };
    }

    // Validate
    if (!phoneNumber.isValid()) {
      return {
        isValid: false,
        e164: phoneNumber.number,
        display: phoneNumber.formatInternational(),
        country: phoneNumber.country,
        type: phoneNumber.getType(),
        error: 'Phone number is not valid',
      };
    }

    // Check if mobile (SMS requires mobile or fixed-line-or-mobile)
    const type = phoneNumber.getType();
    if (type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
      return {
        isValid: false,
        e164: phoneNumber.number,
        display: phoneNumber.formatInternational(),
        country: phoneNumber.country,
        type,
        error: 'Phone number must be mobile for SMS',
      };
    }

    return {
      isValid: true,
      e164: phoneNumber.number,
      display: phoneNumber.formatInternational(),
      country: phoneNumber.country,
      type,
    };
  } catch (error: any) {
    return {
      isValid: false,
      e164: null,
      display: null,
      country: null,
      type: null,
      error: error.message || 'Failed to parse phone number',
    };
  }
}

/**
 * Format phone number for Twilio (E.164 format)
 * Examples: +15551234567, +447700900123
 */
export function formatPhoneForTwilio(phone: string, defaultCountry: CountryCode = 'US'): string {
  if (!phone) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);
    return phoneNumber?.number || phone;
  } catch {
    // Fallback: clean and add +1 if needed
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    return `+${digitsOnly}`;
  }
}

/**
 * Format phone number for display (US: 1-555-123-4567)
 */
export function formatPhoneForDisplay(phone: string, defaultCountry: CountryCode = 'US'): string {
  if (!phone) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);
    if (phoneNumber) {
      // Use national format for local, international for foreign
      if (phoneNumber.country === defaultCountry) {
        const national = phoneNumber.formatNational();
        // Convert (555) 123-4567 to 1-555-123-4567
        const digitsOnly = national.replace(/\D/g, '');
        if (digitsOnly.length === 10) {
          return `1-${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
        }
        return national;
      }
      return phoneNumber.formatInternational();
    }
  } catch (error) {
    console.error('Phone format error:', error);
  }
  return phone;
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string, country?: CountryCode): boolean {
  try {
    return isValidPhoneNumber(phone, country);
  } catch {
    return false;
  }
}

/**
 * Get country from phone number
 */
export function getPhoneCountry(phone: string): string | null {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed?.country || null;
  } catch {
    return null;
  }
}

/**
 * Check if SMS is supported in country
 * Some countries have restrictions or sanctions
 */
export function isSMSSupportedCountry(countryCode: string): boolean {
  // Restricted/sanctioned countries
  const restricted = ['CU', 'IR', 'KP', 'SY', 'SD'];
  return !restricted.includes(countryCode.toUpperCase());
}

/**
 * Format as user types (auto-format input)
 */
export function autoFormatPhone(input: string, country: CountryCode = 'US'): string {
  try {
    const phoneNumber = parsePhoneNumber(input, country);
    if (phoneNumber && phoneNumber.isValid()) {
      return formatPhoneForDisplay(phoneNumber.number, country);
    }
  } catch {
    // Return as-is if can't parse
  }
  return input;
}

