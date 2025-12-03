import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { mutedConversations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, threadId, mutedUntil } = await request.json();

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      );
    }

    // Check if already muted
    const existing = await db
      .select()
      .from(mutedConversations)
      .where(
        and(
          eq(mutedConversations.userId, user.id),
          eq(mutedConversations.threadId, threadId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing mute
      await db
        .update(mutedConversations)
        .set({
          mutedAt: new Date(),
          mutedUntil: mutedUntil ? new Date(mutedUntil) : null,
        })
        .where(eq(mutedConversations.id, existing[0].id));
    } else {
      // Create new mute
      await db.insert(mutedConversations).values({
        userId: user.id,
        accountId: accountId || null,
        threadId,
        mutedAt: new Date(),
        mutedUntil: mutedUntil ? new Date(mutedUntil) : null,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation muted',
    });
  } catch (error) {
    console.error('Error muting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to mute conversation' },
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

    const { threadId } = await request.json();

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(mutedConversations)
      .where(
        and(
          eq(mutedConversations.userId, user.id),
          eq(mutedConversations.threadId, threadId)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Conversation unmuted',
    });
  } catch (error) {
    console.error('Error unmuting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to unmute conversation' },
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

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (threadId) {
      // Check if specific thread is muted
      const muted = await db
        .select()
        .from(mutedConversations)
        .where(
          and(
            eq(mutedConversations.userId, user.id),
            eq(mutedConversations.threadId, threadId)
          )
        )
        .limit(1);

      const isMuted = muted.length > 0 && (
        !muted[0].mutedUntil || new Date(muted[0].mutedUntil) > new Date()
      );

      return NextResponse.json({
        success: true,
        isMuted,
        mutedUntil: muted[0]?.mutedUntil || null,
      });
    }

    // Get all muted conversations
    const muted = await db
      .select()
      .from(mutedConversations)
      .where(eq(mutedConversations.userId, user.id));

    // Filter out expired mutes
    const activeMutes = muted.filter(m =>
      !m.mutedUntil || new Date(m.mutedUntil) > new Date()
    );

    return NextResponse.json({
      success: true,
      mutedConversations: activeMutes,
    });
  } catch (error) {
    console.error('Error fetching muted conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch muted conversations' },
      { status: 500 }
    );
  }
}
