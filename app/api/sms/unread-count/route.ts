import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count unread inbound SMS messages
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.userId, user.id),
          eq(smsMessages.direction, 'inbound'),
          eq(smsMessages.isRead, false)
        )
      );

    const count = result[0]?.count || 0;

    return NextResponse.json({
      success: true,
      count,
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch unread SMS count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread SMS count', details: error.message },
      { status: 500 }
    );
  }
}

