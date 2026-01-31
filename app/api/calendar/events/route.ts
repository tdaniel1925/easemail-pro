/**
 * Calendar Events API
 * GET - List events
 * POST - Create event (with 2-way sync to Google/Microsoft Calendar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents, emailAccounts, users } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { createRecurringInstances } from '@/lib/calendar/recurring-events';
import { createCalendarSyncService } from '@/lib/services/calendar-sync-service';
import { sendCalendarInvitations } from '@/lib/calendar/invitation-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const calendarType = searchParams.get('calendarType');
    const status = searchParams.get('status');

    // Pagination parameters
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate pagination params
    const safeLimit = Math.min(Math.max(1, limit), 1000); // Max 1000 events per request
    const safeOffset = Math.max(0, offset);

    // Build query filters
    const filters = [eq(calendarEvents.userId, user.id)];

    if (startDate) {
      filters.push(gte(calendarEvents.startTime, new Date(startDate)));
    }

    if (endDate) {
      filters.push(lte(calendarEvents.endTime, new Date(endDate)));
    }

    if (calendarType) {
      filters.push(eq(calendarEvents.calendarType, calendarType as any));
    }

    if (status && status !== 'all') {
      filters.push(eq(calendarEvents.status, status as any));
    } else {
      // By default, don't show cancelled events
      filters.push(eq(calendarEvents.status, 'confirmed' as any));
    }

    // Get total count for pagination
    const totalCountQuery = await db
      .select()
      .from(calendarEvents)
      .where(and(...filters));
    const totalCount = totalCountQuery.length;

    // Fetch events with pagination
    const events = await db
      .select()
      .from(calendarEvents)
      .where(and(...filters))
      .orderBy(calendarEvents.startTime)
      .limit(safeLimit)
      .offset(safeOffset);

    const hasMore = (safeOffset + events.length) < totalCount;

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      totalCount,
      hasMore,
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        nextOffset: hasMore ? safeOffset + safeLimit : null,
      },
    });

  } catch (error: any) {
    console.error('❌ Calendar events fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // 🔍 DEBUG: Log incoming request data
    console.log('📥 [Events API] Received event creation request:', {
      calendarId: data.calendarId,
      accountId: data.accountId,
      nylasGrantId: data.nylasGrantId,
      title: data.title,
    });

    // Validate required fields
    if (!data.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!data.startTime) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 });
    }

    if (!data.endTime) {
      return NextResponse.json({ error: 'End time is required' }, { status: 400 });
    }

    // ✅ FIX: Require calendar_id to prevent orphaned events
    if (!data.calendarId) {
      return NextResponse.json({
        error: 'Calendar ID is required. Please select a calendar for this event.'
      }, { status: 400 });
    }
    
    // Validate: Cannot create events in the past
    const startTimeDate = new Date(data.startTime);
    const now = new Date();
    
    if (startTimeDate < now) {
      return NextResponse.json({ 
        error: 'Cannot create events in the past. Please select a future date and time.' 
      }, { status: 400 });
    }
    
    // Get user's calendar account for 2-way sync
    // Priority: nylasGrantId > accountId > primary account
    let targetAccount;

    if (data.nylasGrantId) {
      // Use specific Nylas grant ID (most reliable for calendar targeting)
      const accounts = await db.query.emailAccounts.findMany({
        where: eq(emailAccounts.userId, user.id),
      });
      targetAccount = accounts.find(acc => acc.nylasGrantId === data.nylasGrantId);
      console.log('🔍 [Event Creation] Using nylasGrantId:', data.nylasGrantId, 'Found account:', !!targetAccount);
    } else if (data.accountId) {
      // Fall back to database account ID
      const accounts = await db.query.emailAccounts.findMany({
        where: eq(emailAccounts.userId, user.id),
      });
      targetAccount = accounts.find(acc => acc.id === data.accountId);
      console.log('🔍 [Event Creation] Using accountId:', data.accountId, 'Found account:', !!targetAccount);
    } else {
      // Last resort: primary account
      const accounts = await db.query.emailAccounts.findMany({
        where: eq(emailAccounts.userId, user.id),
      });
      targetAccount = accounts.find(acc =>
        acc.nylasGrantId &&
        (acc.provider === 'google' || acc.provider === 'microsoft') &&
        acc.nylasScopes?.some((s: string) => s.toLowerCase().includes('calendar'))
      );
      console.log('🔍 [Event Creation] Using primary account fallback. Found account:', !!targetAccount);
    }

    const primaryAccount = targetAccount;

    // Create event locally
    const [event] = await db.insert(calendarEvents).values({
      userId: user.id,
      calendarId: data.calendarId, // ✅ FIX: Include calendar_id to prevent orphaned events
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      allDay: data.allDay || false,
      timezone: data.timezone || 'UTC',
      isRecurring: data.isRecurring || false,
      recurrenceRule: data.recurrenceRule || null,
      recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
      calendarType: data.calendarType || 'personal',
      color: data.color || 'blue',
      category: data.category || null,
      organizerEmail: data.organizerEmail || user.email,
      attendees: data.attendees || [],
      reminders: data.reminders || [],
      isPrivate: data.isPrivate || false,
      status: data.status || 'confirmed',
      metadata: data.metadata || {},
    }).returning();

    console.log('✅ Calendar event created locally:', event.id);

    // 2-WAY SYNC: Push event to Google/Microsoft Calendar via Nylas
    if (primaryAccount && !data.skipSync) {
      try {
        console.log('🔍 [Event Creation] Creating sync service with:', {
          primaryAccountId: primaryAccount.id,
          primaryGrantId: primaryAccount.nylasGrantId,
          primaryEmail: primaryAccount.emailAddress,
          provider: primaryAccount.provider,
          requestedCalendarId: data.calendarId,
          fallbackCalendarId: data.calendarId || 'primary',
          willUsePrimary: !data.calendarId,
        });

        const syncService = createCalendarSyncService({
          accountId: primaryAccount.id,
          userId: user.id,
          grantId: primaryAccount.nylasGrantId!,
          provider: primaryAccount.provider as 'google' | 'microsoft',
          calendarId: data.calendarId || 'primary', // Use specified calendar or default to primary
        });

        const pushResult = await syncService.createEvent(event);

        if (pushResult.success && pushResult.eventId) {
          // Update local event with the remote event ID
          const updateField = primaryAccount.provider === 'google'
            ? { googleEventId: pushResult.eventId, googleSyncStatus: 'synced' }
            : { microsoftEventId: pushResult.eventId, microsoftSyncStatus: 'synced' };

          await db.update(calendarEvents)
            .set(updateField)
            .where(eq(calendarEvents.id, event.id));

          console.log(`✅ Event synced to ${primaryAccount.provider} calendar:`, pushResult.eventId);
        } else {
          console.warn('⚠️ Failed to sync event to calendar:', pushResult.error);
        }
      } catch (syncError: any) {
        console.error('⚠️ 2-way sync error:', syncError);
        // Don't fail the request if sync fails - event is still created locally
      }
    }

    // If recurring, generate initial instances
    if (data.isRecurring && event.recurrenceRule) {
      try {
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

        const instancesCreated = await createRecurringInstances(
          event.id,
          new Date(),
          sixMonthsFromNow
        );

        console.log(`✅ Created ${instancesCreated} recurring instances`);
      } catch (recurError) {
        console.error('⚠️ Failed to create recurring instances:', recurError);
        // Don't fail the whole request, just log the error
      }
    }

    // Note: Invitations are now sent via the review modal, not automatically
    // The review modal will call /api/calendar/events/[eventId]/send-invitations

    return NextResponse.json({
      success: true,
      event,
      synced: !!primaryAccount,
    });

  } catch (error: any) {
    console.error('❌ Calendar event creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}

