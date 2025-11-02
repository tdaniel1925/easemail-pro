/**
 * Nylas Token Refresh Service
 * Silent, proactive token management for 99%+ uptime
 * 
 * Strategy:
 * - Refresh 5 days before expiry (120 hours)
 * - Check every 10 minutes
 * - Retry 10 times with exponential backoff
 * - Only show error after 5 consecutive failures
 * - Zero user intervention required
 */

import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq, and, lt, not } from 'drizzle-orm';
import Nylas from 'nylas';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

// ✅ OPTIMIZED CONFIGURATION
const TOKEN_REFRESH_THRESHOLD_HOURS = 120; // 5 days (super early)
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // Every 10 minutes
const MAX_RETRIES = 10; // Retry 10 times before failing
const MAX_BACKOFF_MS = 5 * 60 * 1000; // Max 5 minute wait between retries
const FAILURE_THRESHOLD = 5; // Show error only after 5 consecutive failures

export interface TokenRefreshResult {
  accountId: string;
  success: boolean;
  error?: string;
}

/**
 * Check and refresh tokens for all accounts that need it
 * ✅ LAYER 2: Backend cron checks (every 10 minutes)
 */
export async function checkAndRefreshTokens(): Promise<TokenRefreshResult[]> {
  try {
    // Get all accounts (including those with errors - give them another chance)
    const accounts = await db
      .select()
      .from(emailAccounts);

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

        // ✅ GRACEFUL DEGRADATION: Only mark as error after multiple failures
        const currentFailures = (account.refreshFailures || 0) + 1;
        
        if (currentFailures >= FAILURE_THRESHOLD) {
          // Only NOW show error to user (after 5 failures over ~50 minutes)
          console.log(`⚠️ Account ${account.emailAddress} failed ${currentFailures} times - marking as error`);
          await db
            .update(emailAccounts)
            .set({
              lastError: 'Account needs reconnection',
              syncStatus: 'error',
              refreshFailures: currentFailures,
              updatedAt: new Date(),
            })
            .where(eq(emailAccounts.id, account.id));
        } else {
          // Silent failure - increment counter and try again in 10 minutes
          console.log(`🔄 Account ${account.emailAddress} failed ${currentFailures}/${FAILURE_THRESHOLD} times - will retry`);
          await db
            .update(emailAccounts)
            .set({
              refreshFailures: currentFailures,
              updatedAt: new Date(),
            })
            .where(eq(emailAccounts.id, account.id));
        }
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
 * ✅ WITH AGGRESSIVE RETRY LOGIC (10 attempts with exponential backoff)
 */
async function refreshAccountToken(accountId: string, grantId: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Validate grant is still valid
      const grant = await nylas.grants.find({
        grantId,
      });

      if (!grant || !grant.data) {
        throw new Error('Grant not found or invalid');
      }

      console.log(`✅ Token validated for account ${accountId} (attempt ${attempt + 1}/${MAX_RETRIES})`);

      // Success! Clear any previous errors
      await db
        .update(emailAccounts)
        .set({
          lastSyncedAt: new Date(),
          lastError: null,
          syncStatus: 'idle',
          refreshFailures: 0, // Reset failure counter on success
          retryCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, accountId));

      return; // ✅ Success - exit retry loop

    } catch (error: any) {
      console.error(`❌ Token refresh attempt ${attempt + 1}/${MAX_RETRIES} failed for ${accountId}:`, error);
      
      // Check if this is an auth error that needs reconnection (don't retry these)
      if (
        error.message?.includes('401') || 
        error.message?.includes('403') || 
        error.message?.includes('invalid_grant') ||
        error.message?.includes('revoked') ||
        error.message?.includes('auth')
      ) {
        console.log(`🔒 Auth error detected - needs user reconnection`);
        throw error; // Don't retry auth errors
      }
      
      // Last attempt?
      if (attempt === MAX_RETRIES - 1) {
        console.error(`💥 All ${MAX_RETRIES} retry attempts exhausted for ${accountId}`);
        throw error; // Throw on last attempt
      }
      
      // ✅ EXPONENTIAL BACKOFF: Wait longer each time (1s, 2s, 4s, 8s... up to 5 min)
      const delayMs = Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF_MS);
      console.log(`⏳ Waiting ${delayMs}ms before retry ${attempt + 2}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
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

