import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { userEmailTemplates } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Increment usage count and update lastUsedAt
    await db
      .update(userEmailTemplates)
      .set({
        timesUsed: sql`${userEmailTemplates.timesUsed} + 1`,
        lastUsedAt: new Date(),
      })
      .where(
        and(
          eq(userEmailTemplates.id, id),
          eq(userEmailTemplates.userId, user.id)
        )
      );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error tracking template usage:', error);
    return NextResponse.json(
      { error: 'Failed to track template usage' },
      { status: 500 }
    );
  }
}
