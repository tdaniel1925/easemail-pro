/**
 * Preview Calendar Invitation API
 * POST /api/calendar/events/preview-invitation
 * Generate preview HTML for calendar invitation email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalendarInvitationTemplate } from '@/lib/email/templates/calendar-invitation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { event, organizer, attendee, customMessage } = data;

    if (!event || !organizer || !attendee) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    
    // Use placeholder links for preview
    const placeholderLinks = {
      accept: `${baseUrl}/api/calendar/events/preview/rsvp?response=accepted`,
      decline: `${baseUrl}/api/calendar/events/preview/rsvp?response=declined`,
      tentative: `${baseUrl}/api/calendar/events/preview/rsvp?response=tentative`,
    };

    const html = getCalendarInvitationTemplate({
      eventTitle: event.title,
      eventDescription: event.description || undefined,
      eventLocation: event.location || undefined,
      startDate: new Date(event.startTime),
      endDate: new Date(event.endTime),
      allDay: event.allDay || false,
      organizerName: organizer.name,
      organizerEmail: organizer.email,
      attendeeEmail: attendee.email,
      attendeeName: attendee.name,
      rsvpAcceptLink: placeholderLinks.accept,
      rsvpDeclineLink: placeholderLinks.decline,
      rsvpTentativeLink: placeholderLinks.tentative,
      timezone: event.timezone || undefined,
      customMessage: customMessage || undefined,
    });

    return NextResponse.json({ html });
  } catch (error: any) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: error.message },
      { status: 500 }
    );
  }
}

