import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageIds, markAll, phoneNumber } = body;

    // Handle mark all messages as read
    if (markAll) {
      await db
        .update(smsMessages)
        .set({ isRead: true, updatedAt: new Date() })
        .where(
          and(
            eq(smsMessages.userId, user.id),
            eq(smsMessages.direction, 'inbound')
          )
        );

      console.log('✅ Marked all SMS messages as read');

      return NextResponse.json({
        success: true,
        message: 'All messages marked as read',
      });
    }

    // Handle mark messages from specific phone number as read
    if (phoneNumber) {
      await db
        .update(smsMessages)
        .set({ isRead: true, updatedAt: new Date() })
        .where(
          and(
            eq(smsMessages.userId, user.id),
            eq(smsMessages.fromPhone, phoneNumber),
            eq(smsMessages.direction, 'inbound')
          )
        );

      console.log(`✅ Marked all messages from ${phoneNumber} as read`);

      return NextResponse.json({
        success: true,
        message: 'Messages marked as read',
      });
    }

    // Handle mark specific messages as read
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request: provide messageIds, markAll, or phoneNumber' }, { status: 400 });
    }

    await db
      .update(smsMessages)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(smsMessages.userId, user.id),
          inArray(smsMessages.id, messageIds)
        )
      );

    console.log(`✅ Marked ${messageIds.length} SMS message(s) as read`);

    return NextResponse.json({
      success: true,
      markedCount: messageIds.length,
    });

  } catch (error: any) {
    console.error('❌ Failed to mark SMS as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read', details: error.message },
      { status: 500 }
    );
  }
}

