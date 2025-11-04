/**
 * Individual Calendar Event API
 * GET - Get event details
 * PATCH - Update event
 * DELETE - Delete event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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
    
    console.log('✅ Calendar event updated:', event.id);
    
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
    
    // Delete event
    await db.delete(calendarEvents)
      .where(and(
        eq(calendarEvents.id, params.eventId),
        eq(calendarEvents.userId, user.id)
      ));
    
    console.log('✅ Calendar event deleted:', params.eventId);
    
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Calendar event deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', details: error.message },
      { status: 500 }
    );
  }
}

