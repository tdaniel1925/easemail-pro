/**
 * Send Calendar Invitations API
 * POST /api/calendar/events/[eventId]/send-invitations
 * Send invitation emails to event attendees with optional customizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendCalendarInvitations } from '@/lib/calendar/invitation-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      customMessage,
      personalNotes,
      subjectOverride,
      attendees,
    } = data;

    // Get event
    const event = await db.query.calendarEvents.findFirst({
      where: and(
        eq(calendarEvents.id, params.eventId),
        eq(calendarEvents.userId, user.id)
      ),
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get user details for organizer
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    const organizerName = dbUser?.fullName || dbUser?.email || user.email || 'Event Organizer';
    const organizerEmail = event.organizerEmail || user.email || '';

    // Use provided attendees or event attendees
    const attendeesToInvite = attendees && Array.isArray(attendees) && attendees.length > 0
      ? attendees
      : (event.attendees as Array<{ email: string; name?: string }> || []);

    if (attendeesToInvite.length === 0) {
      return NextResponse.json({ 
        error: 'No attendees to invite' 
      }, { status: 400 });
    }

    // Update event with new attendees if provided
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
      await db.update(calendarEvents)
        .set({
          attendees: attendees.map((a: any) => ({
            email: a.email,
            name: a.name || undefined,
            status: 'pending' as const,
          })),
          metadata: {
            ...(event.metadata as any || {}),
            invitationNotes: personalNotes || undefined,
            customInvitationMessage: customMessage || undefined,
            invitationSentAt: new Date().toISOString(),
            invitationSubjectOverride: subjectOverride || undefined,
          },
        })
        .where(eq(calendarEvents.id, params.eventId));
    } else {
      // Just update metadata
      await db.update(calendarEvents)
        .set({
          metadata: {
            ...(event.metadata as any || {}),
            invitationNotes: personalNotes || undefined,
            customInvitationMessage: customMessage || undefined,
            invitationSentAt: new Date().toISOString(),
            invitationSubjectOverride: subjectOverride || undefined,
          },
        })
        .where(eq(calendarEvents.id, params.eventId));
    }

    // Send invitations
    const invitationResult = await sendCalendarInvitations(
      {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        allDay: event.allDay,
        timezone: event.timezone,
        organizerEmail: event.organizerEmail,
        attendees: attendeesToInvite,
        recurrenceRule: event.recurrenceRule,
      },
      {
        name: organizerName,
        email: organizerEmail,
      },
      {
        customMessage,
        subjectOverride,
      }
    );

    if (invitationResult.errors > 0) {
      return NextResponse.json({
        success: true,
        sent: invitationResult.sent,
        errors: invitationResult.errors,
        warning: `Sent ${invitationResult.sent} invitations, ${invitationResult.errors} failed`,
      });
    }

    return NextResponse.json({
      success: true,
      sent: invitationResult.sent,
      errors: invitationResult.errors,
      message: `Successfully sent ${invitationResult.sent} invitation(s)`,
    });

  } catch (error: any) {
    console.error('❌ Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations', details: error.message },
      { status: 500 }
    );
  }
}

