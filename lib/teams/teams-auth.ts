// Microsoft Teams OAuth Authentication
import { encryptToken, decryptToken } from '@/lib/security/encryption';
import { TeamsTokenResponse, TeamsUserProfile } from './teams-types';

// Azure AD OAuth Configuration
const TENANT_ID = process.env.MS_GRAPH_TENANT_ID || 'common';
const CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID!;
const CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/teams/callback`;

// Microsoft Graph API endpoints
const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;
const TOKEN_ENDPOINT = `${AUTHORITY}/oauth2/v2.0/token`;
const AUTHORIZE_ENDPOINT = `${AUTHORITY}/oauth2/v2.0/authorize`;
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

// Required scopes for Teams chat integration
export const TEAMS_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Chat.Read',
  'Chat.ReadWrite',
  'ChatMessage.Read',
  'ChatMessage.Send',
  'Chat.ReadBasic',
  'Presence.Read',
];

/**
 * Generate the OAuth authorization URL for Teams
 */
export function getTeamsAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: TEAMS_SCOPES.join(' '),
    state: state,
    prompt: 'consent', // Always show consent to ensure all permissions
  });

  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<TeamsTokenResponse> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: TEAMS_SCOPES.join(' '),
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Token exchange error:', error);
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TeamsTokenResponse> {
  const decryptedRefreshToken = decryptToken(refreshToken);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: decryptedRefreshToken,
    grant_type: 'refresh_token',
    scope: TEAMS_SCOPES.join(' '),
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Token refresh error:', error);
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

/**
 * Get user profile from Microsoft Graph
 */
export async function getTeamsUserProfile(accessToken: string): Promise<TeamsUserProfile> {
  const response = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get user profile: ${error.error?.message || 'Unknown error'}`);
  }

  return response.json();
}

/**
 * Encrypt tokens for secure storage
 */
export function encryptTokens(tokens: TeamsTokenResponse): {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
} {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  return {
    accessToken: encryptToken(tokens.access_token),
    refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    expiresAt,
  };
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null,
  tokenExpiresAt: Date | null
): Promise<{ accessToken: string; refreshed: boolean; newTokens?: TeamsTokenResponse }> {
  // Check if token is still valid (with 5 minute buffer)
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (tokenExpiresAt && tokenExpiresAt.getTime() - bufferMs > now.getTime()) {
    // Token is still valid
    return {
      accessToken: decryptToken(encryptedAccessToken),
      refreshed: false,
    };
  }

  // Token expired or about to expire, need to refresh
  if (!encryptedRefreshToken) {
    throw new Error('Token expired and no refresh token available');
  }

  console.log('🔄 Refreshing Teams access token...');
  const newTokens = await refreshAccessToken(encryptedRefreshToken);

  return {
    accessToken: newTokens.access_token,
    refreshed: true,
    newTokens,
  };
}

/**
 * Revoke access (sign out)
 */
export async function revokeTeamsAccess(accessToken: string): Promise<boolean> {
  // Microsoft doesn't have a direct token revocation endpoint for user tokens
  // The best we can do is delete the refresh token from our database
  // The access token will expire naturally
  console.log('Teams access revoked (tokens will expire naturally)');
  return true;
}

/**
 * Validate that all required environment variables are set
 */
export function validateTeamsConfig(): { valid: boolean; missing: string[] } {
  const required = ['MS_GRAPH_CLIENT_ID', 'MS_GRAPH_CLIENT_SECRET', 'NEXT_PUBLIC_APP_URL'];
  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Parse the state parameter from OAuth callback
 */
export function parseOAuthState(state: string): { userId: string; returnUrl?: string } {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  } catch {
    throw new Error('Invalid OAuth state parameter');
  }
}

/**
 * Create the state parameter for OAuth
 */
export function createOAuthState(userId: string, returnUrl?: string): string {
  const state = { userId, returnUrl };
  return Buffer.from(JSON.stringify(state)).toString('base64');
}
