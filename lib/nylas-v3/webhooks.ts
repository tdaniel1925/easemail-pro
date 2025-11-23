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
    console.error('❌ Missing webhook signature or payload', {
      hasSignature: !!signature,
      hasPayload: !!payload,
      signatureLength: signature?.length || 0,
      payloadLength: payload?.length || 0,
    });
    return false;
  }

  // CRITICAL: Fail in production if secret not configured
  if (!nylasConfig.webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: NYLAS_WEBHOOK_SECRET not configured in production!');
      throw new Error('Webhook secret required in production');
    }
    console.warn('⚠️ NYLAS_WEBHOOK_SECRET not configured - skipping signature verification (DEV ONLY)');
    return true;
  }

  try {
    // Clean signature (remove any whitespace or prefix)
    const cleanSignature = signature.trim();
    
    // Create HMAC with webhook secret
    const hmac = crypto.createHmac('sha256', nylasConfig.webhookSecret);
    hmac.update(payload, 'utf8'); // Explicitly specify encoding
    const expectedSignature = hmac.digest('hex');

    // Log signature comparison for debugging (truncated for security)
    console.log('[Webhook] Signature verification:', {
      receivedLength: cleanSignature.length,
      expectedLength: expectedSignature.length,
      receivedPrefix: cleanSignature.substring(0, 12),
      expectedPrefix: expectedSignature.substring(0, 12),
      payloadLength: payload.length,
      payloadHash: crypto.createHash('sha256').update(payload).digest('hex').substring(0, 12),
    });

    // Check if lengths match before comparison (timingSafeEqual requires equal lengths)
    if (cleanSignature.length !== expectedSignature.length) {
      console.error('❌ Signature length mismatch:', {
        received: cleanSignature.length,
        expected: expectedSignature.length,
        receivedFormat: cleanSignature.match(/^[0-9a-f]+$/i) ? 'hex' : 'unknown',
      });
      return false;
    }

    // Try hex comparison first (standard Nylas format)
    try {
      const receivedBuffer = Buffer.from(cleanSignature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      if (receivedBuffer.length !== expectedBuffer.length) {
        console.error('❌ Buffer length mismatch after hex decode', {
          receivedBufferLength: receivedBuffer.length,
          expectedBufferLength: expectedBuffer.length,
        });
        return false;
      }

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
      
      if (!isValid) {
        console.error('❌ Signature mismatch (hex format)', {
          receivedFirst16: cleanSignature.substring(0, 16),
          expectedFirst16: expectedSignature.substring(0, 16),
        });
      }
      
      return isValid;
    } catch (hexError) {
      // If hex decode fails, the signature might be in a different format
      console.error('❌ Failed to decode signature as hex:', {
        error: hexError instanceof Error ? hexError.message : String(hexError),
        signaturePreview: cleanSignature.substring(0, 20),
        isHexFormat: /^[0-9a-f]+$/i.test(cleanSignature),
      });
      return false;
    }
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
