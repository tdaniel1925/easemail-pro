// Microsoft Teams Webhook Handler
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  teamsAccounts,
  teamsChats,
  teamsMessages,
  teamsWebhookSubscriptions,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { TeamsWebhookNotification, TeamsChangeNotification } from '@/lib/teams/teams-types';
import { incrementalSyncChat } from '@/lib/teams/teams-sync';

// Handle webhook validation and notifications
export async function POST(request: Request) {
  try {
    // Check for validation token (Microsoft sends this when creating subscription)
    const { searchParams } = new URL(request.url);
    const validationToken = searchParams.get('validationToken');

    if (validationToken) {
      // Respond with the validation token to confirm subscription
      console.log('🔐 Teams webhook validation received');
      return new Response(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Parse notification body
    const notification: TeamsWebhookNotification = await request.json();
    console.log(`📬 Teams webhook received: ${notification.value?.length || 0} notifications`);

    // Process each notification
    for (const change of notification.value || []) {
      await processNotification(change);
    }

    // Microsoft expects 202 Accepted for successful processing
    return NextResponse.json({ status: 'processed' }, { status: 202 });
  } catch (error) {
    console.error('Teams webhook error:', error);
    // Return 202 anyway to prevent Microsoft from retrying
    return NextResponse.json({ error: 'Processing error' }, { status: 202 });
  }
}

/**
 * Process a single change notification
 */
async function processNotification(notification: TeamsChangeNotification): Promise<void> {
  try {
    const { subscriptionId, changeType, resource, resourceData, clientState } = notification;

    console.log(`📝 Processing Teams notification: ${changeType} on ${resource}`);

    // Find the subscription to get account info
    const subscription = await db
      .select()
      .from(teamsWebhookSubscriptions)
      .where(eq(teamsWebhookSubscriptions.subscriptionId, subscriptionId))
      .limit(1);

    if (!subscription.length) {
      console.warn(`⚠️ Unknown subscription: ${subscriptionId}`);
      return;
    }

    // Verify client state if set
    if (subscription[0].clientState && subscription[0].clientState !== clientState) {
      console.warn(`⚠️ Client state mismatch for subscription ${subscriptionId}`);
      return;
    }

    const accountId = subscription[0].teamsAccountId;

    // Determine what changed based on resource path
    // Resource format: /chats/{chat-id}/messages/{message-id} or /chats/{chat-id}
    const resourceParts = resource.split('/');

    if (resource.includes('/messages/')) {
      // Message change
      const chatIdIndex = resourceParts.indexOf('chats') + 1;
      const teamsChatId = resourceParts[chatIdIndex];

      if (teamsChatId) {
        await handleMessageChange(accountId, teamsChatId, changeType, resourceData);
      }
    } else if (resource.includes('/chats/')) {
      // Chat change
      const chatIdIndex = resourceParts.indexOf('chats') + 1;
      const teamsChatId = resourceParts[chatIdIndex];

      if (teamsChatId) {
        await handleChatChange(accountId, teamsChatId, changeType);
      }
    }
  } catch (error) {
    console.error('Error processing notification:', error);
  }
}

/**
 * Handle message changes (created, updated, deleted)
 */
async function handleMessageChange(
  accountId: string,
  teamsChatId: string,
  changeType: string,
  resourceData?: { id: string }
): Promise<void> {
  console.log(`💬 Message ${changeType} in chat ${teamsChatId}`);

  // Find the chat in our database
  const chat = await db
    .select()
    .from(teamsChats)
    .where(
      and(
        eq(teamsChats.teamsAccountId, accountId),
        eq(teamsChats.teamsChatId, teamsChatId)
      )
    )
    .limit(1);

  if (!chat.length) {
    console.warn(`⚠️ Chat not found: ${teamsChatId}`);
    return;
  }

  // Trigger incremental sync for this chat
  const result = await incrementalSyncChat(accountId, chat[0].id);

  if (result.error) {
    console.error(`❌ Sync error for chat ${teamsChatId}: ${result.error}`);
  } else {
    console.log(`✅ Synced chat ${teamsChatId}: +${result.messagesAdded} messages`);
  }

  // Update unread count for new messages
  if (changeType === 'created') {
    await db
      .update(teamsChats)
      .set({
        unreadCount: (chat[0].unreadCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(teamsChats.id, chat[0].id));
  }
}

/**
 * Handle chat changes (created, updated)
 */
async function handleChatChange(
  accountId: string,
  teamsChatId: string,
  changeType: string
): Promise<void> {
  console.log(`📱 Chat ${changeType}: ${teamsChatId}`);

  // For chat changes, trigger a full sync of the account to pick up new chats
  // This is a heavier operation, so we might want to debounce/queue this
  const account = await db
    .select()
    .from(teamsAccounts)
    .where(eq(teamsAccounts.id, accountId))
    .limit(1);

  if (!account.length) {
    console.warn(`⚠️ Account not found: ${accountId}`);
    return;
  }

  // For now, just log - could trigger a background sync job
  console.log(`📋 Would sync account ${account[0].email} for chat changes`);
}

// Create a webhook subscription for an account
export async function createTeamsWebhookSubscription(
  accountId: string,
  userId: string,
  accessToken: string
): Promise<{ subscriptionId: string; expiresAt: Date } | null> {
  try {
    const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/teams`;
    const clientState = crypto.randomUUID();

    // Subscription expires in 1 hour (max for chat messages)
    const expirationDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changeType: 'created,updated,deleted',
        notificationUrl,
        resource: '/me/chats/getAllMessages',
        expirationDateTime,
        clientState,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create Teams subscription:', error);
      return null;
    }

    const subscription = await response.json();

    // Store subscription in database
    await db.insert(teamsWebhookSubscriptions).values({
      teamsAccountId: accountId,
      userId,
      subscriptionId: subscription.id,
      resource: '/me/chats/getAllMessages',
      changeTypes: ['created', 'updated', 'deleted'],
      status: 'active',
      expiresAt: new Date(subscription.expirationDateTime),
      clientState,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Created Teams webhook subscription: ${subscription.id}`);

    return {
      subscriptionId: subscription.id,
      expiresAt: new Date(subscription.expirationDateTime),
    };
  } catch (error) {
    console.error('Error creating Teams subscription:', error);
    return null;
  }
}

// Renew an expiring subscription
export async function renewTeamsWebhookSubscription(
  subscriptionId: string,
  accessToken: string
): Promise<boolean> {
  try {
    // Extend by 1 hour
    const expirationDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expirationDateTime }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to renew Teams subscription:', error);
      return false;
    }

    // Update database
    await db
      .update(teamsWebhookSubscriptions)
      .set({
        expiresAt: new Date(expirationDateTime),
        updatedAt: new Date(),
      })
      .where(eq(teamsWebhookSubscriptions.subscriptionId, subscriptionId));

    console.log(`✅ Renewed Teams webhook subscription: ${subscriptionId}`);
    return true;
  } catch (error) {
    console.error('Error renewing Teams subscription:', error);
    return false;
  }
}

// Delete a subscription
export async function deleteTeamsWebhookSubscription(
  subscriptionId: string,
  accessToken: string
): Promise<boolean> {
  try {
    await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Update database
    await db
      .update(teamsWebhookSubscriptions)
      .set({
        status: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(teamsWebhookSubscriptions.subscriptionId, subscriptionId));

    console.log(`🗑️ Deleted Teams webhook subscription: ${subscriptionId}`);
    return true;
  } catch (error) {
    console.error('Error deleting Teams subscription:', error);
    return false;
  }
}
