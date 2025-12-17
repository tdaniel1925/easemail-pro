// Teams Webhook Subscription Management
import { db } from '@/lib/db';
import { teamsWebhookSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Create a webhook subscription for an account
 */
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

/**
 * Renew an expiring subscription
 */
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

/**
 * Delete a subscription
 */
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
