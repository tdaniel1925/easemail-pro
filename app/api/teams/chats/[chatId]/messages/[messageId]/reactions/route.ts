// Teams Message Reactions API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsChats, teamsMessages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { addTeamsReaction, removeTeamsReaction } from '@/lib/teams/teams-sync';

export const dynamic = 'force-dynamic';

// POST - Add a reaction
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, messageId } = await params;
    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType) {
      return NextResponse.json({ error: 'Reaction type is required' }, { status: 400 });
    }

    // Get chat info
    const chat = await db
      .select()
      .from(teamsChats)
      .where(
        and(
          eq(teamsChats.id, chatId),
          eq(teamsChats.userId, user.id)
        )
      )
      .limit(1);

    if (!chat.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get message info
    const message = await db
      .select()
      .from(teamsMessages)
      .where(
        and(
          eq(teamsMessages.id, messageId),
          eq(teamsMessages.chatId, chatId)
        )
      )
      .limit(1);

    if (!message.length) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Add reaction via Teams API
    const result = await addTeamsReaction(
      chat[0].teamsAccountId,
      chat[0].teamsChatId,
      message[0].teamsMessageId,
      reactionType
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding Teams reaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a reaction
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, messageId } = await params;
    const { searchParams } = new URL(request.url);
    const reactionType = searchParams.get('reactionType');

    if (!reactionType) {
      return NextResponse.json({ error: 'Reaction type is required' }, { status: 400 });
    }

    // Get chat info
    const chat = await db
      .select()
      .from(teamsChats)
      .where(
        and(
          eq(teamsChats.id, chatId),
          eq(teamsChats.userId, user.id)
        )
      )
      .limit(1);

    if (!chat.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get message info
    const message = await db
      .select()
      .from(teamsMessages)
      .where(
        and(
          eq(teamsMessages.id, messageId),
          eq(teamsMessages.chatId, chatId)
        )
      )
      .limit(1);

    if (!message.length) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Remove reaction via Teams API
    const result = await removeTeamsReaction(
      chat[0].teamsAccountId,
      chat[0].teamsChatId,
      message[0].teamsMessageId,
      reactionType
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing Teams reaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
