/**
 * SMS Pricing by Country
 * Based on Twilio's pricing as of 2026
 * Prices in USD per SMS segment
 */

export interface SMSPricing {
  country: string;
  countryCode: string;
  costPerSegment: number; // What we pay Twilio
  pricePerSegment: number; // What we charge the customer (with markup)
}

// Twilio pricing + 3x markup for sustainability
const SMS_PRICING_TABLE: Record<string, SMSPricing> = {
  // North America (cheapest)
  'US': { country: 'United States', countryCode: 'US', costPerSegment: 0.0079, pricePerSegment: 0.025 },
  'CA': { country: 'Canada', countryCode: 'CA', costPerSegment: 0.0075, pricePerSegment: 0.025 },

  // Europe (mid-range)
  'GB': { country: 'United Kingdom', countryCode: 'GB', costPerSegment: 0.0072, pricePerSegment: 0.025 },
  'DE': { country: 'Germany', countryCode: 'DE', costPerSegment: 0.075, pricePerSegment: 0.22 },
  'FR': { country: 'France', countryCode: 'FR', costPerSegment: 0.072, pricePerSegment: 0.22 },
  'IT': { country: 'Italy', countryCode: 'IT', costPerSegment: 0.065, pricePerSegment: 0.19 },
  'ES': { country: 'Spain', countryCode: 'ES', costPerSegment: 0.063, pricePerSegment: 0.19 },
  'NL': { country: 'Netherlands', countryCode: 'NL', costPerSegment: 0.10, pricePerSegment: 0.30 },
  'SE': { country: 'Sweden', countryCode: 'SE', costPerSegment: 0.051, pricePerSegment: 0.15 },
  'NO': { country: 'Norway', countryCode: 'NO', costPerSegment: 0.055, pricePerSegment: 0.16 },
  'DK': { country: 'Denmark', countryCode: 'DK', costPerSegment: 0.047, pricePerSegment: 0.14 },
  'FI': { country: 'Finland', countryCode: 'FI', costPerSegment: 0.073, pricePerSegment: 0.22 },
  'PL': { country: 'Poland', countryCode: 'PL', costPerSegment: 0.033, pricePerSegment: 0.10 },
  'IE': { country: 'Ireland', countryCode: 'IE', costPerSegment: 0.055, pricePerSegment: 0.16 },
  'PT': { country: 'Portugal', countryCode: 'PT', costPerSegment: 0.047, pricePerSegment: 0.14 },
  'GR': { country: 'Greece', countryCode: 'GR', costPerSegment: 0.056, pricePerSegment: 0.17 },
  'CH': { country: 'Switzerland', countryCode: 'CH', costPerSegment: 0.055, pricePerSegment: 0.16 },
  'AT': { country: 'Austria', countryCode: 'AT', costPerSegment: 0.095, pricePerSegment: 0.28 },
  'BE': { country: 'Belgium', countryCode: 'BE', costPerSegment: 0.075, pricePerSegment: 0.22 },

  // Asia Pacific (expensive)
  'AU': { country: 'Australia', countryCode: 'AU', costPerSegment: 0.056, pricePerSegment: 0.17 },
  'NZ': { country: 'New Zealand', countryCode: 'NZ', costPerSegment: 0.11, pricePerSegment: 0.33 },
  'JP': { country: 'Japan', countryCode: 'JP', costPerSegment: 0.075, pricePerSegment: 0.22 },
  'SG': { country: 'Singapore', countryCode: 'SG', costPerSegment: 0.048, pricePerSegment: 0.14 },
  'HK': { country: 'Hong Kong', countryCode: 'HK', costPerSegment: 0.062, pricePerSegment: 0.19 },
  'IN': { country: 'India', countryCode: 'IN', costPerSegment: 0.0059, pricePerSegment: 0.02 },
  'CN': { country: 'China', countryCode: 'CN', costPerSegment: 0.045, pricePerSegment: 0.13 },
  'KR': { country: 'South Korea', countryCode: 'KR', costPerSegment: 0.028, pricePerSegment: 0.08 },
  'TH': { country: 'Thailand', countryCode: 'TH', costPerSegment: 0.012, pricePerSegment: 0.04 },
  'MY': { country: 'Malaysia', countryCode: 'MY', costPerSegment: 0.037, pricePerSegment: 0.11 },
  'ID': { country: 'Indonesia', countryCode: 'ID', costPerSegment: 0.50, pricePerSegment: 1.50 },
  'PH': { country: 'Philippines', countryCode: 'PH', costPerSegment: 0.028, pricePerSegment: 0.08 },
  'VN': { country: 'Vietnam', countryCode: 'VN', costPerSegment: 0.074, pricePerSegment: 0.22 },

  // Middle East (very expensive)
  'AE': { country: 'United Arab Emirates', countryCode: 'AE', costPerSegment: 0.035, pricePerSegment: 0.10 },
  'SA': { country: 'Saudi Arabia', countryCode: 'SA', costPerSegment: 0.052, pricePerSegment: 0.15 },
  'IL': { country: 'Israel', countryCode: 'IL', costPerSegment: 0.28, pricePerSegment: 0.84 },
  'TR': { country: 'Turkey', countryCode: 'TR', costPerSegment: 0.014, pricePerSegment: 0.04 },

  // Latin America (mid-range)
  'BR': { country: 'Brazil', countryCode: 'BR', costPerSegment: 0.018, pricePerSegment: 0.05 },
  'MX': { country: 'Mexico', countryCode: 'MX', costPerSegment: 0.011, pricePerSegment: 0.03 },
  'AR': { country: 'Argentina', countryCode: 'AR', costPerSegment: 0.044, pricePerSegment: 0.13 },
  'CL': { country: 'Chile', countryCode: 'CL', costPerSegment: 0.065, pricePerSegment: 0.19 },
  'CO': { country: 'Colombia', countryCode: 'CO', costPerSegment: 0.0075, pricePerSegment: 0.02 },
  'PE': { country: 'Peru', countryCode: 'PE', costPerSegment: 0.044, pricePerSegment: 0.13 },

  // Africa (expensive)
  'ZA': { country: 'South Africa', countryCode: 'ZA', costPerSegment: 0.032, pricePerSegment: 0.10 },
  'NG': { country: 'Nigeria', countryCode: 'NG', costPerSegment: 0.084, pricePerSegment: 0.25 },
  'KE': { country: 'Kenya', countryCode: 'KE', costPerSegment: 0.085, pricePerSegment: 0.25 },
  'EG': { country: 'Egypt', countryCode: 'EG', costPerSegment: 0.11, pricePerSegment: 0.33 },
};

// Default pricing for unsupported/unknown countries (high to avoid losses)
const DEFAULT_PRICING: SMSPricing = {
  country: 'Unknown',
  countryCode: 'XX',
  costPerSegment: 0.10,
  pricePerSegment: 0.30,
};

/**
 * Get SMS pricing for a specific country
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
 * @returns Pricing information for that country
 */
export function getSMSPricing(countryCode: string | null | undefined): SMSPricing {
  if (!countryCode) {
    return DEFAULT_PRICING;
  }

  const pricing = SMS_PRICING_TABLE[countryCode.toUpperCase()];
  if (!pricing) {
    console.warn(`No SMS pricing found for country: ${countryCode}, using default`);
    return DEFAULT_PRICING;
  }

  return pricing;
}

/**
 * Calculate total SMS cost and price for a message
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param segments - Number of SMS segments (from character counter)
 * @returns Cost (what we pay) and price (what we charge)
 */
export function calculateSMSCostAndPrice(countryCode: string | null | undefined, segments: number): {
  cost: number;
  price: number;
  countryName: string;
  pricePerSegment: number;
} {
  const pricing = getSMSPricing(countryCode);

  return {
    cost: pricing.costPerSegment * segments,
    price: pricing.pricePerSegment * segments,
    countryName: pricing.country,
    pricePerSegment: pricing.pricePerSegment,
  };
}

/**
 * Get all supported countries with pricing
 * @returns List of all countries we support SMS for
 */
export function getAllSMSPricingCountries(): SMSPricing[] {
  return Object.values(SMS_PRICING_TABLE);
}

/**
 * Check if country has special pricing considerations
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Warning message if country is expensive, null otherwise
 */
export function getSMSPricingWarning(countryCode: string | null | undefined): string | null {
  const pricing = getSMSPricing(countryCode);

  if (pricing.pricePerSegment >= 0.50) {
    return `⚠️ SMS to ${pricing.country} is expensive ($${pricing.pricePerSegment}/segment). Consider email instead.`;
  }

  if (pricing.pricePerSegment >= 0.20) {
    return `Note: SMS to ${pricing.country} costs $${pricing.pricePerSegment} per message segment.`;
  }

  return null;
}
