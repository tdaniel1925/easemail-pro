/**
 * Nylas Calendar Sync Service
 * Handles syncing calendar events from Nylas to local database
 */

import Nylas from 'nylas';
import { db } from '@/lib/db/drizzle';
import { calendarEvents, calendarSyncState, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

/**
 * Sync calendar events from Nylas to local database
 */
export async function syncFromNylasCalendar(
  userId: string,
  accountId: string
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

    // Get or create sync state
    let syncState = await db.query.calendarSyncState.findFirst({
      where: and(
        eq(calendarSyncState.userId, userId),
        eq(calendarSyncState.emailAccountId, accountId),
        eq(calendarSyncState.provider, 'nylas')
      )
    });

    if (!syncState) {
      [syncState] = await db.insert(calendarSyncState).values({
        userId,
        emailAccountId: accountId,
        provider: 'nylas',
        calendarId: 'primary',
        syncStatus: 'idle',
      }).returning();
    }

    // Update sync status
    await db.update(calendarSyncState)
      .set({ syncStatus: 'syncing', updatedAt: new Date() })
      .where(eq(calendarSyncState.id, syncState.id));

    // Calculate date range: 6 months ago to 12 months in the future
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twelveMonthsFuture = new Date();
    twelveMonthsFuture.setMonth(twelveMonthsFuture.getMonth() + 12);

    // Fetch events from Nylas
    console.log(`📥 Fetching events from Nylas for grant ${account.nylasGrantId}`);

    const events = await nylas.events.list({
      identifier: account.nylasGrantId,
      queryParams: {
        calendarId: 'primary',
        start: Math.floor(sixMonthsAgo.getTime() / 1000) as any,
        end: Math.floor(twelveMonthsFuture.getTime() / 1000) as any,
        limit: 500, // Fetch up to 500 events
      },
    });

    console.log(`📥 Fetched ${events.data?.length || 0} events from Nylas`);

    let syncedCount = 0;

    // Process each event
    for (const nylasEvent of events.data || []) {
      try {
        await upsertEventFromNylas(userId, accountId, nylasEvent, account);
        syncedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to sync event ${nylasEvent.id}:`, error.message);
      }
    }

    // Update sync state
    await db.update(calendarSyncState)
      .set({
        syncStatus: 'completed',
        lastSyncAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncState.id, syncState.id));

    console.log(`✅ Nylas Calendar sync completed: ${syncedCount} events`);

    return { success: true, synced: syncedCount };

  } catch (error: any) {
    console.error('❌ Nylas Calendar sync failed:', error);

    // Update sync state with error
    try {
      await db.update(calendarSyncState)
        .set({
          syncStatus: 'error',
          lastError: error.message,
          updatedAt: new Date(),
        })
        .where(and(
          eq(calendarSyncState.userId, userId),
          eq(calendarSyncState.emailAccountId, accountId),
          eq(calendarSyncState.provider, 'nylas')
        ));
    } catch (updateError) {
      console.error('Failed to update sync state:', updateError);
    }

    return { success: false, synced: 0, error: error.message };
  }
}

/**
 * Upsert a calendar event from Nylas into the database
 */
async function upsertEventFromNylas(
  userId: string,
  accountId: string,
  nylasEvent: any,
  account: any
): Promise<void> {
  // Parse event times
  const startTime = nylasEvent.when?.startTime
    ? new Date(nylasEvent.when.startTime * 1000)
    : nylasEvent.when?.date
      ? new Date(nylasEvent.when.date)
      : new Date();

  const endTime = nylasEvent.when?.endTime
    ? new Date(nylasEvent.when.endTime * 1000)
    : nylasEvent.when?.date
      ? new Date(nylasEvent.when.date)
      : new Date(startTime.getTime() + 3600000); // Default 1 hour

  // Determine provider type from account
  const isGoogleAccount = account.nylasProvider === 'google' ||
                         account.emailProvider === 'gmail' ||
                         account.emailAddress?.includes('@gmail.com');

  // Check if event already exists based on provider
  const existing = await db.query.calendarEvents.findFirst({
    where: and(
      eq(calendarEvents.userId, userId),
      isGoogleAccount
        ? eq(calendarEvents.googleEventId, nylasEvent.id)
        : eq(calendarEvents.microsoftEventId, nylasEvent.id)
    )
  });

  const eventData: any = {
    userId,
    title: nylasEvent.title || '(No title)',
    description: nylasEvent.description || null,
    location: nylasEvent.location || null,
    startTime,
    endTime,
    allDay: nylasEvent.when?.object === 'date',
    isRecurring: !!nylasEvent.recurrence,
    recurrenceRule: nylasEvent.recurrence?.join(';') || null,
    timezone: nylasEvent.when?.timezone || 'UTC',
    calendarType: 'personal', // Default type
    status: nylasEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
    attendees: nylasEvent.participants || [],
    organizerEmail: nylasEvent.organizer?.email || null,
    updatedAt: new Date(),
  };

  // Add provider-specific fields
  if (isGoogleAccount) {
    eventData.googleEventId = nylasEvent.id;
    eventData.googleCalendarId = 'primary';
    eventData.googleSyncStatus = 'synced';
    eventData.googleLastSyncedAt = new Date();
  } else {
    eventData.microsoftEventId = nylasEvent.id;
    eventData.microsoftCalendarId = 'primary';
    eventData.microsoftSyncStatus = 'synced';
    eventData.microsoftLastSyncedAt = new Date();
  }

  if (existing) {
    // Update existing event
    await db.update(calendarEvents)
      .set(eventData)
      .where(eq(calendarEvents.id, existing.id));
  } else {
    // Insert new event
    await db.insert(calendarEvents).values({
      ...eventData,
      createdAt: new Date(),
    });
  }
}
