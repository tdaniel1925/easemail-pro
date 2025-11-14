/**
 * Nylas Calendar Sync Service
 * Handles syncing calendar events from Nylas to local database
 * Now uses CalendarSyncService for robust, cursor-based sync
 */

import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createCalendarSyncService } from '@/lib/services/calendar-sync-service';

/**
 * Sync calendar events from Nylas to local database
 */
export async function syncFromNylasCalendar(
  userId: string,
  accountId: string,
  onProgress?: (update: any) => void
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    console.log(`📅 Starting Nylas Calendar sync for user ${userId}, account ${accountId}`);

    // Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId)
    });

    if (!account || !account.nylasGrantId) {
      throw new Error('Account not found or missing Nylas grant ID');
    }

    // Check if account has calendar scopes
    console.log('🔍 Checking calendar scopes for account:', {
      accountId: account.id,
      email: account.emailAddress,
      nylasScopes: account.nylasScopes,
      scopesType: typeof account.nylasScopes,
      scopesIsArray: Array.isArray(account.nylasScopes)
    });

    const hasCalendarScopes = account.nylasScopes?.some(
      scope => scope.includes('calendar') || scope.includes('Calendar')
    );

    if (!hasCalendarScopes) {
      console.warn('⚠️ Account does not have calendar scopes', {
        nylasScopes: account.nylasScopes,
        hasScopes: !!account.nylasScopes,
        scopeCount: account.nylasScopes?.length
      });
      return {
        success: false,
        synced: 0,
        error: 'Calendar access not granted. Please reconnect with calendar permissions.'
      };
    }

    // Determine provider
    const provider = (account.nylasProvider === 'google' ||
                     account.emailProvider === 'gmail' ||
                     account.emailAddress?.includes('@gmail.com'))
      ? 'google' as const
      : 'microsoft' as const;

    console.log(`📅 Detected provider: ${provider}`);

    // Create sync service instance
    const syncService = createCalendarSyncService({
      accountId,
      userId,
      grantId: account.nylasGrantId,
      provider,
      calendarId: 'primary',
      onProgress,
    });

    // Perform sync
    const result = await syncService.sync(false);

    if (result.success) {
      console.log(`✅ Nylas Calendar sync completed: ${result.imported + result.updated} events`);
      return {
        success: true,
        synced: result.imported + result.updated,
      };
    } else {
      return {
        success: false,
        synced: 0,
        error: result.error || 'Sync failed',
      };
    }

  } catch (error: any) {
    console.error('❌ Nylas Calendar sync failed:', error);
    return { success: false, synced: 0, error: error.message };
  }
}

