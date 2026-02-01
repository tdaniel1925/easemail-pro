/**
 * Nylas v3 Configuration
 * Centralized configuration for Nylas API v3 integration
 */

import Nylas from 'nylas';

export const nylasConfig = {
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
  clientId: process.env.NYLAS_CLIENT_ID!,
  clientSecret: process.env.NYLAS_CLIENT_SECRET,
  webhookSecret: process.env.NYLAS_WEBHOOK_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas-v3/callback`,
};

// Singleton Nylas client instance
let nylasClient: Nylas | null = null;

export function getNylasClient(): Nylas {
  if (!nylasClient) {
    nylasClient = new Nylas({
      apiKey: nylasConfig.apiKey,
      apiUri: nylasConfig.apiUri,
    });
  }
  return nylasClient;
}

// OAuth scopes required for the application
export const OAUTH_SCOPES = [
  'email.read_only',
  'email.send',
  'email.folders',
  'email.modify',
  'email.drafts',
  'calendar',
  'calendar.read_only',
];

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  MIN_PAGE_SIZE: 10,
};

// Rate limits (per Nylas documentation)
export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 100,
  BURST_LIMIT: 200,
  MESSAGE_LISTING_PER_MINUTE: 50,
};

// Webhook event types we handle
export const WEBHOOK_EVENTS = {
  GRANT_CREATED: 'grant.created',
  GRANT_UPDATED: 'grant.updated',
  GRANT_EXPIRED: 'grant.expired',
  GRANT_DELETED: 'grant.deleted',
  MESSAGE_CREATED: 'message.created',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',
  MESSAGE_CREATED_TRUNCATED: 'message.created.truncated',
  MESSAGE_UPDATED_TRUNCATED: 'message.updated.truncated',
  FOLDER_CREATED: 'folder.created',
  FOLDER_UPDATED: 'folder.updated',
  FOLDER_DELETED: 'folder.deleted',
  // ✅ Calendar webhook events
  CALENDAR_EVENT_CREATED: 'calendar.event.created',
  CALENDAR_EVENT_UPDATED: 'calendar.event.updated',
  CALENDAR_EVENT_DELETED: 'calendar.event.deleted',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];
