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
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'Invalid message IDs' }, { status: 400 });
    }

    // Mark messages as read
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

