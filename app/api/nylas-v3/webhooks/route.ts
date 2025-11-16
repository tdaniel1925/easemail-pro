/**
 * Nylas v3 Webhook Endpoint
 * Handles all webhook notifications from Nylas with proper signature verification
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookEvent,
  WebhookHandlers,
} from '@/lib/nylas-v3/webhooks';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET handler - Webhook challenge verification
 * Nylas sends a challenge parameter on initial webhook setup
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    console.log('✅ Webhook challenge received and verified');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { error: 'No challenge provided' },
    { status: 400 }
  );
}

/**
 * POST handler - Webhook notifications
 * Receives and processes webhook events from Nylas
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get raw payload and signature (case-insensitive header lookup)
    const rawPayload = await request.text();
    const signature = request.headers.get('x-nylas-signature') || 
                      request.headers.get('X-Nylas-Signature') || '';

    if (!signature) {
      console.error('❌ Missing webhook signature', {
        availableHeaders: Array.from(request.headers.keys()),
      });
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // 2. Verify signature with enhanced logging
    const isValid = verifyWebhookSignature(rawPayload, signature);

    if (!isValid) {
      console.error('❌ Invalid webhook signature', {
        signatureLength: signature.length,
        payloadLength: rawPayload.length,
        payloadPreview: rawPayload.substring(0, 100),
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Parse payload
    const payload = parseWebhookPayload(rawPayload);

    if (!payload) {
      console.error('❌ Invalid webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    console.log(`🔔 Received webhook: ${payload.type}`, {
      webhookId: payload.webhook_id.substring(0, 8),
      grantId: payload.data.grant_id?.substring(0, 8),
    });

    // 4. Define webhook handlers
    const handlers: WebhookHandlers = {
      // Grant lifecycle handlers
      onGrantCreated: async (data) => {
        console.log(`✅ Grant created: ${data.grant_id}`);
        // Grant creation is handled by OAuth flow, just log
      },

      onGrantUpdated: async (data) => {
        console.log(`🔄 Grant updated: ${data.grant_id}`);

        // Update grant status in database
        await db.update(emailAccounts)
          .set({
            syncStatus: data.grant_status || 'active',
            updatedAt: new Date(),
          })
          .where(eq(emailAccounts.nylasGrantId, data.grant_id));
      },

      onGrantExpired: async (data) => {
        console.log(`⚠️ Grant expired: ${data.grant_id}`);

        // Mark grant as expired in database
        await db.update(emailAccounts)
          .set({
            syncStatus: 'error',
            lastError: 'Grant expired - please re-authenticate',
            updatedAt: new Date(),
          })
          .where(eq(emailAccounts.nylasGrantId, data.grant_id));

        // TODO: Send notification to user to re-authenticate
      },

      onGrantDeleted: async (data) => {
        console.log(`🗑️ Grant deleted: ${data.grant_id}`);

        // Soft delete account or mark as disconnected
        await db.update(emailAccounts)
          .set({
            syncStatus: 'error',
            lastError: 'Account disconnected',
            updatedAt: new Date(),
          })
          .where(eq(emailAccounts.nylasGrantId, data.grant_id));
      },

      // Message handlers - trigger frontend refresh
      onMessageCreated: async (data) => {
        console.log(`📧 New message: ${data.id} in grant ${data.grant_id}`);

        // Find account ID from grant ID
        const account = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.nylasGrantId, data.grant_id),
        });

        if (account) {
          // Broadcast real-time event to frontend
          const { broadcastEmailSync } = await import('@/lib/realtime/email-sync');
          await broadcastEmailSync({
            type: 'message.created',
            accountId: account.id,
            messageId: data.id,
            timestamp: Date.now(),
          });
        }
      },

      onMessageUpdated: async (data) => {
        console.log(`✏️ Message updated: ${data.id}`);

        const account = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.nylasGrantId, data.grant_id),
        });

        if (account) {
          const { broadcastEmailSync } = await import('@/lib/realtime/email-sync');
          await broadcastEmailSync({
            type: 'message.updated',
            accountId: account.id,
            messageId: data.id,
            timestamp: Date.now(),
          });
        }
      },

      onMessageDeleted: async (data) => {
        console.log(`🗑️ Message deleted: ${data.id}`);

        const account = await db.query.emailAccounts.findFirst({
          where: eq(emailAccounts.nylasGrantId, data.grant_id),
        });

        if (account) {
          const { broadcastEmailSync } = await import('@/lib/realtime/email-sync');
          await broadcastEmailSync({
            type: 'message.deleted',
            accountId: account.id,
            messageId: data.id,
            timestamp: Date.now(),
          });
        }
      },

      onMessageTruncated: async (data) => {
        console.log(`📦 Truncated message webhook: ${data.id}`);
        // Payload exceeded 1MB, we'll fetch full message when user opens it
      },

      // Folder handlers
      onFolderCreated: async (data) => {
        console.log(`📁 Folder created: ${data.name} (${data.id})`);
        // Notify frontend to refetch folder list
      },

      onFolderUpdated: async (data) => {
        console.log(`✏️ Folder updated: ${data.name} (${data.id})`);
        // Notify frontend to refetch folder list
      },

      onFolderDeleted: async (data) => {
        console.log(`🗑️ Folder deleted: ${data.id}`);
        // Notify frontend to refetch folder list
      },
    };

    // 5. Process the webhook event
    await processWebhookEvent(payload, handlers);

    // 6. Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    // Return 200 even on error to prevent Nylas from retrying
    // Log the error for investigation
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
