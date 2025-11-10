/**
 * Scheduled Emails API
 * Create, list, update, and cancel scheduled emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { scheduledEmails, emailAccounts } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST - Schedule a new email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      toRecipients,
      cc,
      bcc,
      subject,
      bodyHtml,
      bodyText,
      attachments,
      scheduledFor,
      timezone = 'UTC',
      trackOpens = true,
      trackClicks = true,
      draftId,
    } = body;

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }

    // 3. Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledFor);
    const now = new Date();

    if (scheduledDate <= now) {
      return NextResponse.json({
        error: 'Scheduled time must be in the future'
      }, { status: 400 });
    }

    // 4. Validate recipients
    if (!toRecipients || toRecipients.length === 0) {
      return NextResponse.json({
        error: 'At least one recipient is required'
      }, { status: 400 });
    }

    // 5. Create scheduled email
    const [scheduled] = await db.insert(scheduledEmails).values({
      userId: user.id,
      accountId,
      draftId: draftId || null,
      toRecipients,
      cc: cc || null,
      bcc: bcc || null,
      subject: subject || null,
      bodyHtml: bodyHtml || null,
      bodyText: bodyText || null,
      attachments: attachments || null,
      scheduledFor: scheduledDate,
      timezone,
      trackOpens,
      trackClicks,
      status: 'pending',
    }).returning();

    console.log('[Scheduled Email] Created:', scheduled.id);

    return NextResponse.json({
      success: true,
      scheduledEmail: scheduled,
    });
  } catch (error) {
    console.error('[Scheduled Email] Create error:', error);
    return NextResponse.json({
      error: 'Failed to schedule email',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET - List scheduled emails for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // Get scheduled emails
    const scheduled = await db.query.scheduledEmails.findMany({
      where: and(
        eq(scheduledEmails.userId, user.id),
        status === 'all' ? undefined : eq(scheduledEmails.status, status)
      ),
      orderBy: (scheduledEmails, { asc }) => [asc(scheduledEmails.scheduledFor)],
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

    return NextResponse.json({
      success: true,
      scheduledEmails: scheduled,
    });
  } catch (error) {
    console.error('[Scheduled Email] List error:', error);
    return NextResponse.json({
      error: 'Failed to fetch scheduled emails',
    }, { status: 500 });
  }
}
