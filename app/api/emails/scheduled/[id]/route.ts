/**
 * Single Scheduled Email API
 * Get, update, or cancel a specific scheduled email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { scheduledEmails } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET - Get a specific scheduled email
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduled = await db.query.scheduledEmails.findFirst({
      where: and(
        eq(scheduledEmails.id, id),
        eq(scheduledEmails.userId, user.id)
      ),
      with: {
        account: {
          columns: {
            id: true,
            emailAddress: true,
            emailProvider: true,
          },
        },
      },
    });

    if (!scheduled) {
      return NextResponse.json({
        error: 'Scheduled email not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      scheduledEmail: scheduled,
    });
  } catch (error) {
    console.error('[Scheduled Email] Get error:', error);
    return NextResponse.json({
      error: 'Failed to fetch scheduled email',
    }, { status: 500 });
  }
}

/**
 * PATCH - Update a scheduled email
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await db.query.scheduledEmails.findFirst({
      where: and(
        eq(scheduledEmails.id, id),
        eq(scheduledEmails.userId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({
        error: 'Scheduled email not found'
      }, { status: 404 });
    }

    // Can't update if already sent or cancelled
    if (existing.status === 'sent') {
      return NextResponse.json({
        error: 'Cannot update email that has already been sent'
      }, { status: 400 });
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json({
        error: 'Cannot update cancelled email'
      }, { status: 400 });
    }

    // Validate scheduled time if provided
    if (body.scheduledFor) {
      const scheduledDate = new Date(body.scheduledFor);
      const now = new Date();

      if (scheduledDate <= now) {
        return NextResponse.json({
          error: 'Scheduled time must be in the future'
        }, { status: 400 });
      }
    }

    // Update allowed fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.toRecipients !== undefined) updateData.toRecipients = body.toRecipients;
    if (body.cc !== undefined) updateData.cc = body.cc;
    if (body.bcc !== undefined) updateData.bcc = body.bcc;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.bodyHtml !== undefined) updateData.bodyHtml = body.bodyHtml;
    if (body.bodyText !== undefined) updateData.bodyText = body.bodyText;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;
    if (body.scheduledFor !== undefined) updateData.scheduledFor = new Date(body.scheduledFor);
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.trackOpens !== undefined) updateData.trackOpens = body.trackOpens;
    if (body.trackClicks !== undefined) updateData.trackClicks = body.trackClicks;

    const [updated] = await db
      .update(scheduledEmails)
      .set(updateData)
      .where(eq(scheduledEmails.id, id))
      .returning();

    console.log('[Scheduled Email] Updated:', id);

    return NextResponse.json({
      success: true,
      scheduledEmail: updated,
    });
  } catch (error) {
    console.error('[Scheduled Email] Update error:', error);
    return NextResponse.json({
      error: 'Failed to update scheduled email',
    }, { status: 500 });
  }
}

/**
 * DELETE - Cancel a scheduled email
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await db.query.scheduledEmails.findFirst({
      where: and(
        eq(scheduledEmails.id, id),
        eq(scheduledEmails.userId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({
        error: 'Scheduled email not found'
      }, { status: 404 });
    }

    // Can't cancel if already sent
    if (existing.status === 'sent') {
      return NextResponse.json({
        error: 'Cannot cancel email that has already been sent'
      }, { status: 400 });
    }

    // Mark as cancelled instead of deleting
    const [cancelled] = await db
      .update(scheduledEmails)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(scheduledEmails.id, id))
      .returning();

    console.log('[Scheduled Email] Cancelled:', id);

    return NextResponse.json({
      success: true,
      scheduledEmail: cancelled,
    });
  } catch (error) {
    console.error('[Scheduled Email] Cancel error:', error);
    return NextResponse.json({
      error: 'Failed to cancel scheduled email',
    }, { status: 500 });
  }
}
