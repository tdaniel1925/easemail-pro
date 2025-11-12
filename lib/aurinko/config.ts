/**
 * Aurinko Configuration
 * Alternative email provider integration for fallback when Nylas fails
 */

export const aurinkoConfig = {
  // Aurinko uses the Client ID as the API key in some cases
  apiKey: process.env.AURINKO_API_KEY || process.env.AURINKO_CLIENT_ID,
  apiUri: process.env.AURINKO_API_URI || 'https://api.aurinko.io/v1',
  clientId: process.env.AURINKO_CLIENT_ID,
  clientSecret: process.env.AURINKO_CLIENT_SECRET,
};

/**
 * Check if Aurinko is configured
 */
export function isAurinkoEnabled(): boolean {
  return !!(aurinkoConfig.apiKey && aurinkoConfig.clientId);
}

/**
 * Get Aurinko API headers
 */
export function getAurinkoHeaders(accountId: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${aurinkoConfig.apiKey}`,
    'Content-Type': 'application/json',
    'X-Account-Id': accountId, // Aurinko uses account ID in header
  };
}
