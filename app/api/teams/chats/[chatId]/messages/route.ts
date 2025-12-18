// Teams Chat Messages API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsChats, teamsMessages, teamsAccounts } from '@/lib/db/schema';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import {
  sendTeamsMessage,
  markTeamsChatAsRead,
  deleteTeamsMessage,
  editTeamsMessage,
  incrementalSyncChat,
} from '@/lib/teams/teams-sync';

export const dynamic = 'force-dynamic';

// GET - Get messages for a chat
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Cursor for pagination
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const skipSync = searchParams.get('skipSync') === 'true';

    // Verify chat ownership
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

    // Sync messages from Microsoft Graph before returning
    // This ensures we have the latest messages
    if (!skipSync) {
      try {
        console.log(`Syncing messages for chat ${chatId}...`);
        const syncResult = await incrementalSyncChat(chat[0].teamsAccountId, chatId);
        console.log(`Sync result: added=${syncResult.messagesAdded}, updated=${syncResult.messagesUpdated}`);
      } catch (syncError) {
        // Log but don't fail - still return cached messages
        console.error('Error syncing messages:', syncError);
      }
    }

    // Build query conditions
    const conditions = [eq(teamsMessages.chatId, chatId)];

    if (!includeDeleted) {
      conditions.push(eq(teamsMessages.isDeleted, false));
    }

    if (before) {
      // Get message timestamp for cursor-based pagination
      const cursorMessage = await db
        .select({ teamsCreatedAt: teamsMessages.teamsCreatedAt })
        .from(teamsMessages)
        .where(eq(teamsMessages.id, before))
        .limit(1);

      if (cursorMessage.length && cursorMessage[0].teamsCreatedAt) {
        conditions.push(
          sql`${teamsMessages.teamsCreatedAt} < ${cursorMessage[0].teamsCreatedAt}`
        );
      }
    }

    // Get messages (newest first for pagination, will reverse for display)
    const messages = await db
      .select({
        id: teamsMessages.id,
        teamsMessageId: teamsMessages.teamsMessageId,
        senderId: teamsMessages.senderId,
        senderName: teamsMessages.senderName,
        senderEmail: teamsMessages.senderEmail,
        body: teamsMessages.body,
        bodyType: teamsMessages.bodyType,
        messageType: teamsMessages.messageType,
        importance: teamsMessages.importance,
        hasAttachments: teamsMessages.hasAttachments,
        attachments: teamsMessages.attachments,
        mentions: teamsMessages.mentions,
        reactions: teamsMessages.reactions,
        isRead: teamsMessages.isRead,
        isDeleted: teamsMessages.isDeleted,
        isEdited: teamsMessages.isEdited,
        teamsCreatedAt: teamsMessages.teamsCreatedAt,
        teamsModifiedAt: teamsMessages.teamsModifiedAt,
        replyToMessageId: teamsMessages.replyToMessageId,
      })
      .from(teamsMessages)
      .where(and(...conditions))
      .orderBy(desc(teamsMessages.teamsCreatedAt))
      .limit(limit + 1); // Fetch one extra to check if there are more

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // Reverse for chronological display order
    resultMessages.reverse();

    return NextResponse.json({
      messages: resultMessages,
      chat: {
        id: chat[0].id,
        chatType: chat[0].chatType,
        topic: chat[0].topic,
        participants: chat[0].participants,
        otherParticipantName: chat[0].otherParticipantName,
      },
      pagination: {
        hasMore,
        nextCursor: hasMore ? resultMessages[0]?.id : null,
      },
    });
  } catch (error) {
    console.error('Error fetching Teams messages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { content, contentType, importance } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Get chat with account info
    const chat = await db
      .select({
        id: teamsChats.id,
        teamsChatId: teamsChats.teamsChatId,
        teamsAccountId: teamsChats.teamsAccountId,
        userId: teamsChats.userId,
      })
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

    // Send message via Teams API
    const result = await sendTeamsMessage(
      chat[0].teamsAccountId,
      chat[0].teamsChatId,
      content,
      { contentType, importance }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending Teams message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}

// PATCH - Mark chat as read or edit a message
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { action, messageId, content } = body;

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

    if (action === 'markAsRead') {
      // Mark chat as read
      const result = await markTeamsChatAsRead(
        chat[0].teamsAccountId,
        chat[0].teamsChatId
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'editMessage' && messageId && content) {
      // Edit a message
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

      const result = await editTeamsMessage(
        chat[0].teamsAccountId,
        chat[0].teamsChatId,
        message[0].teamsMessageId,
        content
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating Teams chat/message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a message
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
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

    // Delete message via Teams API
    const result = await deleteTeamsMessage(
      chat[0].teamsAccountId,
      chat[0].teamsChatId,
      message[0].teamsMessageId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Teams message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete message' },
      { status: 500 }
    );
  }
}
