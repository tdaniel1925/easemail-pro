/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'usd')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a price per unit
 * @param amount - The amount to format
 * @param unit - The unit (e.g., 'month', 'year', 'seat')
 * @param currency - The currency code (default: 'usd')
 * @returns Formatted price with unit
 */
export function formatPricePerUnit(
  amount: number,
  unit: string,
  currency: string = 'usd'
): string {
  const formattedAmount = formatCurrency(amount, currency);
  return `${formattedAmount}/${unit}`;
}

/**
 * Parse a currency string to a number
 * @param currencyString - The currency string to parse (e.g., '$45.00')
 * @returns The numeric value
 */
export function parseCurrency(currencyString: string): number {
  return parseFloat(currencyString.replace(/[^0-9.-]+/g, ''));
}
