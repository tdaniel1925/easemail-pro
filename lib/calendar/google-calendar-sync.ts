/**
 * Google Calendar Sync Service
 * Handles two-way sync between local calendar_events and Google Calendar
 */

import { db } from '@/lib/db/drizzle';
import { calendarEvents, calendarSyncState, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  status?: string;
  transparency?: string;
  organizer?: {
    email: string;
    displayName?: string;
  };
}

/**
 * Sync events from Google Calendar to local database
 */
export async function syncFromGoogleCalendar(
  userId: string,
  accountId: string
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    console.log(`📅 Starting Google Calendar sync for user ${userId}`);
    
    // Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId)
    });
    
    if (!account || !account.nylasGrantId) {
      throw new Error('Account not found or missing grant ID');
    }
    
    // Check if account has calendar scopes
    const hasCalendarScopes = account.nylasScopes?.some(
      scope => scope.includes('calendar') || scope.includes('Calendar')
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
        eq(calendarSyncState.provider, 'google')
      )
    });
    
    if (!syncState) {
      [syncState] = await db.insert(calendarSyncState).values({
        userId,
        emailAccountId: accountId,
        provider: 'google',
        calendarId: 'primary',
        syncStatus: 'idle',
      }).returning();
    }
    
    // Update sync status
    await db.update(calendarSyncState)
      .set({ syncStatus: 'syncing', updatedAt: new Date() })
      .where(eq(calendarSyncState.id, syncState.id));
    
    // Fetch events from Google Calendar
    const events = await fetchGoogleCalendarEvents(account.accessToken!, syncState.syncToken);
    
    console.log(`📥 Fetched ${events.items?.length || 0} events from Google Calendar`);
    
    let syncedCount = 0;
    
    // Process each event
    for (const googleEvent of events.items || []) {
      try {
        await upsertEventFromGoogle(userId, accountId, googleEvent);
        syncedCount++;
      } catch (error: any) {
        console.error(`❌ Failed to sync event ${googleEvent.id}:`, error.message);
      }
    }
    
    // Update sync state with new token
    await db.update(calendarSyncState)
      .set({
        syncStatus: 'completed',
        lastSyncAt: new Date(),
        syncToken: events.nextSyncToken,
        pageToken: events.nextPageToken,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(calendarSyncState.id, syncState.id));
    
    console.log(`✅ Google Calendar sync completed: ${syncedCount} events`);
    
    return { success: true, synced: syncedCount };
    
  } catch (error: any) {
    console.error('❌ Google Calendar sync failed:', error);
    
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
          eq(calendarSyncState.provider, 'google')
        ));
    } catch (updateError) {
      console.error('Failed to update sync state:', updateError);
    }
    
    return { success: false, synced: 0, error: error.message };
  }
}

/**
 * Fetch events from Google Calendar API
 */
async function fetchGoogleCalendarEvents(
  accessToken: string,
  syncToken?: string | null
): Promise<any> {
  const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  
  const params = new URLSearchParams({
    maxResults: '250',
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  
  if (syncToken) {
    params.append('syncToken', syncToken);
  } else {
    // First sync - get events from 6 months ago to capture historical data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    params.append('timeMin', sixMonthsAgo.toISOString());

    // Also set timeMax to 6 months in the future for better calendar coverage
    const sixMonthsFuture = new Date();
    sixMonthsFuture.setMonth(sixMonthsFuture.getMonth() + 6);
    params.append('timeMax', sixMonthsFuture.toISOString());
  }
  
  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} ${error}`);
  }
  
  return response.json();
}

/**
 * Upsert event from Google to local database
 */
async function upsertEventFromGoogle(
  userId: string,
  accountId: string,
  googleEvent: GoogleCalendarEvent
): Promise<void> {
  // Check if event already exists
  const existing = await db.query.calendarEvents.findFirst({
    where: and(
      eq(calendarEvents.userId, userId),
      eq(calendarEvents.googleEventId, googleEvent.id)
    )
  });
  
  // Parse Google event data
  const isAllDay = !googleEvent.start.dateTime;
  const startTime = new Date(googleEvent.start.dateTime || googleEvent.start.date!);
  const endTime = new Date(googleEvent.end.dateTime || googleEvent.end.date!);
  
  const eventData = {
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description || null,
    location: googleEvent.location || null,
    startTime,
    endTime,
    allDay: isAllDay,
    timezone: googleEvent.start.timeZone || 'UTC',
    isRecurring: !!googleEvent.recurrence,
    recurrenceRule: googleEvent.recurrence?.[0] || null,
    organizerEmail: googleEvent.organizer?.email || null,
    attendees: googleEvent.attendees?.map(a => ({
      email: a.email,
      name: a.displayName,
      status: mapGoogleResponseStatus(a.responseStatus),
    })),
    reminders: googleEvent.reminders?.overrides?.map(r => ({
      type: mapGoogleReminderMethod(r.method),
      minutesBefore: r.minutes,
    })),
    status: googleEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
    googleEventId: googleEvent.id,
    googleCalendarId: 'primary',
    googleSyncStatus: 'synced',
    googleLastSyncedAt: new Date(),
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
      color: 'blue',
      calendarType: 'personal',
    });
  }
}

/**
 * Push local event to Google Calendar
 */
export async function pushToGoogleCalendar(
  eventId: string,
  accountId: string
): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
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
    
    // Convert to Google Calendar format
    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.allDay ? {
        date: event.startTime.toISOString().split('T')[0]
      } : {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone,
      },
      end: event.allDay ? {
        date: event.endTime.toISOString().split('T')[0]
      } : {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timezone,
      },
      recurrence: event.recurrenceRule ? [event.recurrenceRule] : undefined,
      attendees: event.attendees?.map(a => ({
        email: a.email,
        displayName: a.name,
      })),
      reminders: event.reminders?.length ? {
        useDefault: false,
        overrides: event.reminders.map(r => ({
          method: r.type === 'email' ? 'email' : 'popup',
          minutes: r.minutesBefore,
        })),
      } : undefined,
    };
    
    const url = event.googleEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    
    const method = event.googleEventId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} ${error}`);
    }
    
    const createdEvent = await response.json();
    
    // Update local event with Google ID
    await db.update(calendarEvents)
      .set({
        googleEventId: createdEvent.id,
        googleCalendarId: 'primary',
        googleSyncStatus: 'synced',
        googleLastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, eventId));
    
    return { success: true, googleEventId: createdEvent.id };
    
  } catch (error: any) {
    console.error('❌ Failed to push to Google Calendar:', error);
    
    // Update event sync status
    try {
      await db.update(calendarEvents)
        .set({
          googleSyncStatus: 'failed',
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
 * Delete event from Google Calendar
 */
export async function deleteFromGoogleCalendar(
  eventId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId)
    });
    
    if (!event || !event.googleEventId) {
      return { success: true }; // Nothing to delete
    }
    
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId)
    });
    
    if (!account || !account.accessToken) {
      throw new Error('Account not found');
    }
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
        },
      }
    );
    
    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} ${error}`);
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Failed to delete from Google Calendar:', error);
    return { success: false, error: error.message };
  }
}

// Helper functions
function mapGoogleResponseStatus(status?: string): 'accepted' | 'declined' | 'maybe' | 'pending' {
  switch (status) {
    case 'accepted': return 'accepted';
    case 'declined': return 'declined';
    case 'tentative': return 'maybe';
    default: return 'pending';
  }
}

function mapGoogleReminderMethod(method: string): 'email' | 'sms' | 'popup' {
  switch (method) {
    case 'email': return 'email';
    case 'sms': return 'sms';
    default: return 'popup';
  }
}

