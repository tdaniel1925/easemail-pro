/**
 * Twilio Webhook Handler
 * Receives delivery status updates from Twilio
 * Configured at: https://console.twilio.com/us1/develop/sms/settings/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages, contactCommunications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logSMSAudit } from '@/lib/sms/audit-service';
import { retrySMS } from '@/lib/sms/retry-service';

// Twilio status values:
// queued, sending, sent, delivered, undelivered, failed
const RETRY_STATUSES = ['failed', 'undelivered'];

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio form data
    const formData = await request.formData();
    const webhookData = {
      messageSid: formData.get('MessageSid') as string,
      messageStatus: formData.get('MessageStatus') as string,
      errorCode: formData.get('ErrorCode') as string,
      errorMessage: formData.get('ErrorMessage') as string,
      to: formData.get('To') as string,
      from: formData.get('From') as string,
      body: formData.get('Body') as string,
    };

    console.log('📬 Twilio webhook received:', webhookData);

    if (!webhookData.messageSid) {
      return NextResponse.json({ error: 'Missing MessageSid' }, { status: 400 });
    }

    // Find SMS record
    const smsRecord = await db.query.smsMessages.findFirst({
      where: eq(smsMessages.twilioSid, webhookData.messageSid),
    });

    if (!smsRecord) {
      console.warn('⚠️ SMS record not found for SID:', webhookData.messageSid);
      return NextResponse.json({ message: 'Record not found' }, { status: 404 });
    }

    // Update SMS status
    await db.update(smsMessages)
      .set({
        twilioStatus: webhookData.messageStatus,
        twilioErrorCode: webhookData.errorCode || null,
        twilioErrorMessage: webhookData.errorMessage || null,
        deliveredAt: webhookData.messageStatus === 'delivered' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(smsMessages.id, smsRecord.id));

    // Update communication timeline
    if (smsRecord.contactId) {
      await db.update(contactCommunications)
        .set({
          status: webhookData.messageStatus,
          metadata: {
            errorCode: webhookData.errorCode,
            errorMessage: webhookData.errorMessage,
            deliveryStatus: webhookData.messageStatus,
          } as any,
          updatedAt: new Date(),
        })
        .where(eq(contactCommunications.smsId, smsRecord.id));
    }

    // Log audit trail
    await logSMSAudit({
      userId: smsRecord.userId,
      smsId: smsRecord.id,
      action: webhookData.messageStatus === 'failed' ? 'failed' : 'delivered',
      metadata: {
        twilioStatus: webhookData.messageStatus,
        errorCode: webhookData.errorCode,
        errorMessage: webhookData.errorMessage,
      },
    });

    // Auto-retry if failed (up to 3 times)
    if (RETRY_STATUSES.includes(webhookData.messageStatus)) {
      // Note: smsMessages table doesn't have metadata field - retry logic would need to be tracked separately
      // For now, just attempt one retry
      console.log(`🔄 Auto-retrying SMS ${smsRecord.id}`);
      
      // Don't await - let it run in background
      retrySMS(smsRecord.id).catch(error => {
        console.error('Auto-retry failed:', error);
      });
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error.message },
      { status: 500 }
    );
  }
}

// Verify Twilio signature (optional but recommended for production)
function verifyTwilioSignature(request: NextRequest): boolean {
  // const signature = request.headers.get('x-twilio-signature');
  // const url = request.url;
  // const params = Object.fromEntries(formData.entries());
  // 
  // const twilio = require('twilio');
  // return twilio.validateRequest(
  //   process.env.TWILIO_AUTH_TOKEN!,
  //   signature!,
  //   url,
  //   params
  // );
  
  // For now, return true. Implement signature validation in production.
  return true;
}

