/**
 * Microsoft Calendar Sync Service
 * Handles two-way sync between local calendar_events and Microsoft Outlook Calendar
 */

import { db } from '@/lib/db/drizzle';
import { calendarEvents, calendarSyncState, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface MicrosoftCalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  body?: {
    contentType: string;
    content: string;
  };
  location?: {
    displayName: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay?: boolean;
  recurrence?: any;
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    status: {
      response: string;
    };
  }>;
  reminderMinutesBeforeStart?: number;
  isReminderOn?: boolean;
  showAs?: string;
  isCancelled?: boolean;
  organizer?: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
}

/**
 * Sync events from Microsoft Calendar to local database
 */
export async function syncFromMicrosoftCalendar(
  userId: string,
  accountId: string
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    console.log(`📅 Starting Microsoft Calendar sync for user ${userId}`);
    
    // Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId)
    });
    
    if (!account || !account.nylasGrantId) {
      throw new Error('Account not found or missing grant ID');
    }
    
    // Check if account has calendar scopes
    const hasCalendarScopes = account.nylasScopes?.some(
      scope => scope.includes('Calendar') || scope.includes('calendar')
    );
    
    if (!hasCalendarScopes) {
      console.warn('⚠️ Account does not have calendar scopes');
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
        eq(calendarSyncState.provider, 'microsoft')
      )
    });
    
    if (!syncState) {
      [syncState] = await db.insert(calendarSyncState).values({
        userId,
        emailAccountId: accountId,
        provider: 'microsoft',
        calendarId: 'primary',
        syncStatus: 'idle',
      }).returning();
    }
    
    // Update sync status
    await db.update(calendarSyncState)
      .set({ syncStatus: 'syncing', updatedAt: new Date() })
      .where(eq(calendarSyncState.id, syncState.id));
    
    // Fetch events from Microsoft Calendar
    const events = await fetchMicrosoftCalendarEvents(account.accessToken!, syncState.syncToken);
    
    console.log(`📥 Fetched ${events.value?.length || 0} events from Microsoft Calendar`);
    
    let syncedCount = 0;
    
    // Process each event
    for (const msEvent of events.value || []) {
      try {
        await upsertEventFromMicrosoft(userId, accountId, msEvent);
        syncedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to sync event ${msEvent.id}:`, error.message);
      }
    }
    
    // Update sync state
    await db.update(calendarSyncState)
      .set({
        syncStatus: 'completed',
        lastSyncAt: new Date(),
        syncToken: events.deltaLink || events['@odata.deltaLink'],
        pageToken: events['@odata.nextLink'],
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncState.id, syncState.id));
    
    console.log(`✅ Microsoft Calendar sync completed: ${syncedCount} events`);
    
    return { success: true, synced: syncedCount };
    
  } catch (error: any) {
    console.error('❌ Microsoft Calendar sync failed:', error);
    
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
          eq(calendarSyncState.provider, 'microsoft')
        ));
    } catch (updateError) {
      console.error('Failed to update sync state:', updateError);
    }
    
    return { success: false, synced: 0, error: error.message };
  }
}

/**
 * Fetch events from Microsoft Graph API
 */
async function fetchMicrosoftCalendarEvents(
  accessToken: string,
  deltaLink?: string | null
): Promise<any> {
  let url = deltaLink || 'https://graph.microsoft.com/v1.0/me/calendar/events';
  
  if (!deltaLink) {
    // First sync - get events from 6 months ago to capture historical data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Also set range to 6 months in the future for better calendar coverage
    const sixMonthsFuture = new Date();
    sixMonthsFuture.setMonth(sixMonthsFuture.getMonth() + 6);

    const params = new URLSearchParams({
      '$top': '250',
      '$orderby': 'start/dateTime',
      '$filter': `start/dateTime ge '${sixMonthsAgo.toISOString()}' and start/dateTime le '${sixMonthsFuture.toISOString()}'`,
    });

    url = `${url}?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Prefer': 'odata.maxpagesize=250',
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
  }
  
  return response.json();
}

/**
 * Upsert event from Microsoft to local database
 */
async function upsertEventFromMicrosoft(
  userId: string,
  accountId: string,
  msEvent: MicrosoftCalendarEvent
): Promise<void> {
  // Check if event already exists
  const existing = await db.query.calendarEvents.findFirst({
    where: and(
      eq(calendarEvents.userId, userId),
      eq(calendarEvents.microsoftEventId, msEvent.id)
    )
  });
  
  // Parse Microsoft event data
  const startTime = new Date(msEvent.start.dateTime);
  const endTime = new Date(msEvent.end.dateTime);
  
  const eventData = {
    title: msEvent.subject || 'Untitled Event',
    description: msEvent.body?.content || msEvent.bodyPreview || null,
    location: msEvent.location?.displayName || null,
    startTime,
    endTime,
    allDay: msEvent.isAllDay || false,
    timezone: msEvent.start.timeZone || 'UTC',
    isRecurring: !!msEvent.recurrence,
    recurrenceRule: msEvent.recurrence ? JSON.stringify(msEvent.recurrence) : null,
    organizerEmail: msEvent.organizer?.emailAddress?.address || null,
    attendees: msEvent.attendees?.map(a => ({
      email: a.emailAddress.address,
      name: a.emailAddress.name,
      status: mapMicrosoftResponseStatus(a.status.response),
    })),
    reminders: msEvent.isReminderOn && msEvent.reminderMinutesBeforeStart ? [{
      type: 'popup' as const,
      minutesBefore: msEvent.reminderMinutesBeforeStart,
    }] : [],
    status: msEvent.isCancelled ? 'cancelled' : 'confirmed',
    microsoftEventId: msEvent.id,
    microsoftCalendarId: 'primary',
    microsoftSyncStatus: 'synced',
    microsoftLastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
  
  if (existing) {
    // Update existing event
    await db.update(calendarEvents)
      .set(eventData)
      .where(eq(calendarEvents.id, existing.id));
  } else {
    // Create new event
    await db.insert(calendarEvents).values({
      ...eventData,
      userId,
      color: 'green',
      calendarType: 'personal',
    });
  }
}

/**
 * Push local event to Microsoft Calendar
 */
export async function pushToMicrosoftCalendar(
  eventId: string,
  accountId: string
): Promise<{ success: boolean; microsoftEventId?: string; error?: string }> {
  try {
    // Get event
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId)
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Get account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId)
    });
    
    if (!account || !account.accessToken) {
      throw new Error('Account not found or missing access token');
    }
    
    // Convert to Microsoft Calendar format
    const msEvent = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || '',
      },
      location: event.location ? {
        displayName: event.location,
      } : undefined,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timezone,
      },
      isAllDay: event.allDay,
      attendees: event.attendees?.map(a => ({
        emailAddress: {
          address: a.email,
          name: a.name,
        },
        type: 'required',
      })),
      isReminderOn: !!event.reminders?.length,
      reminderMinutesBeforeStart: event.reminders?.[0]?.minutesBefore || 15,
    };
    
    const url = event.microsoftEventId
      ? `https://graph.microsoft.com/v1.0/me/calendar/events/${event.microsoftEventId}`
      : 'https://graph.microsoft.com/v1.0/me/calendar/events';
    
    const method = event.microsoftEventId ? 'PATCH' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msEvent),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
    }
    
    const createdEvent = await response.json();
    
    // Update local event with Microsoft ID
    await db.update(calendarEvents)
      .set({
        microsoftEventId: createdEvent.id,
        microsoftCalendarId: 'primary',
        microsoftSyncStatus: 'synced',
        microsoftLastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, eventId));
    
    return { success: true, microsoftEventId: createdEvent.id };
    
  } catch (error: any) {
    console.error('❌ Failed to push to Microsoft Calendar:', error);
    
    // Update event sync status
    try {
      await db.update(calendarEvents)
        .set({
          microsoftSyncStatus: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, eventId));
    } catch (updateError) {
      console.error('Failed to update event status:', updateError);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Delete event from Microsoft Calendar
 */
export async function deleteFromMicrosoftCalendar(
  eventId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId)
    });
    
    if (!event || !event.microsoftEventId) {
      return { success: true }; // Nothing to delete
    }
    
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId)
    });
    
    if (!account || !account.accessToken) {
      throw new Error('Account not found');
    }
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendar/events/${event.microsoftEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
        },
      }
    );
    
    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Failed to delete from Microsoft Calendar:', error);
    return { success: false, error: error.message };
  }
}

// Helper functions
function mapMicrosoftResponseStatus(status: string): 'accepted' | 'declined' | 'maybe' | 'pending' {
  switch (status.toLowerCase()) {
    case 'accepted': return 'accepted';
    case 'declined': return 'declined';
    case 'tentativelyaccepted': return 'maybe';
    default: return 'pending';
  }
}

