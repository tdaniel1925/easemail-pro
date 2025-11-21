/**
 * Provider-Specific Sync Configuration
 * Different email providers have different rate limits
 */

export interface ProviderSyncConfig {
  delayMs: number; // Delay between requests
  maxRetries: number; // Max retries on errors
  timeoutMs: number; // Request timeout
  burstLimit?: number; // Max requests in burst window
  burstWindowMs?: number; // Burst window duration
}

const PROVIDER_CONFIGS: Record<string, ProviderSyncConfig> = {
  // Gmail (via Nylas) - moderate limits
  google: {
    delayMs: 500, // 2 requests/second = 120/min (well under 250 quota/sec limit)
    maxRetries: 5,
    timeoutMs: 30000,
    burstLimit: 100,
    burstWindowMs: 60000, // 100 per minute
  },
  gmail: {
    delayMs: 500,
    maxRetries: 5,
    timeoutMs: 30000,
    burstLimit: 100,
    burstWindowMs: 60000,
  },

  // Microsoft/Office365 - higher limits
  microsoft: {
    delayMs: 250, // 4 requests/second = 240/min (under 600/min burst limit)
    maxRetries: 5,
    timeoutMs: 30000,
    burstLimit: 200,
    burstWindowMs: 60000,
  },
  office365: {
    delayMs: 250,
    maxRetries: 5,
    timeoutMs: 30000,
    burstLimit: 200,
    burstWindowMs: 60000,
  },
  outlook: {
    delayMs: 250,
    maxRetries: 5,
    timeoutMs: 30000,
    burstLimit: 200,
    burstWindowMs: 60000,
  },

  // Yahoo - more conservative (known to be strict)
  yahoo: {
    delayMs: 800, // ~1.25 requests/second = 75/min
    maxRetries: 3,
    timeoutMs: 45000,
    burstLimit: 50,
    burstWindowMs: 60000,
  },

  // iCloud - conservative limits
  icloud: {
    delayMs: 600, // ~1.66 requests/second = 100/min
    maxRetries: 3,
    timeoutMs: 40000,
    burstLimit: 60,
    burstWindowMs: 60000,
  },

  // AOL - similar to Yahoo
  aol: {
    delayMs: 800,
    maxRetries: 3,
    timeoutMs: 45000,
    burstLimit: 50,
    burstWindowMs: 60000,
  },

  // Zoho Mail - moderate limits
  zoho: {
    delayMs: 700,
    maxRetries: 3,
    timeoutMs: 35000,
    burstLimit: 60,
    burstWindowMs: 60000,
  },

  // ProtonMail - conservative (bridge has limits)
  protonmail: {
    delayMs: 1000,
    maxRetries: 3,
    timeoutMs: 45000,
    burstLimit: 30,
    burstWindowMs: 60000,
  },
  proton: {
    delayMs: 1000,
    maxRetries: 3,
    timeoutMs: 45000,
    burstLimit: 30,
    burstWindowMs: 60000,
  },

  // Generic IMAP - very conservative (unknown server capabilities)
  imap: {
    delayMs: 1000, // 1 request/second = 60/min (safe for most servers)
    maxRetries: 3,
    timeoutMs: 45000,
    burstLimit: 30,
    burstWindowMs: 60000,
  },

  // FastMail - moderate to high limits
  fastmail: {
    delayMs: 400,
    maxRetries: 4,
    timeoutMs: 35000,
    burstLimit: 120,
    burstWindowMs: 60000,
  },

  // GMX - conservative
  gmx: {
    delayMs: 800,
    maxRetries: 3,
    timeoutMs: 40000,
    burstLimit: 50,
    burstWindowMs: 60000,
  },

  // Mail.ru - conservative
  mailru: {
    delayMs: 900,
    maxRetries: 3,
    timeoutMs: 40000,
    burstLimit: 40,
    burstWindowMs: 60000,
  },

  // Default fallback for unknown providers
  default: {
    delayMs: 1000, // Conservative 1 second delay
    maxRetries: 3,
    timeoutMs: 45000,
    burstLimit: 30,
    burstWindowMs: 60000,
  },
};

/**
 * Get sync configuration for a specific provider
 */
export function getProviderConfig(provider: string | null | undefined): ProviderSyncConfig {
  if (!provider) return PROVIDER_CONFIGS.default;

  const normalizedProvider = provider.toLowerCase().trim();

  // Check for exact match
  if (PROVIDER_CONFIGS[normalizedProvider]) {
    return PROVIDER_CONFIGS[normalizedProvider];
  }

  // Check for partial matches
  if (normalizedProvider.includes('google') || normalizedProvider.includes('gmail')) {
    return PROVIDER_CONFIGS.google;
  }
  if (normalizedProvider.includes('microsoft') || normalizedProvider.includes('outlook') || normalizedProvider.includes('office')) {
    return PROVIDER_CONFIGS.microsoft;
  }
  if (normalizedProvider.includes('yahoo')) {
    return PROVIDER_CONFIGS.yahoo;
  }
  if (normalizedProvider.includes('icloud') || normalizedProvider.includes('apple')) {
    return PROVIDER_CONFIGS.icloud;
  }
  if (normalizedProvider.includes('aol')) {
    return PROVIDER_CONFIGS.aol;
  }
  if (normalizedProvider.includes('zoho')) {
    return PROVIDER_CONFIGS.zoho;
  }
  if (normalizedProvider.includes('proton')) {
    return PROVIDER_CONFIGS.proton;
  }
  if (normalizedProvider.includes('fastmail')) {
    return PROVIDER_CONFIGS.fastmail;
  }
  if (normalizedProvider.includes('gmx')) {
    return PROVIDER_CONFIGS.gmx;
  }
  if (normalizedProvider.includes('imap')) {
    return PROVIDER_CONFIGS.imap;
  }

  // Default to IMAP config for unknown providers (conservative)
  console.log(`⚠️ Unknown provider "${provider}", using default IMAP config`);
  return PROVIDER_CONFIGS.default;
}

/**
 * Get delay in milliseconds for a provider
 */
export function getProviderDelay(provider: string | null | undefined): number {
  return getProviderConfig(provider).delayMs;
}

/**
 * Get max retries for a provider
 */
export function getProviderMaxRetries(provider: string | null | undefined): number {
  return getProviderConfig(provider).maxRetries;
}

/**
 * Get timeout for a provider
 */
export function getProviderTimeout(provider: string | null | undefined): number {
  return getProviderConfig(provider).timeoutMs;
}

/**
 * Format provider name for display
 */
export function formatProviderName(provider: string | null | undefined): string {
  if (!provider) return 'Unknown';

  const normalized = provider.toLowerCase();

  const providerNames: Record<string, string> = {
    google: 'Gmail',
    gmail: 'Gmail',
    microsoft: 'Outlook',
    office365: 'Outlook',
    outlook: 'Outlook',
    yahoo: 'Yahoo Mail',
    icloud: 'iCloud Mail',
    aol: 'AOL Mail',
    zoho: 'Zoho Mail',
    protonmail: 'ProtonMail',
    proton: 'ProtonMail',
    fastmail: 'FastMail',
    gmx: 'GMX Mail',
    mailru: 'Mail.ru',
    imap: 'IMAP',
  };

  return providerNames[normalized] || provider;
}
