// Microsoft Teams Bidirectional Sync Service
import { db } from '@/lib/db';
import { teamsAccounts, teamsChats, teamsMessages, teamsSyncState } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { createTeamsClient, TeamsClient } from './teams-client';
import { getValidAccessToken, encryptTokens } from './teams-auth';
import {
  TeamsChat,
  TeamsMessage,
  TeamsSyncResult,
  ChatSyncResult,
  TeamsAccountRecord,
} from './teams-types';
import { encryptToken, decryptToken } from '@/lib/security/encryption';

/**
 * Get a Teams client with a valid access token, refreshing if needed
 */
async function getTeamsClientForAccount(account: TeamsAccountRecord): Promise<TeamsClient> {
  const { accessToken, refreshed, newTokens } = await getValidAccessToken(
    account.accessToken,
    account.refreshToken,
    account.tokenExpiresAt
  );

  // If tokens were refreshed, update the database
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

  return createTeamsClient(accessToken);
}

/**
 * Sync all Teams accounts for a user
 */
export async function syncAllTeamsAccountsForUser(userId: string): Promise<TeamsSyncResult[]> {
  const accounts = await db
    .select()
    .from(teamsAccounts)
    .where(and(eq(teamsAccounts.userId, userId), eq(teamsAccounts.isActive, true)));

  const results: TeamsSyncResult[] = [];

  for (const account of accounts) {
    const result = await syncTeamsAccount(account as TeamsAccountRecord);
    results.push(result);
  }

  return results;
}

/**
 * Full sync for a Teams account (chats and messages)
 */
export async function syncTeamsAccount(account: TeamsAccountRecord): Promise<TeamsSyncResult> {
  const result: TeamsSyncResult = {
    success: false,
    chatsProcessed: 0,
    messagesProcessed: 0,
    errors: [],
  };

  try {
    // Update sync status
    await db
      .update(teamsAccounts)
      .set({ syncStatus: 'syncing', lastError: null, updatedAt: new Date() })
      .where(eq(teamsAccounts.id, account.id));

    // Get Teams client
    const client = await getTeamsClientForAccount(account);

    // Step 1: Sync all chats
    console.log(`📱 Syncing Teams chats for account ${account.email}...`);
    const chatResults = await syncChats(client, account);
    result.chatsProcessed = chatResults.length;

    // Step 2: Sync messages for each chat
    for (const chat of chatResults) {
      if (chat.error) {
        result.errors.push(chat.error);
        continue;
      }

      const messageResult = await syncChatMessages(client, account, chat.chatId);
      result.messagesProcessed += messageResult.messagesAdded + messageResult.messagesUpdated;
      if (messageResult.error) {
        result.errors.push(messageResult.error);
      }
    }

    // Update sync status
    await db
      .update(teamsAccounts)
      .set({
        syncStatus: 'idle',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teamsAccounts.id, account.id));

    result.success = true;
    console.log(`✅ Teams sync complete: ${result.chatsProcessed} chats, ${result.messagesProcessed} messages`);
  } catch (error) {
    console.error('Teams sync error:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');

    // Update sync status with error
    await db
      .update(teamsAccounts)
      .set({
        syncStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(teamsAccounts.id, account.id));
  }

  return result;
}

/**
 * Sync all chats for an account
 */
async function syncChats(
  client: TeamsClient,
  account: TeamsAccountRecord
): Promise<Array<{ chatId: string; error?: string }>> {
  const results: Array<{ chatId: string; error?: string }> = [];
  let skipToken: string | undefined;

  try {
    do {
      const response = await client.getChats({
        top: 50,
        skipToken,
        expand: ['members'],
      });

      for (const chat of response.value) {
        try {
          await upsertChat(account, chat);
          results.push({ chatId: chat.id });
        } catch (error) {
          results.push({
            chatId: chat.id,
            error: error instanceof Error ? error.message : 'Failed to sync chat',
          });
        }
      }

      // Get next page token
      skipToken = response['@odata.nextLink']
        ? new URL(response['@odata.nextLink']).searchParams.get('$skiptoken') || undefined
        : undefined;
    } while (skipToken);
  } catch (error) {
    console.error('Error syncing chats:', error);
    throw error;
  }

  return results;
}

/**
 * Upsert a chat to the database
 */
async function upsertChat(account: TeamsAccountRecord, chat: TeamsChat): Promise<void> {
  // Get participants info
  const participants = chat.members?.map(m => ({
    id: m.userId || m.id,
    displayName: m.displayName,
    email: m.email,
  })) || [];

  // For 1:1 chats, find the other participant
  let otherParticipantName: string | null = null;
  let otherParticipantEmail: string | null = null;

  if (chat.chatType === 'oneOnOne' && participants.length === 2) {
    const otherParticipant = participants.find(p => p.email !== account.email);
    if (otherParticipant) {
      otherParticipantName = otherParticipant.displayName;
      otherParticipantEmail = otherParticipant.email || null;
    }
  }

  // Check if chat exists
  const existing = await db
    .select()
    .from(teamsChats)
    .where(
      and(
        eq(teamsChats.teamsAccountId, account.id),
        eq(teamsChats.teamsChatId, chat.id)
      )
    )
    .limit(1);

  const chatData = {
    teamsChatId: chat.id,
    chatType: chat.chatType,
    topic: chat.topic || null,
    webUrl: chat.webUrl || null,
    participants,
    otherParticipantName,
    otherParticipantEmail,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    // Update existing chat
    await db
      .update(teamsChats)
      .set(chatData)
      .where(eq(teamsChats.id, existing[0].id));
  } else {
    // Insert new chat
    await db.insert(teamsChats).values({
      teamsAccountId: account.id,
      userId: account.userId,
      ...chatData,
      createdAt: new Date(),
    });
  }
}

/**
 * Sync messages for a specific chat
 */
async function syncChatMessages(
  client: TeamsClient,
  account: TeamsAccountRecord,
  teamsChatId: string
): Promise<ChatSyncResult> {
  const result: ChatSyncResult = {
    chatId: teamsChatId,
    messagesAdded: 0,
    messagesUpdated: 0,
    messagesDeleted: 0,
  };

  try {
    // Get the chat record
    const chatRecord = await db
      .select()
      .from(teamsChats)
      .where(
        and(
          eq(teamsChats.teamsAccountId, account.id),
          eq(teamsChats.teamsChatId, teamsChatId)
        )
      )
      .limit(1);

    if (!chatRecord.length) {
      result.error = 'Chat not found in database';
      return result;
    }

    const chat = chatRecord[0];
    let deltaLink = chat.syncCursor || undefined;
    let hasMore = true;

    while (hasMore) {
      const response = deltaLink
        ? await client.getChatMessagesDelta(teamsChatId, deltaLink)
        : await client.getChatMessages(teamsChatId, { top: 50 });

      for (const message of response.value) {
        // Skip system messages that aren't useful
        if (message.messageType === 'systemEventMessage' && !message.body.content) {
          continue;
        }

        const messageResult = await upsertMessage(account, chat.id, message);
        if (messageResult === 'added') result.messagesAdded++;
        else if (messageResult === 'updated') result.messagesUpdated++;
      }

      // Check for next page or delta link
      if (response['@odata.deltaLink']) {
        deltaLink = response['@odata.deltaLink'];
        hasMore = false;

        // Save the delta link for incremental sync
        await db
          .update(teamsChats)
          .set({ syncCursor: deltaLink, lastSyncedAt: new Date() })
          .where(eq(teamsChats.id, chat.id));
      } else if (response['@odata.nextLink']) {
        deltaLink = response['@odata.nextLink'];
      } else {
        hasMore = false;
      }
    }

    // Update last message info on chat
    const latestMessage = await db
      .select()
      .from(teamsMessages)
      .where(eq(teamsMessages.chatId, chat.id))
      .orderBy(desc(teamsMessages.teamsCreatedAt))
      .limit(1);

    if (latestMessage.length > 0) {
      await db
        .update(teamsChats)
        .set({
          lastMessageId: latestMessage[0].teamsMessageId,
          lastMessageAt: latestMessage[0].teamsCreatedAt,
          lastMessagePreview: latestMessage[0].summary || latestMessage[0].body?.substring(0, 100),
          lastMessageSenderId: latestMessage[0].senderId,
          lastMessageSenderName: latestMessage[0].senderName,
          updatedAt: new Date(),
        })
        .where(eq(teamsChats.id, chat.id));
    }
  } catch (error) {
    console.error(`Error syncing messages for chat ${teamsChatId}:`, error);
    result.error = error instanceof Error ? error.message : 'Failed to sync messages';
  }

  return result;
}

/**
 * Upsert a message to the database
 */
async function upsertMessage(
  account: TeamsAccountRecord,
  chatId: string,
  message: TeamsMessage
): Promise<'added' | 'updated' | 'skipped'> {
  // Check if message exists
  const existing = await db
    .select()
    .from(teamsMessages)
    .where(
      and(
        eq(teamsMessages.chatId, chatId),
        eq(teamsMessages.teamsMessageId, message.id)
      )
    )
    .limit(1);

  // Strip HTML tags for summary/preview
  const summary = message.body.content
    .replace(/<[^>]*>/g, '')
    .substring(0, 200)
    .trim();

  const messageData = {
    teamsMessageId: message.id,
    replyToMessageId: message.replyToId || null,
    senderId: message.from?.user?.id || message.from?.application?.id || 'unknown',
    senderName: message.from?.user?.displayName || message.from?.application?.displayName || null,
    senderEmail: null, // Graph API doesn't return email in message
    body: message.body.content,
    bodyType: message.body.contentType,
    subject: message.subject || null,
    summary,
    messageType: message.messageType,
    importance: message.importance,
    hasAttachments: (message.attachments?.length || 0) > 0,
    attachments: message.attachments?.map(a => ({
      id: a.id,
      name: a.name || 'Attachment',
      contentType: a.contentType,
      contentUrl: a.contentUrl,
    })) || null,
    mentions: message.mentions?.map(m => ({
      id: m.id,
      mentionText: m.mentionText,
      mentioned: m.mentioned,
    })) || null,
    reactions: message.reactions?.map(r => ({
      reactionType: r.reactionType,
      user: { id: r.user.id, displayName: r.user.displayName },
      createdAt: r.createdDateTime,
    })) || null,
    isDeleted: !!message.deletedDateTime,
    isEdited: !!message.lastEditedDateTime,
    deletedAt: message.deletedDateTime ? new Date(message.deletedDateTime) : null,
    editedAt: message.lastEditedDateTime ? new Date(message.lastEditedDateTime) : null,
    teamsCreatedAt: message.createdDateTime ? new Date(message.createdDateTime) : null,
    teamsModifiedAt: message.lastModifiedDateTime ? new Date(message.lastModifiedDateTime) : null,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    // Update existing message
    await db
      .update(teamsMessages)
      .set(messageData)
      .where(eq(teamsMessages.id, existing[0].id));
    return 'updated';
  } else {
    // Insert new message
    await db.insert(teamsMessages).values({
      chatId,
      teamsAccountId: account.id,
      userId: account.userId,
      ...messageData,
      isRead: false,
      createdAt: new Date(),
    });
    return 'added';
  }
}

/**
 * Incremental sync using delta tokens (for real-time updates)
 */
export async function incrementalSyncChat(
  accountId: string,
  chatId: string
): Promise<ChatSyncResult> {
  const account = await db
    .select()
    .from(teamsAccounts)
    .where(eq(teamsAccounts.id, accountId))
    .limit(1);

  if (!account.length) {
    return { chatId, messagesAdded: 0, messagesUpdated: 0, messagesDeleted: 0, error: 'Account not found' };
  }

  const chat = await db
    .select()
    .from(teamsChats)
    .where(eq(teamsChats.id, chatId))
    .limit(1);

  if (!chat.length) {
    return { chatId, messagesAdded: 0, messagesUpdated: 0, messagesDeleted: 0, error: 'Chat not found' };
  }

  const client = await getTeamsClientForAccount(account[0] as TeamsAccountRecord);
  return syncChatMessages(client, account[0] as TeamsAccountRecord, chat[0].teamsChatId);
}

/**
 * Send a message to Teams (outbound sync)
 */
export async function sendTeamsMessage(
  accountId: string,
  teamsChatId: string,
  content: string,
  options?: {
    contentType?: 'text' | 'html';
    importance?: 'normal' | 'high' | 'urgent';
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const account = await db
      .select()
      .from(teamsAccounts)
      .where(eq(teamsAccounts.id, accountId))
      .limit(1);

    if (!account.length) {
      return { success: false, error: 'Account not found' };
    }

    const client = await getTeamsClientForAccount(account[0] as TeamsAccountRecord);
    const result = await client.sendMessage({
      chatId: teamsChatId,
      content,
      contentType: options?.contentType || 'html',
      importance: options?.importance || 'normal',
    });

    if (result.success && result.messageId) {
      // Fetch and store the sent message
      const message = await client.getMessage(teamsChatId, result.messageId);

      const chatRecord = await db
        .select()
        .from(teamsChats)
        .where(
          and(
            eq(teamsChats.teamsAccountId, accountId),
            eq(teamsChats.teamsChatId, teamsChatId)
          )
        )
        .limit(1);

      if (chatRecord.length > 0) {
        await upsertMessage(account[0] as TeamsAccountRecord, chatRecord[0].id, message);
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Mark messages as read in Teams (outbound sync)
 */
export async function markTeamsChatAsRead(
  accountId: string,
  teamsChatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await db
      .select()
      .from(teamsAccounts)
      .where(eq(teamsAccounts.id, accountId))
      .limit(1);

    if (!account.length) {
      return { success: false, error: 'Account not found' };
    }

    const client = await getTeamsClientForAccount(account[0] as TeamsAccountRecord);
    await client.markChatAsRead(teamsChatId);

    // Update local read status
    const chatRecord = await db
      .select()
      .from(teamsChats)
      .where(
        and(
          eq(teamsChats.teamsAccountId, accountId),
          eq(teamsChats.teamsChatId, teamsChatId)
        )
      )
      .limit(1);

    if (chatRecord.length > 0) {
      await db
        .update(teamsChats)
        .set({ unreadCount: 0, lastReadAt: new Date() })
        .where(eq(teamsChats.id, chatRecord[0].id));

      await db
        .update(teamsMessages)
        .set({ isRead: true })
        .where(eq(teamsMessages.chatId, chatRecord[0].id));
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark as read',
    };
  }
}

/**
 * Create a new chat (outbound)
 */
export async function createTeamsChat(
  accountId: string,
  options: {
    type: 'oneOnOne' | 'group';
    memberIds: string[];
    topic?: string;
  }
): Promise<{ success: boolean; chatId?: string; error?: string }> {
  try {
    const account = await db
      .select()
      .from(teamsAccounts)
      .where(eq(teamsAccounts.id, accountId))
      .limit(1);

    if (!account.length) {
      return { success: false, error: 'Account not found' };
    }

    const client = await getTeamsClientForAccount(account[0] as TeamsAccountRecord);

    let chat: TeamsChat;
    if (options.type === 'oneOnOne') {
      chat = await client.createOneOnOneChat(options.memberIds[0]);
    } else {
      chat = await client.createGroupChat(options.topic || 'Group Chat', options.memberIds);
    }

    // Sync the new chat to database
    await upsertChat(account[0] as TeamsAccountRecord, chat);

    return { success: true, chatId: chat.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create chat',
    };
  }
}

/**
 * Delete a message (outbound sync)
 */
export async function deleteTeamsMessage(
  accountId: string,
  teamsChatId: string,
  teamsMessageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await db
      .select()
      .from(teamsAccounts)
      .where(eq(teamsAccounts.id, accountId))
      .limit(1);

    if (!account.length) {
      return { success: false, error: 'Account not found' };
    }

    const client = await getTeamsClientForAccount(account[0] as TeamsAccountRecord);
    await client.deleteMessage(teamsChatId, teamsMessageId);

    // Update local message
    await db
      .update(teamsMessages)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(teamsMessages.teamsMessageId, teamsMessageId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete message',
    };
  }
}

/**
 * Edit a message (outbound sync)
 */
export async function editTeamsMessage(
  accountId: string,
  teamsChatId: string,
  teamsMessageId: string,
  newContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await db
      .select()
      .from(teamsAccounts)
      .where(eq(teamsAccounts.id, accountId))
      .limit(1);

    if (!account.length) {
      return { success: false, error: 'Account not found' };
    }

    const client = await getTeamsClientForAccount(account[0] as TeamsAccountRecord);
    await client.updateMessage(teamsChatId, teamsMessageId, newContent);

    // Update local message
    await db
      .update(teamsMessages)
      .set({
        body: newContent,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teamsMessages.teamsMessageId, teamsMessageId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit message',
    };
  }
}
