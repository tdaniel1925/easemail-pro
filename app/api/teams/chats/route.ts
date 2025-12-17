// Teams Chats API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts, teamsChats } from '@/lib/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { createTeamsChat } from '@/lib/teams/teams-sync';

// GET - List all chats for user's Teams accounts
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Build query conditions
    const conditions = [eq(teamsChats.userId, user.id)];

    if (accountId) {
      conditions.push(eq(teamsChats.teamsAccountId, accountId));
    }

    if (!includeArchived) {
      conditions.push(eq(teamsChats.isArchived, false));
    }

    // Get chats with account info
    const chats = await db
      .select({
        id: teamsChats.id,
        teamsAccountId: teamsChats.teamsAccountId,
        teamsChatId: teamsChats.teamsChatId,
        chatType: teamsChats.chatType,
        topic: teamsChats.topic,
        webUrl: teamsChats.webUrl,
        participants: teamsChats.participants,
        otherParticipantName: teamsChats.otherParticipantName,
        otherParticipantEmail: teamsChats.otherParticipantEmail,
        lastMessageAt: teamsChats.lastMessageAt,
        lastMessagePreview: teamsChats.lastMessagePreview,
        lastMessageSenderName: teamsChats.lastMessageSenderName,
        unreadCount: teamsChats.unreadCount,
        isPinned: teamsChats.isPinned,
        isMuted: teamsChats.isMuted,
        isArchived: teamsChats.isArchived,
        accountEmail: teamsAccounts.email,
        accountDisplayName: teamsAccounts.displayName,
      })
      .from(teamsChats)
      .innerJoin(teamsAccounts, eq(teamsChats.teamsAccountId, teamsAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(teamsChats.isPinned), desc(teamsChats.lastMessageAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamsChats)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      chats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + chats.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching Teams chats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST - Create a new chat
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, type, memberIds, topic } = body;

    if (!accountId || !type || !memberIds?.length) {
      return NextResponse.json(
        { error: 'Account ID, type, and member IDs are required' },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await db
      .select()
      .from(teamsAccounts)
      .where(
        and(
          eq(teamsAccounts.id, accountId),
          eq(teamsAccounts.userId, user.id)
        )
      )
      .limit(1);

    if (!account.length) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Create chat via Teams API
    const result = await createTeamsChat(accountId, {
      type,
      memberIds,
      topic,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, chatId: result.chatId });
  } catch (error) {
    console.error('Error creating Teams chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create chat' },
      { status: 500 }
    );
  }
}

// PATCH - Update chat settings (pin, mute, archive)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, isPinned, isMuted, isArchived } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (typeof isPinned === 'boolean') updateData.isPinned = isPinned;
    if (typeof isMuted === 'boolean') updateData.isMuted = isMuted;
    if (typeof isArchived === 'boolean') updateData.isArchived = isArchived;

    const result = await db
      .update(teamsChats)
      .set(updateData)
      .where(
        and(
          eq(teamsChats.id, chatId),
          eq(teamsChats.userId, user.id)
        )
      )
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, chat: result[0] });
  } catch (error) {
    console.error('Error updating Teams chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update chat' },
      { status: 500 }
    );
  }
}
