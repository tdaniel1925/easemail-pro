// Teams Create Chat API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts, teamsChats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getValidAccessToken, encryptTokens } from '@/lib/teams/teams-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, userDisplayName, userEmail, accountId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get Teams account
    const accounts = await db
      .select()
      .from(teamsAccounts)
      .where(eq(teamsAccounts.userId, user.id))
      .limit(1);

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No Teams account connected' }, { status: 404 });
    }

    const account = accountId
      ? accounts.find(a => a.id === accountId) || accounts[0]
      : accounts[0];

    // Get valid access token
    const { accessToken, refreshed, newTokens } = await getValidAccessToken(
      account.accessToken,
      account.refreshToken,
      account.tokenExpiresAt
    );

    // Update tokens if refreshed
    if (refreshed && newTokens) {
      const encrypted = encryptTokens(newTokens);
      await db
        .update(teamsAccounts)
        .set({
          accessToken: encrypted.accessToken,
          refreshToken: encrypted.refreshToken,
          tokenExpiresAt: encrypted.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(teamsAccounts.id, account.id));
    }

    // Create a new 1:1 chat via Microsoft Graph
    const createChatResponse = await fetch(
      'https://graph.microsoft.com/v1.0/chats',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatType: 'oneOnOne',
          members: [
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${account.microsoftUserId}')`,
            },
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
            },
          ],
        }),
      }
    );

    if (!createChatResponse.ok) {
      const error = await createChatResponse.json();
      console.error('Create chat error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to create chat' },
        { status: createChatResponse.status }
      );
    }

    const chatData = await createChatResponse.json();

    // Store chat in database
    const [newChat] = await db
      .insert(teamsChats)
      .values({
        teamsAccountId: account.id,
        userId: user.id,
        teamsChatId: chatData.id,
        chatType: 'oneOnOne',
        topic: null,
        webUrl: chatData.webUrl,
        participants: [
          {
            id: account.microsoftUserId,
            displayName: account.displayName || account.email,
            email: account.email,
          },
          {
            id: userId,
            displayName: userDisplayName,
            email: userEmail,
          },
        ],
        otherParticipantName: userDisplayName,
        otherParticipantEmail: userEmail,
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        isArchived: false,
        teamsCreatedAt: chatData.createdDateTime ? new Date(chatData.createdDateTime) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [teamsChats.teamsAccountId, teamsChats.teamsChatId],
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      chat: {
        id: newChat.id,
        teamsChatId: newChat.teamsChatId,
        chatType: newChat.chatType,
        topic: newChat.topic,
        webUrl: newChat.webUrl,
        participants: newChat.participants,
        otherParticipantName: newChat.otherParticipantName,
        otherParticipantEmail: newChat.otherParticipantEmail,
        lastMessageAt: newChat.lastMessageAt,
        lastMessagePreview: newChat.lastMessagePreview,
        lastMessageSenderName: newChat.lastMessageSenderName,
        unreadCount: newChat.unreadCount,
        isPinned: newChat.isPinned,
        isMuted: newChat.isMuted,
        isArchived: newChat.isArchived,
        accountEmail: account.email,
        accountDisplayName: account.displayName,
      },
    });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create chat' },
      { status: 500 }
    );
  }
}
