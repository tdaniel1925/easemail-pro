/**
 * Nylas v3 Webhook Handling
 * Signature verification and event processing
 */

import crypto from 'crypto';
import { nylasConfig, WEBHOOK_EVENTS, WebhookEventType } from './config';

export interface WebhookPayload {
  webhook_id: string;
  type: WebhookEventType;
  data: {
    grant_id?: string;
    id?: string;
    [key: string]: any;
  };
}

/**
 * Verify webhook signature using HMAC-SHA256
 * CRITICAL: Always verify signatures to prevent malicious requests
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!signature || !payload) {
    console.error('❌ Missing webhook signature or payload');
    return false;
  }

  // Skip verification if webhook secret is not configured (dev mode)
  if (!nylasConfig.webhookSecret) {
    console.warn('⚠️ NYLAS_WEBHOOK_SECRET not configured - skipping signature verification');
    return true;
  }

  try {
    const hmac = crypto.createHmac('sha256', nylasConfig.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Log signature comparison for debugging (truncated for security)
    console.log('[Webhook] Signature verification:', {
      receivedLength: signature.length,
      expectedLength: expectedSignature.length,
      receivedPrefix: signature.substring(0, 8),
      expectedPrefix: expectedSignature.substring(0, 8),
      payloadLength: payload.length,
    });

    // Check if lengths match before comparison (timingSafeEqual requires equal lengths)
    if (signature.length !== expectedSignature.length) {
      console.error('❌ Signature length mismatch:', {
        received: signature.length,
        expected: expectedSignature.length,
      });
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Parse and validate webhook payload
 */
export function parseWebhookPayload(rawPayload: string): WebhookPayload | null {
  try {
    const payload = JSON.parse(rawPayload);

    // Validate required fields
    if (!payload.webhook_id || !payload.type || !payload.data) {
      console.error('❌ Invalid webhook payload structure');
      return null;
    }

    return payload as WebhookPayload;
  } catch (error) {
    console.error('❌ Webhook payload parse error:', error);
    return null;
  }
}

/**
 * Check if webhook event is truncated (payload > 1MB)
 */
export function isTruncatedEvent(eventType: string): boolean {
  return eventType.endsWith('.truncated');
}

/**
 * Get base event type from truncated event
 * Example: "message.created.truncated" -> "message.created"
 */
export function getBaseEventType(eventType: string): string {
  return eventType.replace('.truncated', '');
}

/**
 * Webhook event handlers
 * These are called by the webhook endpoint after verification
 */

export interface WebhookHandlers {
  onGrantCreated?: (data: any) => Promise<void>;
  onGrantUpdated?: (data: any) => Promise<void>;
  onGrantExpired?: (data: any) => Promise<void>;
  onGrantDeleted?: (data: any) => Promise<void>;
  onMessageCreated?: (data: any) => Promise<void>;
  onMessageUpdated?: (data: any) => Promise<void>;
  onMessageDeleted?: (data: any) => Promise<void>;
  onMessageTruncated?: (data: any) => Promise<void>;
  onFolderCreated?: (data: any) => Promise<void>;
  onFolderUpdated?: (data: any) => Promise<void>;
  onFolderDeleted?: (data: any) => Promise<void>;
}

/**
 * Process webhook event with registered handlers
 */
export async function processWebhookEvent(
  payload: WebhookPayload,
  handlers: WebhookHandlers
): Promise<void> {
  const { type, data } = payload;

  console.log(`🔔 Processing webhook event: ${type}`, {
    grantId: data.grant_id?.substring(0, 8),
    id: data.id?.substring(0, 8),
  });

  try {
    switch (type) {
      case WEBHOOK_EVENTS.GRANT_CREATED:
        if (handlers.onGrantCreated) {
          await handlers.onGrantCreated(data);
        }
        break;

      case WEBHOOK_EVENTS.GRANT_UPDATED:
        if (handlers.onGrantUpdated) {
          await handlers.onGrantUpdated(data);
        }
        break;

      case WEBHOOK_EVENTS.GRANT_EXPIRED:
        if (handlers.onGrantExpired) {
          await handlers.onGrantExpired(data);
        }
        break;

      case WEBHOOK_EVENTS.GRANT_DELETED:
        if (handlers.onGrantDeleted) {
          await handlers.onGrantDeleted(data);
        }
        break;

      case WEBHOOK_EVENTS.MESSAGE_CREATED:
        if (handlers.onMessageCreated) {
          await handlers.onMessageCreated(data);
        }
        break;

      case WEBHOOK_EVENTS.MESSAGE_UPDATED:
        if (handlers.onMessageUpdated) {
          await handlers.onMessageUpdated(data);
        }
        break;

      case WEBHOOK_EVENTS.MESSAGE_DELETED:
        if (handlers.onMessageDeleted) {
          await handlers.onMessageDeleted(data);
        }
        break;

      case WEBHOOK_EVENTS.MESSAGE_CREATED_TRUNCATED:
      case WEBHOOK_EVENTS.MESSAGE_UPDATED_TRUNCATED:
        if (handlers.onMessageTruncated) {
          await handlers.onMessageTruncated(data);
        }
        break;

      case WEBHOOK_EVENTS.FOLDER_CREATED:
        if (handlers.onFolderCreated) {
          await handlers.onFolderCreated(data);
        }
        break;

      case WEBHOOK_EVENTS.FOLDER_UPDATED:
        if (handlers.onFolderUpdated) {
          await handlers.onFolderUpdated(data);
        }
        break;

      case WEBHOOK_EVENTS.FOLDER_DELETED:
        if (handlers.onFolderDeleted) {
          await handlers.onFolderDeleted(data);
        }
        break;

      default:
        console.log(`⚠️ Unhandled webhook event type: ${type}`);
    }

    console.log(`✅ Webhook event processed: ${type}`);
  } catch (error) {
    console.error(`❌ Webhook event processing error for ${type}:`, error);
    throw error;
  }
}
