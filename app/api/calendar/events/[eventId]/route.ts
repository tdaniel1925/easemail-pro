/**
 * Individual Calendar Event API
 * GET - Get event details
 * PATCH - Update event (with 2-way sync to Google/Microsoft Calendar)
 * DELETE - Delete event (with 2-way sync to Google/Microsoft Calendar)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createCalendarSyncService } from '@/lib/services/calendar-sync-service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    eventId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await db.query.calendarEvents.findFirst({
      where: and(
        eq(calendarEvents.id, params.eventId),
        eq(calendarEvents.userId, user.id)
      )
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, event });

  } catch (error: any) {
    console.error('❌ Calendar event fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Check event exists and belongs to user
    const existingEvent = await db.query.calendarEvents.findFirst({
      where: and(
        eq(calendarEvents.id, params.eventId),
        eq(calendarEvents.userId, user.id)
      )
    });
    
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Build update object
    const updates: any = {
      updatedAt: new Date(),
    };
    
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.location !== undefined) updates.location = data.location;
    if (data.startTime !== undefined) updates.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updates.endTime = new Date(data.endTime);
    if (data.allDay !== undefined) updates.allDay = data.allDay;
    if (data.timezone !== undefined) updates.timezone = data.timezone;
    if (data.isRecurring !== undefined) updates.isRecurring = data.isRecurring;
    if (data.recurrenceRule !== undefined) updates.recurrenceRule = data.recurrenceRule;
    if (data.recurrenceEndDate !== undefined) updates.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
    if (data.calendarType !== undefined) updates.calendarType = data.calendarType;
    if (data.color !== undefined) updates.color = data.color;
    if (data.category !== undefined) updates.category = data.category;
    if (data.attendees !== undefined) updates.attendees = data.attendees;
    if (data.reminders !== undefined) updates.reminders = data.reminders;
    if (data.isPrivate !== undefined) updates.isPrivate = data.isPrivate;
    if (data.status !== undefined) updates.status = data.status;
    
    // Update event
    const [event] = await db.update(calendarEvents)
      .set(updates)
      .where(and(
        eq(calendarEvents.id, params.eventId),
        eq(calendarEvents.userId, user.id)
      ))
      .returning();

    console.log('✅ Calendar event updated locally:', event.id);

    // 2-WAY SYNC: Push updates to Google/Microsoft Calendar via Nylas
    if (!data.skipSync) {
      try {
        // Determine which provider to sync with
        const remoteEventId = existingEvent.googleEventId || existingEvent.microsoftEventId;
        const provider = existingEvent.googleEventId ? 'google' : 'microsoft';

        if (remoteEventId) {
          // Get user's account
          const accounts = await db.query.emailAccounts.findMany({
            where: eq(emailAccounts.userId, user.id),
          });

          const syncAccount = accounts.find(acc =>
            acc.provider === provider &&
            acc.nylasGrantId &&
            acc.nylasScopes?.some((s: string) => s.toLowerCase().includes('calendar'))
          );

          if (syncAccount) {
            const syncService = createCalendarSyncService({
              accountId: syncAccount.id,
              userId: user.id,
              grantId: syncAccount.nylasGrantId!,
              provider: provider as 'google' | 'microsoft',
            });

            const pushResult = await syncService.updateEvent(remoteEventId, event);

            if (pushResult.success) {
              console.log(`✅ Event synced to ${provider} calendar:`, remoteEventId);
            } else {
              console.warn('⚠️ Failed to sync event update:', pushResult.error);
            }
          }
        }
      } catch (syncError: any) {
        console.error('⚠️ 2-way sync error:', syncError);
        // Don't fail the request if sync fails - event is still updated locally
      }
    }

    return NextResponse.json({ success: true, event });

  } catch (error: any) {
    console.error('❌ Calendar event update error:', error);
    return NextResponse.json(
      { error: 'Failed to update event', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check event exists and belongs to user
    const existingEvent = await db.query.calendarEvents.findFirst({
      where: and(
        eq(calendarEvents.id, params.eventId),
        eq(calendarEvents.userId, user.id)
      )
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 2-WAY SYNC: Delete from Google/Microsoft Calendar via Nylas BEFORE deleting locally
    const searchParams = new URL(request.url).searchParams;
    const skipSync = searchParams.get('skipSync') === 'true';

    if (!skipSync) {
      try {
        const remoteEventId = existingEvent.googleEventId || existingEvent.microsoftEventId;
        const provider = existingEvent.googleEventId ? 'google' : 'microsoft';

        if (remoteEventId) {
          // Get user's account
          const accounts = await db.query.emailAccounts.findMany({
            where: eq(emailAccounts.userId, user.id),
          });

          const syncAccount = accounts.find(acc =>
            acc.provider === provider &&
            acc.nylasGrantId &&
            acc.nylasScopes?.some((s: string) => s.toLowerCase().includes('calendar'))
          );

          if (syncAccount) {
            const syncService = createCalendarSyncService({
              accountId: syncAccount.id,
              userId: user.id,
              grantId: syncAccount.nylasGrantId!,
              provider: provider as 'google' | 'microsoft',
            });

            const deleteResult = await syncService.deleteEvent(remoteEventId);

            if (deleteResult.success) {
              console.log(`✅ Event deleted from ${provider} calendar:`, remoteEventId);
            } else {
              console.warn('⚠️ Failed to delete event from calendar:', deleteResult.error);
            }
          }
        }
      } catch (syncError: any) {
        console.error('⚠️ 2-way sync deletion error:', syncError);
        // Continue with local deletion even if remote deletion fails
      }
    }

    // Delete event locally
    await db.delete(calendarEvents)
      .where(and(
        eq(calendarEvents.id, params.eventId),
        eq(calendarEvents.userId, user.id)
      ));

    console.log('✅ Calendar event deleted locally:', params.eventId);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Calendar event deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', details: error.message },
      { status: 500 }
    );
  }
}

