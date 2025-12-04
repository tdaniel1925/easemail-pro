/**
 * MS Graph Channel Messages API
 *
 * GET /api/ms-graph/messages - Get messages from a channel
 * POST /api/ms-graph/messages - Send a message to a channel
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { msGraphAccounts, msChannelsCache, msMessagesCache, msTeamsCache } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { MSGraphTeamsClient, refreshAccessToken } from '@/lib/ms-graph/client';

async function getValidAccessToken(account: any): Promise<string> {
  const tokenExpiresAt = new Date(account.tokenExpiresAt);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (tokenExpiresAt > fiveMinutesFromNow) {
    return account.accessToken;
  }

  console.log('[MS Graph Messages] Refreshing access token...');
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
    const teamId = searchParams.get('teamId');
    const channelId = searchParams.get('channelId');

    if (!teamId || !channelId) {
      return NextResponse.json(
        { error: 'teamId and channelId are required' },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    console.log('[MS Graph Messages] Getting messages for channel:', channelId);
    const messages = await teamsClient.getChannelMessages(teamId, channelId, 50);

    // Get current user to mark "from me" messages
    const me = await teamsClient.getMe();

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
      mentions: msg.mentions,
      createdDateTime: msg.createdDateTime,
      isFromMe: msg.from?.user?.id === me.id,
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error('[MS Graph Messages] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get messages' },
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
    const { teamId, channelId, content, contentType = 'text', replyToMessageId } = body;

    if (!teamId || !channelId || !content) {
      return NextResponse.json(
        { error: 'teamId, channelId, and content are required' },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    let message;
    if (replyToMessageId) {
      console.log('[MS Graph Messages] Replying to message:', replyToMessageId);
      message = await teamsClient.replyToChannelMessage(teamId, channelId, replyToMessageId, content, contentType);
    } else {
      console.log('[MS Graph Messages] Sending message to channel:', channelId);
      message = await teamsClient.sendChannelMessage(teamId, channelId, content, contentType);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.body.content,
        createdDateTime: message.createdDateTime,
      },
    });
  } catch (error) {
    console.error('[MS Graph Messages] Send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
