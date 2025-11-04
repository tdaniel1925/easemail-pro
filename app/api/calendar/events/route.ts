/**
 * Calendar Events API
 * GET - List events
 * POST - Create event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { createRecurringInstances } from '@/lib/calendar/recurring-events';

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
    
    // Fetch events
    const events = await db
      .select()
      .from(calendarEvents)
      .where(and(...filters))
      .orderBy(calendarEvents.startTime)
      .limit(500);
    
    return NextResponse.json({
      success: true,
      events,
      count: events.length,
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
    
    // Create event
    const [event] = await db.insert(calendarEvents).values({
      userId: user.id,
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
    
    console.log('✅ Calendar event created:', event.id);
    
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
    
    return NextResponse.json({
      success: true,
      event,
    });

  } catch (error: any) {
    console.error('❌ Calendar event creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}

