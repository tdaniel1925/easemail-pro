/**
 * Nylas Token Refresh Service
 * Automatically refreshes expired tokens to prevent account disconnections
 */

import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq, and, lt, not } from 'drizzle-orm';
import Nylas from 'nylas';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

const TOKEN_REFRESH_THRESHOLD_HOURS = 24; // Refresh if expires in <24h
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

export interface TokenRefreshResult {
  accountId: string;
  success: boolean;
  error?: string;
}

/**
 * Check and refresh tokens for all accounts that need it
 */
export async function checkAndRefreshTokens(): Promise<TokenRefreshResult[]> {
  try {
    // Get all accounts that might need token refresh
    const accounts = await db
      .select()
      .from(emailAccounts)
      .where(
        and(
          not(eq(emailAccounts.status, 'error')),
          not(eq(emailAccounts.status, 'disconnected'))
        )
      );

    console.log(`🔄 Checking ${accounts.length} accounts for token refresh`);

    const results: TokenRefreshResult[] = [];

    for (const account of accounts) {
      try {
        // Check if token needs refresh
        if (needsTokenRefresh(account)) {
          console.log(`🔑 Refreshing token for ${account.emailAddress}`);
          await refreshAccountToken(account.id, account.nylasGrantId!);
          results.push({ accountId: account.id, success: true });
        }
      } catch (error: any) {
        console.error(`❌ Failed to refresh token for ${account.emailAddress}:`, error);
        results.push({ 
          accountId: account.id, 
          success: false, 
          error: error.message 
        });

        // Mark account with auth error
        await db
          .update(emailAccounts)
          .set({
            lastError: 'Token refresh failed - please reconnect',
            status: 'error',
            updatedAt: new Date(),
          })
          .where(eq(emailAccounts.id, account.id));
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Token refresh check failed:', error);
    return [];
  }
}

/**
 * Check if an account needs token refresh
 */
function needsTokenRefresh(account: any): boolean {
  // If no expiry date stored, try to refresh anyway
  if (!account.tokenExpiresAt) {
    return true;
  }

  const expiresAt = new Date(account.tokenExpiresAt);
  const now = new Date();
  const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Refresh if expires in less than threshold
  return hoursUntilExpiry < TOKEN_REFRESH_THRESHOLD_HOURS;
}

/**
 * Refresh token for a specific account
 */
async function refreshAccountToken(accountId: string, grantId: string): Promise<void> {
  try {
    // Validate grant is still valid
    const grant = await nylas.auth.grants.find({
      grantId,
    });

    if (!grant || !grant.data) {
      throw new Error('Grant not found or invalid');
    }

    console.log(`✅ Token validated for account ${accountId}`);

    // Update last checked time
    await db
      .update(emailAccounts)
      .set({
        lastSyncedAt: new Date(),
        lastError: null,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

  } catch (error: any) {
    console.error(`❌ Token refresh failed for ${accountId}:`, error);
    
    // If auth error, mark for reconnection
    if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('auth')) {
      await db
        .update(emailAccounts)
        .set({
          lastError: 'Authentication expired - please reconnect',
          status: 'error',
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, accountId));
    }
    
    throw error;
  }
}

/**
 * Start automatic token refresh service
 * Call this on server startup
 */
export function startTokenRefreshService() {
  console.log('🔑 Starting automatic token refresh service');

  // Run immediately on startup
  checkAndRefreshTokens();

  // Then run every hour
  setInterval(() => {
    checkAndRefreshTokens();
  }, CHECK_INTERVAL_MS);
}

/**
 * Manually trigger token refresh for a specific account
 */
export async function refreshAccountTokenManually(accountId: string): Promise<boolean> {
  try {
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.nylasGrantId) {
      throw new Error('No grant ID found');
    }

    await refreshAccountToken(accountId, account.nylasGrantId);
    return true;
  } catch (error) {
    console.error('Manual token refresh failed:', error);
    return false;
  }
}

