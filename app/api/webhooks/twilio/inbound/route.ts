/**
 * Twilio Inbound SMS Webhook
 * Receives incoming text messages and routes them to the correct user's timeline
 * Configure at: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
 * Set "A MESSAGE COMES IN" to: https://yoursite.com/api/webhooks/twilio/inbound
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages, contactCommunications, smsConversations, contacts } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { logSMSAudit } from '@/lib/sms/audit-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio form data
    const formData = await request.formData();
    const inboundData = {
      messageSid: formData.get('MessageSid') as string,
      from: formData.get('From') as string, // Sender's phone (contact)
      to: formData.get('To') as string, // Your Twilio number
      body: formData.get('Body') as string,
      numMedia: formData.get('NumMedia') as string,
      mediaUrl0: formData.get('MediaUrl0') as string,
      fromCity: formData.get('FromCity') as string,
      fromState: formData.get('FromState') as string,
      fromCountry: formData.get('FromCountry') as string,
    };

    // ✅ Verify Twilio signature for security
    const signature = request.headers.get('x-twilio-signature');
    const url = request.url;
    const params = Object.fromEntries(formData.entries());

    if (!verifyTwilioSignature(url, params, signature)) {
      console.error('❌ Invalid Twilio signature for inbound SMS');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.log('📥 Inbound SMS received:', {
      sid: inboundData.messageSid,
      from: inboundData.from,
      to: inboundData.to,
      preview: inboundData.body?.substring(0, 50) + '...',
      location: `${inboundData.fromCity}, ${inboundData.fromState}, ${inboundData.fromCountry}`,
    });

    // Validate required fields
    if (!inboundData.messageSid || !inboundData.from || !inboundData.body) {
      console.error('❌ Invalid inbound SMS data');
      return NextResponse.json({ error: 'Invalid SMS data' }, { status: 400 });
    }

    // Step 1: Look up conversation mapping (this tells us which user to route to)
    console.log('🔍 Looking up conversation mapping...');
    let conversation = await db.query.smsConversations.findFirst({
      where: and(
        eq(smsConversations.contactPhone, inboundData.from),
        eq(smsConversations.twilioNumber, inboundData.to)
      ),
      orderBy: [desc(smsConversations.lastMessageAt)],
    });

    if (!conversation) {
      console.warn('⚠️ No conversation found for phone pair:', {
        from: inboundData.from,
        to: inboundData.to,
      });

      // Fallback: Try to find contact by phone number
      const matchedContact = await db.query.contacts.findFirst({
        where: or(
          eq(contacts.phone, inboundData.from),
          // Try without + prefix
          eq(contacts.phone, inboundData.from.replace('+', '')),
          // Try with E.164 format variations
          eq(contacts.phone, inboundData.from.replace(/[^\d]/g, '')),
        ),
      });

      if (!matchedContact) {
        console.error('❌ Contact not found - cannot route inbound SMS');
        return NextResponse.json({
          message: 'Contact not found. User must initiate conversation first.',
          from: inboundData.from,
        }, { status: 200 }); // Return 200 to avoid Twilio retries
      }

      // Create new conversation mapping
      console.log('✅ Found contact by phone lookup, creating conversation mapping');
      const [newConversation] = await db.insert(smsConversations).values({
        userId: matchedContact.userId,
        contactId: matchedContact.id,
        contactPhone: inboundData.from,
        twilioNumber: inboundData.to,
        lastMessageAt: new Date(),
        messageCount: 1,
      }).returning();

      // Use the new conversation for routing
      conversation = newConversation;
    }

    console.log('✅ Routed inbound SMS:', {
      userId: conversation.userId,
      contactId: conversation.contactId,
      messageCount: (conversation.messageCount || 0) + 1,
    });

    // Step 2: Save inbound SMS to database
    const [inboundSMS] = await db.insert(smsMessages).values({
      userId: conversation.userId,
      contactId: conversation.contactId,
      toPhone: inboundData.to, // Your Twilio number
      fromPhone: inboundData.from, // Contact's phone
      messageBody: inboundData.body,
      twilioSid: inboundData.messageSid,
      twilioStatus: 'received',
      direction: 'inbound', // ← KEY: This marks it as incoming
      costUsd: '0', // Inbound SMS are usually free
      priceChargedUsd: '0',
      sentAt: new Date(),
      deliveredAt: new Date(),
    }).returning();

    console.log('✅ Inbound SMS saved to database:', inboundSMS.id);

    // Step 3: Add to communication timeline
    await db.insert(contactCommunications).values({
      userId: conversation.userId,
      contactId: conversation.contactId,
      type: 'sms_received', // ← This shows as "Received" in timeline
      direction: 'inbound',
      body: inboundData.body,
      snippet: inboundData.body.substring(0, 200),
      smsId: inboundSMS.id,
      status: 'received',
      occurredAt: new Date(),
      metadata: {
        twilioSid: inboundData.messageSid,
        numMedia: inboundData.numMedia,
        mediaUrl: inboundData.mediaUrl0,
        location: {
          city: inboundData.fromCity,
          state: inboundData.fromState,
          country: inboundData.fromCountry,
        },
      } as any,
    });

    console.log('✅ Added to communication timeline');

    // Step 4: Update conversation tracking
    await db.update(smsConversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`${smsConversations.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(smsConversations.id, conversation.id));

    console.log('✅ Conversation tracking updated');

    // Step 5: Log audit trail
    await logSMSAudit({
      userId: conversation.userId,
      smsId: inboundSMS.id,
      action: 'received',
      metadata: {
        from: inboundData.from,
        contactId: conversation.contactId,
        messageLength: inboundData.body.length,
        hasMedia: inboundData.numMedia && parseInt(inboundData.numMedia) > 0,
      },
    });

    console.log('✅ Audit log created');

    // Optional: Send auto-reply with TwiML
    // Uncomment if you want to send automatic replies
    /*
    const twiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Thanks for your message! We'll get back to you soon.</Message>
      </Response>
    `;
    
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Inbound SMS processed successfully',
      smsId: inboundSMS.id,
    });

  } catch (error: any) {
    console.error('❌ Inbound SMS processing error:', error);
    console.error('Error stack:', error.stack);
    
    // Return 200 to avoid Twilio retries on processing errors
    return NextResponse.json({
      error: 'Failed to process inbound SMS',
      details: error.message,
    }, { status: 200 });
  }
}

/**
 * GET endpoint for testing/verification
 */
export async function GET() {
  return NextResponse.json({
    service: 'Twilio Inbound SMS Webhook',
    status: 'active',
    endpoint: '/api/webhooks/twilio/inbound',
    instructions: 'Configure this URL in Twilio Console under Phone Numbers > Manage > Active Numbers > [Your Number] > Messaging Configuration',
  });
}

/**
 * Verify Twilio webhook signature using HMAC-SHA1
 * Prevents webhook spoofing attacks
 *
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, any>,
  signature: string | null
): boolean {
  if (!signature) {
    console.warn('⚠️ No X-Twilio-Signature header found');
    return false;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('❌ TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  try {
    // 1. Sort parameters alphabetically by key
    const sortedKeys = Object.keys(params).sort();

    // 2. Concatenate key-value pairs (URL + key1value1 + key2value2 + ...)
    let data = url;
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    // 3. Compute HMAC-SHA1 hash with auth token as key
    const hmac = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    // 4. Compare computed signature with received signature
    const isValid = hmac === signature;

    if (!isValid) {
      console.error('❌ Signature mismatch:', {
        expected: hmac,
        received: signature,
        url,
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

