import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import ICAL from 'ical.js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { icsData, accountId, messageId, response } = body;

    if (!icsData) {
      return NextResponse.json(
        { success: false, error: 'Missing ICS data' },
        { status: 400 }
      );
    }

    console.log('[Parse ICS] Parsing ICS file for user:', user.id);

    // Parse the ICS data using ical.js
    let jcalData;
    try {
      jcalData = ICAL.parse(icsData);
    } catch (parseError) {
      console.error('[Parse ICS] Error parsing ICS data:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid ICS file format' },
        { status: 400 }
      );
    }

    const comp = new ICAL.Component(jcalData);
    const vevent = comp.getFirstSubcomponent('vevent');

    if (!vevent) {
      return NextResponse.json(
        { success: false, error: 'No event found in ICS file' },
        { status: 400 }
      );
    }

    // Extract event details
    const event = new ICAL.Event(vevent);

    const eventData = {
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      location: event.location || '',
      startTime: event.startDate?.toJSDate() || new Date(),
      endTime: event.endDate?.toJSDate() || new Date(),
      organizer: event.organizer || '',
      attendees: event.attendees.map((att: any) => att.toString()) || [],
      uid: event.uid || '',
      status: response || 'tentative', // accepted, declined, tentative
    };

    console.log('[Parse ICS] Extracted event data:', {
      title: eventData.title,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
    });

    // Create calendar event via Nylas API
    if (accountId && response === 'accepted') {
      try {
        console.log('[Parse ICS] Creating calendar event via Nylas...');

        const createEventResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nylas-v3/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            event: {
              title: eventData.title,
              description: eventData.description,
              location: eventData.location,
              when: {
                start_time: Math.floor(eventData.startTime.getTime() / 1000),
                end_time: Math.floor(eventData.endTime.getTime() / 1000),
              },
              participants: eventData.attendees.map(email => ({
                email: email.replace('mailto:', ''),
                status: 'yes',
              })),
            },
          }),
        });

        const createEventData = await createEventResponse.json();

        if (createEventData.success) {
          console.log('[Parse ICS] Calendar event created successfully');
          return NextResponse.json({
            success: true,
            event: eventData,
            calendarEventId: createEventData.event?.id,
            message: 'Meeting invitation accepted and added to calendar',
          });
        } else {
          console.error('[Parse ICS] Failed to create calendar event:', createEventData.error);
        }
      } catch (eventError) {
        console.error('[Parse ICS] Error creating calendar event:', eventError);
      }
    }

    // Return parsed event data even if calendar creation failed
    return NextResponse.json({
      success: true,
      event: eventData,
      message: response === 'declined'
        ? 'Meeting invitation declined'
        : response === 'tentative'
        ? 'Meeting invitation marked as tentative'
        : 'Meeting invitation parsed successfully',
    });

  } catch (error) {
    console.error('[Parse ICS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse ICS file',
      },
      { status: 500 }
    );
  }
}
