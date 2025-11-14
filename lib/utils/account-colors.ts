/**
 * Account Color Utilities
 * Generates consistent colors for email accounts
 */

// Predefined color palette for accounts (vibrant, accessible colors)
const ACCOUNT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

// Cache for account ID to color mapping
const accountColorCache = new Map<string, string>();

/**
 * Generate a consistent color for an account ID
 * Uses a simple hash function to map account IDs to colors deterministically
 */
export function getAccountColor(accountId: string): string {
  // Check cache first
  if (accountColorCache.has(accountId)) {
    return accountColorCache.get(accountId)!;
  }

  // Simple hash function to convert account ID to a number
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = ((hash << 5) - hash) + accountId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get index
  const colorIndex = Math.abs(hash) % ACCOUNT_COLORS.length;
  const color = ACCOUNT_COLORS[colorIndex];

  // Cache the result
  accountColorCache.set(accountId, color);

  return color;
}

/**
 * Get background color (lighter version) for an account
 * Useful for card backgrounds
 */
export function getAccountBackgroundColor(accountId: string, opacity: number = 0.1): string {
  const color = getAccountColor(accountId);
  // Convert hex to RGB and add opacity
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Clear the color cache (useful for testing)
 */
export function clearAccountColorCache(): void {
  accountColorCache.clear();
}
