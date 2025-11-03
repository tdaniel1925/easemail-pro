/**
 * Tax Calculation Utilities
 * 
 * Calculates sales tax based on user/organization location
 * Supports US states, Canadian provinces, and international VAT
 */

interface TaxLocation {
  country: string;
  state?: string;
  province?: string;
  zipCode?: string;
}

interface TaxRate {
  rate: number; // Decimal (e.g., 0.08 for 8%)
  name: string;
  jurisdiction: string;
}

// US State Sales Tax Rates (as of 2024)
const US_STATE_TAX_RATES: Record<string, number> = {
  'AL': 0.04,   // Alabama
  'AK': 0.00,   // Alaska (no state sales tax)
  'AZ': 0.056,  // Arizona
  'AR': 0.065,  // Arkansas
  'CA': 0.0725, // California
  'CO': 0.029,  // Colorado
  'CT': 0.0635, // Connecticut
  'DE': 0.00,   // Delaware (no sales tax)
  'FL': 0.06,   // Florida
  'GA': 0.04,   // Georgia
  'HI': 0.04,   // Hawaii
  'ID': 0.06,   // Idaho
  'IL': 0.0625, // Illinois
  'IN': 0.07,   // Indiana
  'IA': 0.06,   // Iowa
  'KS': 0.065,  // Kansas
  'KY': 0.06,   // Kentucky
  'LA': 0.0445, // Louisiana
  'ME': 0.055,  // Maine
  'MD': 0.06,   // Maryland
  'MA': 0.0625, // Massachusetts
  'MI': 0.06,   // Michigan
  'MN': 0.06875, // Minnesota
  'MS': 0.07,   // Mississippi
  'MO': 0.04225, // Missouri
  'MT': 0.00,   // Montana (no sales tax)
  'NE': 0.055,  // Nebraska
  'NV': 0.0685, // Nevada
  'NH': 0.00,   // New Hampshire (no sales tax)
  'NJ': 0.06625, // New Jersey
  'NM': 0.05125, // New Mexico
  'NY': 0.04,   // New York
  'NC': 0.0475, // North Carolina
  'ND': 0.05,   // North Dakota
  'OH': 0.0575, // Ohio
  'OK': 0.045,  // Oklahoma
  'OR': 0.00,   // Oregon (no sales tax)
  'PA': 0.06,   // Pennsylvania
  'RI': 0.07,   // Rhode Island
  'SC': 0.06,   // South Carolina
  'SD': 0.045,  // South Dakota
  'TN': 0.07,   // Tennessee
  'TX': 0.0625, // Texas
  'UT': 0.0485, // Utah
  'VT': 0.06,   // Vermont
  'VA': 0.053,  // Virginia
  'WA': 0.065,  // Washington
  'WV': 0.06,   // West Virginia
  'WI': 0.05,   // Wisconsin
  'WY': 0.04,   // Wyoming
  'DC': 0.06,   // District of Columbia
};

// Canadian Province Tax Rates (GST/HST/PST)
const CANADA_PROVINCE_TAX_RATES: Record<string, number> = {
  'AB': 0.05,   // Alberta (GST only)
  'BC': 0.12,   // British Columbia (GST + PST)
  'MB': 0.12,   // Manitoba (GST + PST)
  'NB': 0.15,   // New Brunswick (HST)
  'NL': 0.15,   // Newfoundland and Labrador (HST)
  'NT': 0.05,   // Northwest Territories (GST only)
  'NS': 0.15,   // Nova Scotia (HST)
  'NU': 0.05,   // Nunavut (GST only)
  'ON': 0.13,   // Ontario (HST)
  'PE': 0.15,   // Prince Edward Island (HST)
  'QC': 0.14975, // Quebec (GST + QST)
  'SK': 0.11,   // Saskatchewan (GST + PST)
  'YT': 0.05,   // Yukon (GST only)
};

// EU VAT Rates (standard rates)
const EU_VAT_RATES: Record<string, number> = {
  'AT': 0.20,   // Austria
  'BE': 0.21,   // Belgium
  'BG': 0.20,   // Bulgaria
  'HR': 0.25,   // Croatia
  'CY': 0.19,   // Cyprus
  'CZ': 0.21,   // Czech Republic
  'DK': 0.25,   // Denmark
  'EE': 0.20,   // Estonia
  'FI': 0.24,   // Finland
  'FR': 0.20,   // France
  'DE': 0.19,   // Germany
  'GR': 0.24,   // Greece
  'HU': 0.27,   // Hungary
  'IE': 0.23,   // Ireland
  'IT': 0.22,   // Italy
  'LV': 0.21,   // Latvia
  'LT': 0.21,   // Lithuania
  'LU': 0.17,   // Luxembourg
  'MT': 0.18,   // Malta
  'NL': 0.21,   // Netherlands
  'PL': 0.23,   // Poland
  'PT': 0.23,   // Portugal
  'RO': 0.19,   // Romania
  'SK': 0.20,   // Slovakia
  'SI': 0.22,   // Slovenia
  'ES': 0.21,   // Spain
  'SE': 0.25,   // Sweden
  'GB': 0.20,   // United Kingdom
};

/**
 * Calculate tax rate based on location
 */
export function calculateTaxRate(location: TaxLocation): TaxRate {
  const country = location.country.toUpperCase();
  
  // United States
  if (country === 'US' || country === 'USA') {
    const state = location.state?.toUpperCase();
    if (state && US_STATE_TAX_RATES[state] !== undefined) {
      return {
        rate: US_STATE_TAX_RATES[state],
        name: `${state} Sales Tax`,
        jurisdiction: `${state}, United States`,
      };
    }
    return {
      rate: 0,
      name: 'No Tax',
      jurisdiction: 'United States',
    };
  }
  
  // Canada
  if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
    const province = location.province?.toUpperCase();
    if (province && CANADA_PROVINCE_TAX_RATES[province] !== undefined) {
      return {
        rate: CANADA_PROVINCE_TAX_RATES[province],
        name: `${province} Tax (GST/HST/PST)`,
        jurisdiction: `${province}, Canada`,
      };
    }
    return {
      rate: 0.05, // Default to GST
      name: 'GST',
      jurisdiction: 'Canada',
    };
  }
  
  // European Union
  if (EU_VAT_RATES[country] !== undefined) {
    return {
      rate: EU_VAT_RATES[country],
      name: 'VAT',
      jurisdiction: country,
    };
  }
  
  // Default: No tax for other countries
  return {
    rate: 0,
    name: 'No Tax',
    jurisdiction: country,
  };
}

/**
 * Calculate tax amount
 */
export function calculateTaxAmount(subtotal: number, location: TaxLocation): {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  taxInfo: TaxRate;
} {
  const taxInfo = calculateTaxRate(location);
  const taxAmount = subtotal * taxInfo.rate;
  const total = subtotal + taxAmount;
  
  return {
    subtotal,
    taxRate: taxInfo.rate,
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    taxInfo,
  };
}

/**
 * Get tax rate for user from database
 */
export async function getTaxRateForUser(userId: string): Promise<TaxRate> {
  // This would fetch user's billing address from database
  // For now, return a default implementation
  
  // TODO: Implement database lookup for user's billing address
  // const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  // const billingAddress = user?.billingAddress;
  
  // Default to no tax if location unknown
  return {
    rate: 0,
    name: 'No Tax',
    jurisdiction: 'Unknown',
  };
}

/**
 * Check if digital services are taxable in location
 */
export function isDigitalServiceTaxable(location: TaxLocation): boolean {
  const country = location.country.toUpperCase();
  
  // US: Most states tax SaaS/digital services
  if (country === 'US' || country === 'USA') {
    const state = location.state?.toUpperCase();
    // States that don't tax digital services
    const exemptStates = ['AK', 'DE', 'MT', 'NH', 'OR'];
    return state ? !exemptStates.includes(state) : false;
  }
  
  // Canada: Digital services are taxable
  if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
    return true;
  }
  
  // EU: Digital services are taxable (VAT applies)
  if (EU_VAT_RATES[country] !== undefined) {
    return true;
  }
  
  // Default: Assume taxable unless proven otherwise
  return false;
}

/**
 * Format tax rate as percentage string
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Get tax-inclusive price
 */
export function getTaxInclusivePrice(price: number, taxRate: number): number {
  return parseFloat((price * (1 + taxRate)).toFixed(2));
}

/**
 * Extract tax from tax-inclusive price
 */
export function extractTaxFromInclusivePrice(inclusivePrice: number, taxRate: number): {
  subtotal: number;
  tax: number;
} {
  const subtotal = inclusivePrice / (1 + taxRate);
  const tax = inclusivePrice - subtotal;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
  };
}

