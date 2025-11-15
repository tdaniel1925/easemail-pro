/**
 * Calendar Sync Service
 * Handles robust calendar event sync with Nylas V3 API
 * Features: Cursor-based pagination, progress tracking, batch operations, N+1 query elimination
 * Architecture matches contacts-v4-sync.ts for consistency
 */

import { db } from '@/lib/db/drizzle';
import { calendarEvents, calendarSyncState, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================
// CONFIGURATION
// ============================================

const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';
const NYLAS_API_KEY = process.env.NYLAS_API_KEY!;
const SYNC_BATCH_SIZE = 50; // Nylas pagination limit
const INSERT_BATCH_SIZE = 100; // Database insert batch size
const RATE_LIMIT_DELAY = 25; // 25ms = 40 requests/second (Nylas limit)

// ============================================
// TYPES
// ============================================

interface SyncOptions {
  accountId: string;
  userId: string;
  grantId: string;
  provider: 'google' | 'microsoft';
  calendarId?: string;
  forceFullSync?: boolean;
  onProgress?: (update: SyncProgressUpdate) => void;
}

interface SyncResult {
  success: boolean;
  total: number;
  imported: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: number;
  duration_ms: number;
  error?: string;
}

export interface SyncProgressUpdate {
  type: 'start' | 'fetching' | 'progress' | 'complete' | 'error';
  status: string;
  total?: number;
  current?: number;
  percentage?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  error?: string;
}

interface NylasEvent {
  id: string;
  grant_id: string;
  calendar_id: string;
  title?: string;
  description?: string;
  location?: string;
  when: {
    object: 'timespan' | 'date' | 'datespan';
    start_time?: number;
    end_time?: number;
    start_date?: string;
    end_date?: string;
    timezone?: string;
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  busy?: boolean;
  participants?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  organizer?: {
    email: string;
    name?: string;
  };
  recurrence?: string[];
  reminders?: any[];
  metadata?: Record<string, any>;
  created_at?: number;
  updated_at?: number;
}

interface NylasEventListResponse {
  request_id: string;
  data: NylasEvent[];
  next_cursor?: string;
}

// ============================================
// MAIN SYNC CLASS
// ============================================

export class CalendarSyncService {
  private accountId: string;
  private userId: string;
  private grantId: string;
  private provider: 'google' | 'microsoft';
  private calendarId: string;
  private onProgress?: (update: SyncProgressUpdate) => void;

  constructor(options: SyncOptions) {
    this.accountId = options.accountId;
    this.userId = options.userId;
    this.grantId = options.grantId;
    this.provider = options.provider;
    this.calendarId = options.calendarId || 'primary';
    this.onProgress = options.onProgress;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Perform full or incremental sync
   */
  async sync(forceFullSync = false): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Update sync state to 'syncing'
      await this.updateSyncState({
        syncStatus: 'syncing',
        lastSyncAttempt: new Date(),
        currentOperation: 'initializing',
      });

      this.sendProgress({
        type: 'start',
        status: 'Initializing calendar sync...',
      });

      // Get or create sync state
      const syncState = await this.getSyncState();
      const cursor = !forceFullSync ? syncState?.lastSyncCursor : undefined;

      // Fetch events from Nylas with cursor-based pagination
      const { events: nylasEvents, nextCursor } = await this.fetchAllEvents(cursor);

      this.sendProgress({
        type: 'fetching',
        total: nylasEvents.length,
        status: `Fetched ${nylasEvents.length} events from ${this.provider}`,
      });

      // Process events
      const result = await this.processEvents(nylasEvents);

      // Update sync state with results
      await this.updateSyncState({
        syncStatus: 'idle',
        lastSuccessfulSync: new Date(),
        lastSyncCursor: nextCursor || cursor,
        totalEvents: result.imported + result.updated,
        syncedEvents: result.imported + result.updated,
        errorEvents: result.errors,
        currentOperation: null,
        progressCurrent: 0,
        progressTotal: 0,
        progressPercentage: 0,
      });

      const durationMs = Date.now() - startTime;

      this.sendProgress({
        type: 'complete',
        status: 'Sync complete!',
        total: nylasEvents.length,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
      });

      return {
        success: true,
        total: nylasEvents.length,
        ...result,
        duration_ms: durationMs,
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      console.error('❌ Calendar sync failed:', error);

      // Update sync state to error
      await this.updateSyncState({
        syncStatus: 'error',
        lastError: error.message,
        currentOperation: null,
      });

      this.sendProgress({
        type: 'error',
        status: error.message || 'Sync failed',
        error: error.message || 'Sync failed',
      });

      return {
        success: false,
        total: 0,
        imported: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: 1,
        duration_ms: durationMs,
        error: error.message,
      };
    }
  }

  // ============================================
  // NYLAS API METHODS
  // ============================================

  /**
   * Fetch all events from Nylas with cursor-based pagination
   * This fixes the hard-coded 500 event limit
   */
  private async fetchAllEvents(cursor?: string): Promise<{
    events: NylasEvent[];
    nextCursor?: string;
  }> {
    const allEvents: NylasEvent[] = [];
    let pageToken = cursor;
    let hasMore = true;
    let pageCount = 0;

    // Calculate date range: 6 months ago to 12 months in the future
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twelveMonthsFuture = new Date();
    twelveMonthsFuture.setMonth(twelveMonthsFuture.getMonth() + 12);

    const startTimestamp = Math.floor(sixMonthsAgo.getTime() / 1000);
    const endTimestamp = Math.floor(twelveMonthsFuture.getTime() / 1000);

    while (hasMore) {
      const url = new URL(`${NYLAS_API_URI}/v3/grants/${this.grantId}/events`);
      url.searchParams.append('calendar_id', this.calendarId);
      url.searchParams.append('limit', SYNC_BATCH_SIZE.toString());
      url.searchParams.append('start', startTimestamp.toString());
      url.searchParams.append('end', endTimestamp.toString());

      if (pageToken) {
        url.searchParams.append('page_token', pageToken);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Nylas API error: ${response.status} ${response.statusText}`);
      }

      const data: NylasEventListResponse = await response.json();
      allEvents.push(...data.data);

      hasMore = !!data.next_cursor;
      pageToken = data.next_cursor;
      pageCount++;

      this.sendProgress({
        type: 'fetching',
        total: allEvents.length,
        status: `Fetching page ${pageCount}... (${allEvents.length} events)`,
      });

      // Rate limiting
      if (hasMore) {
        await this.delay(RATE_LIMIT_DELAY);
      }
    }

    return {
      events: allEvents,
      nextCursor: pageToken,
    };
  }

  // ============================================
  // EVENT PROCESSING
  // ============================================

  /**
   * Process fetched events (create, update)
   * Uses in-memory lookup to eliminate N+1 query problem
   */
  private async processEvents(nylasEvents: NylasEvent[]): Promise<{
    imported: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
  }> {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Fetch ALL existing events for this account in ONE query (eliminates N+1 problem)
    const existingEvents = await db.query.calendarEvents.findMany({
      where: eq(calendarEvents.userId, this.userId),
    });

    // Create lookup maps by provider-specific ID
    const existingByGoogleIdMap = new Map(
      existingEvents
        .filter(e => e.googleEventId)
        .map(e => [e.googleEventId!, e])
    );

    const existingByMicrosoftIdMap = new Map(
      existingEvents
        .filter(e => e.microsoftEventId)
        .map(e => [e.microsoftEventId!, e])
    );

    console.log(`📋 Found ${existingEvents.length} existing events (${existingByGoogleIdMap.size} Google, ${existingByMicrosoftIdMap.size} Microsoft)`);

    // Prepare batch inserts/updates
    const eventsToInsert: any[] = [];
    const eventsToUpdate: { id: string; data: any }[] = [];

    for (let i = 0; i < nylasEvents.length; i++) {
      const nylasEvent = nylasEvents[i];

      try {
        // Check if event exists using in-memory lookup
        const existing = this.provider === 'google'
          ? existingByGoogleIdMap.get(nylasEvent.id)
          : existingByMicrosoftIdMap.get(nylasEvent.id);

        // Transform event data
        const eventData = this.transformFromNylas(nylasEvent);

        if (existing) {
          // Update existing event
          eventsToUpdate.push({
            id: existing.id,
            data: {
              ...eventData,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          // New event - prepare for insert
          eventsToInsert.push({
            ...eventData,
            userId: this.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          imported++;
        }
      } catch (error: any) {
        console.error('Error processing event:', error);
        errors++;
      }

      // Send progress update every 10 events
      if ((i + 1) % 10 === 0 || i === nylasEvents.length - 1) {
        const percentage = Math.round(((i + 1) / nylasEvents.length) * 100);

        this.sendProgress({
          type: 'progress',
          total: nylasEvents.length,
          current: i + 1,
          percentage,
          imported,
          updated,
          skipped,
          errors,
          status: `Processing: ${i + 1} / ${nylasEvents.length} (${percentage}%)`,
        });

        await this.updateSyncState({
          progressCurrent: i + 1,
          progressTotal: nylasEvents.length,
          progressPercentage: percentage,
        });
      }
    }

    // Batch insert new events
    if (eventsToInsert.length > 0) {
      this.sendProgress({
        type: 'progress',
        status: `Saving ${eventsToInsert.length} new events...`,
      });

      for (let i = 0; i < eventsToInsert.length; i += INSERT_BATCH_SIZE) {
        const batch = eventsToInsert.slice(i, i + INSERT_BATCH_SIZE);
        try {
          await db.insert(calendarEvents).values(batch);
          console.log(`✅ Inserted batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1} (${batch.length} events)`);
        } catch (error: any) {
          console.error('❌ Batch insert error:', error);
          errors += batch.length;
          imported -= batch.length;
        }
      }
    }

    // Batch update existing events
    if (eventsToUpdate.length > 0) {
      this.sendProgress({
        type: 'progress',
        status: `Updating ${eventsToUpdate.length} events...`,
      });

      for (const { id, data } of eventsToUpdate) {
        try {
          await db.update(calendarEvents)
            .set(data)
            .where(eq(calendarEvents.id, id));
        } catch (error: any) {
          console.error('❌ Update error:', error);
          errors++;
          updated--;
        }
      }
    }

    return {
      imported,
      updated,
      deleted: 0, // Delta sync will handle deletes
      skipped,
      errors,
    };
  }

  // ============================================
  // 2-WAY SYNC: PUSH CHANGES TO NYLAS
  // ============================================

  /**
   * Create a new event in Google/Microsoft Calendar via Nylas
   */
  async createEvent(eventData: any): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      const nylasEvent = this.transformToNylas(eventData);

      const response = await fetch(`${NYLAS_API_URI}/v3/grants/${this.grantId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...nylasEvent,
          calendar_id: this.calendarId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Nylas API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const nylasEventId = data.data.id;

      console.log(`✅ Event created in ${this.provider} calendar:`, nylasEventId);

      return { success: true, eventId: nylasEventId };
    } catch (error: any) {
      console.error('❌ Failed to create event in calendar:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing event in Google/Microsoft Calendar via Nylas
   */
  async updateEvent(eventId: string, eventData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const nylasEvent = this.transformToNylas(eventData);

      const response = await fetch(`${NYLAS_API_URI}/v3/grants/${this.grantId}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...nylasEvent,
          calendar_id: this.calendarId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Nylas API error: ${errorData.error || response.statusText}`);
      }

      console.log(`✅ Event updated in ${this.provider} calendar:`, eventId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to update event in calendar:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an event from Google/Microsoft Calendar via Nylas
   */
  async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${NYLAS_API_URI}/v3/grants/${this.grantId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        throw new Error(`Nylas API error: ${errorData.error || response.statusText}`);
      }

      console.log(`✅ Event deleted from ${this.provider} calendar:`, eventId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to delete event from calendar:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // DATA TRANSFORMATION
  // ============================================

  /**
   * Transform local event to Nylas format for pushing to calendar provider
   */
  private transformToNylas(event: any): any {
    // Transform time based on whether it's all-day or not
    let when: any;
    if (event.allDay) {
      // All-day event
      const startDate = new Date(event.startTime).toISOString().split('T')[0];
      const endDate = new Date(event.endTime).toISOString().split('T')[0];

      if (startDate === endDate) {
        when = {
          object: 'date',
          date: startDate,
        };
      } else {
        when = {
          object: 'datespan',
          start_date: startDate,
          end_date: endDate,
        };
      }
    } else {
      // Timed event
      when = {
        object: 'timespan',
        start_time: Math.floor(new Date(event.startTime).getTime() / 1000),
        end_time: Math.floor(new Date(event.endTime).getTime() / 1000),
        timezone: event.timezone || 'UTC',
      };
    }

    // Transform attendees/participants
    const participants = event.attendees?.map((a: any) => ({
      email: a.email,
      name: a.name,
      status: a.status,
    }));

    return {
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      when,
      busy: !event.isPrivate, // If private, mark as free
      participants,
      recurrence: event.recurrenceRule ? event.recurrenceRule.split(';') : undefined,
      reminders: event.reminders,
      metadata: event.metadata,
    };
  }

  /**
   * Transform Nylas event to local format
   * Now captures ALL event data including reminders, metadata, busy status, and organizer name
   */
  private transformFromNylas(nylas: NylasEvent): any {
    // Parse event times
    let startTime: Date;
    let endTime: Date;
    let allDay = false;
    let timezone = 'UTC';

    if (nylas.when.object === 'timespan') {
      startTime = new Date((nylas.when.start_time || 0) * 1000);
      endTime = new Date((nylas.when.end_time || 0) * 1000);
      timezone = nylas.when.timezone || 'UTC';
    } else if (nylas.when.object === 'date') {
      allDay = true;
      startTime = new Date(nylas.when.start_date || '');
      endTime = new Date(nylas.when.start_date || '');
    } else if (nylas.when.object === 'datespan') {
      allDay = true;
      startTime = new Date(nylas.when.start_date || '');
      endTime = new Date(nylas.when.end_date || '');
    } else {
      // Fallback
      startTime = new Date();
      endTime = new Date(startTime.getTime() + 3600000); // 1 hour
    }

    // Transform attendees to include full participant data
    const attendees = nylas.participants?.map(p => ({
      email: p.email,
      name: p.name || null,
      status: (p.status as 'accepted' | 'declined' | 'maybe' | 'pending') || 'pending',
    })) || [];

    // Transform reminders to our format
    const reminders = nylas.reminders?.map((reminder: any) => ({
      type: reminder.type || 'popup',
      minutesBefore: reminder.minutes || 0,
    })) || [];

    // Build metadata object with additional Nylas data
    const metadata: Record<string, any> = {
      ...nylas.metadata,
      nylasCreatedAt: nylas.created_at ? new Date(nylas.created_at * 1000).toISOString() : null,
      nylasUpdatedAt: nylas.updated_at ? new Date(nylas.updated_at * 1000).toISOString() : null,
      nylasGrantId: nylas.grant_id,
    };

    const baseData = {
      title: nylas.title || '(No title)',
      description: nylas.description || null,
      location: nylas.location || null,
      startTime,
      endTime,
      allDay,
      isRecurring: !!nylas.recurrence?.length,
      recurrenceRule: nylas.recurrence?.join(';') || null,
      timezone,
      calendarType: 'personal' as const,
      status: nylas.status === 'cancelled' ? 'cancelled' as const : 'confirmed' as const,
      attendees,
      organizerEmail: nylas.organizer?.email || null,
      // Enhanced fields
      reminders,
      metadata,
      isPrivate: nylas.busy === false, // If not busy, likely private time block
    };

    // Add provider-specific fields
    if (this.provider === 'google') {
      return {
        ...baseData,
        googleEventId: nylas.id,
        googleCalendarId: nylas.calendar_id,
        googleSyncStatus: 'synced' as const,
        googleLastSyncedAt: new Date(),
      };
    } else {
      return {
        ...baseData,
        microsoftEventId: nylas.id,
        microsoftCalendarId: nylas.calendar_id,
        microsoftSyncStatus: 'synced' as const,
        microsoftLastSyncedAt: new Date(),
      };
    }
  }

  // ============================================
  // SYNC STATE MANAGEMENT
  // ============================================

  /**
   * Get sync state for account
   */
  private async getSyncState(): Promise<any | null> {
    const results = await db.query.calendarSyncState.findFirst({
      where: and(
        eq(calendarSyncState.userId, this.userId),
        eq(calendarSyncState.emailAccountId, this.accountId),
        eq(calendarSyncState.provider, 'nylas')
      ),
    });

    return results || null;
  }

  /**
   * Update sync state
   */
  private async updateSyncState(updates: any): Promise<void> {
    try {
      const existing = await this.getSyncState();

      if (existing) {
        await db.update(calendarSyncState)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(calendarSyncState.id, existing.id));
      } else {
        await db.insert(calendarSyncState).values({
          userId: this.userId,
          emailAccountId: this.accountId,
          provider: 'nylas',
          calendarId: this.calendarId,
          ...updates,
        });
      }
    } catch (error: any) {
      console.error('Error updating sync state:', error);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Send progress update
   */
  private sendProgress(update: SyncProgressUpdate): void {
    if (this.onProgress) {
      this.onProgress(update);
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createCalendarSyncService(options: SyncOptions): CalendarSyncService {
  return new CalendarSyncService(options);
}
