/**
 * MS Graph Chats API
 *
 * GET /api/ms-graph/chats - List user's chats
 * GET /api/ms-graph/chats?chatId=xxx - Get messages for a chat
 * POST /api/ms-graph/chats - Send a message to a chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { msGraphAccounts, msChatsCache, msMessagesCache } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { MSGraphTeamsClient, refreshAccessToken } from '@/lib/ms-graph/client';

async function getValidAccessToken(account: any): Promise<string> {
  const tokenExpiresAt = new Date(account.tokenExpiresAt);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (tokenExpiresAt > fiveMinutesFromNow) {
    return account.accessToken;
  }

  console.log('[MS Graph Chats] Refreshing access token...');
  const newTokens = await refreshAccessToken(account.refreshToken);

  await db.update(msGraphAccounts)
    .set({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
      refreshFailures: 0,
      updatedAt: new Date(),
    })
    .where(eq(msGraphAccounts.id, account.id));

  return newTokens.accessToken;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const msAccount = await db.query.msGraphAccounts.findFirst({
      where: eq(msGraphAccounts.userId, user.id),
    });

    if (!msAccount) {
      return NextResponse.json(
        { error: 'MS Teams not connected' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    if (chatId) {
      // Get messages for a specific chat
      console.log('[MS Graph Chats] Getting messages for chat:', chatId);
      const messages = await teamsClient.getChatMessages(chatId, 50);

      // Get current user to mark "from me" messages
      const me = await teamsClient.getMe();

      // Cache messages in database
      const chatCache = await db.query.msChatsCache.findFirst({
        where: and(
          eq(msChatsCache.msAccountId, msAccount.id),
          eq(msChatsCache.msChatId, chatId)
        ),
      });

      if (chatCache) {
        for (const message of messages) {
          await db.insert(msMessagesCache)
            .values({
              msAccountId: msAccount.id,
              chatCacheId: chatCache.id,
              msMessageId: message.id,
              contentType: message.body.contentType,
              content: message.body.content,
              senderUserId: message.from?.user?.id,
              senderDisplayName: message.from?.user?.displayName,
              hasAttachments: (message.attachments?.length || 0) > 0,
              attachments: message.attachments,
              isFromMe: message.from?.user?.id === me.id,
              messageDateTime: new Date(message.createdDateTime),
            })
            .onConflictDoNothing();
        }
      }

      // Format messages for response
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.body.content,
        contentType: msg.body.contentType,
        sender: {
          id: msg.from?.user?.id,
          displayName: msg.from?.user?.displayName,
        },
        attachments: msg.attachments,
        createdDateTime: msg.createdDateTime,
        isFromMe: msg.from?.user?.id === me.id,
      }));

      return NextResponse.json({
        success: true,
        messages: formattedMessages,
      });
    } else {
      // Get all chats
      console.log('[MS Graph Chats] Getting all chats...');
      const chats = await teamsClient.getMyChats();

      // Cache chats in database
      for (const chat of chats) {
        await db.insert(msChatsCache)
          .values({
            msAccountId: msAccount.id,
            msChatId: chat.id,
            chatType: chat.chatType,
            topic: chat.topic,
            members: chat.members?.map(m => ({
              id: m.id,
              displayName: m.displayName,
              email: m.email,
              userId: m.userId,
            })),
            lastSyncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [msChatsCache.msAccountId, msChatsCache.msChatId],
            set: {
              chatType: chat.chatType,
              topic: chat.topic,
              members: chat.members?.map(m => ({
                id: m.id,
                displayName: m.displayName,
                email: m.email,
                userId: m.userId,
              })),
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
      }

      // Format chats for response
      const formattedChats = chats.map(chat => ({
        id: chat.id,
        chatType: chat.chatType,
        topic: chat.topic,
        members: chat.members?.map(m => ({
          displayName: m.displayName,
          email: m.email,
        })),
        lastUpdatedDateTime: chat.lastUpdatedDateTime,
      }));

      return NextResponse.json({
        success: true,
        chats: formattedChats,
      });
    }
  } catch (error) {
    console.error('[MS Graph Chats] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get chats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const msAccount = await db.query.msGraphAccounts.findFirst({
      where: eq(msGraphAccounts.userId, user.id),
    });

    if (!msAccount) {
      return NextResponse.json(
        { error: 'MS Teams not connected' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { chatId, content, contentType = 'text' } = body;

    if (!chatId || !content) {
      return NextResponse.json(
        { error: 'chatId and content are required' },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    console.log('[MS Graph Chats] Sending message to chat:', chatId);
    const message = await teamsClient.sendChatMessage(chatId, content, contentType);

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.body.content,
        createdDateTime: message.createdDateTime,
      },
    });
  } catch (error) {
    console.error('[MS Graph Chats] Send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
