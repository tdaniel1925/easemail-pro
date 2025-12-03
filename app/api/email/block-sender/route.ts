import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { blockedSenders, emails } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, senderEmail, senderName, deleteExisting } = await request.json();

    if (!accountId || !senderEmail) {
      return NextResponse.json(
        { error: 'Account ID and sender email are required' },
        { status: 400 }
      );
    }

    // Check if already blocked
    const existing = await db
      .select()
      .from(blockedSenders)
      .where(
        and(
          eq(blockedSenders.userId, user.id),
          eq(blockedSenders.senderEmail, senderEmail.toLowerCase())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Sender is already blocked' },
        { status: 400 }
      );
    }

    // Add to blocked list
    await db.insert(blockedSenders).values({
      userId: user.id,
      accountId,
      senderEmail: senderEmail.toLowerCase(),
      senderName: senderName || null,
      blockedAt: new Date(),
    });

    // Optionally trash existing emails from this sender
    let deletedCount = 0;
    if (deleteExisting) {
      const result = await db
        .update(emails)
        .set({
          isTrashed: true,
        })
        .where(
          and(
            eq(emails.accountId, accountId),
            eq(emails.fromEmail, senderEmail.toLowerCase())
          )
        );
      // Drizzle PostgreSQL returns an array, so check count manually
      deletedCount = Array.isArray(result) ? result.length : 0;
    }

    return NextResponse.json({
      success: true,
      message: `Blocked ${senderEmail}`,
      deletedEmails: deletedCount,
    });
  } catch (error) {
    console.error('Error blocking sender:', error);
    return NextResponse.json(
      { error: 'Failed to block sender' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blocked = await db
      .select()
      .from(blockedSenders)
      .where(eq(blockedSenders.userId, user.id))
      .orderBy(blockedSenders.blockedAt);

    return NextResponse.json({
      success: true,
      blockedSenders: blocked,
    });
  } catch (error) {
    console.error('Error fetching blocked senders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked senders' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { senderEmail } = await request.json();

    if (!senderEmail) {
      return NextResponse.json(
        { error: 'Sender email is required' },
        { status: 400 }
      );
    }

    await db
      .delete(blockedSenders)
      .where(
        and(
          eq(blockedSenders.userId, user.id),
          eq(blockedSenders.senderEmail, senderEmail.toLowerCase())
        )
      );

    return NextResponse.json({
      success: true,
      message: `Unblocked ${senderEmail}`,
    });
  } catch (error) {
    console.error('Error unblocking sender:', error);
    return NextResponse.json(
      { error: 'Failed to unblock sender' },
      { status: 500 }
    );
  }
}
