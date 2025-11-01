/**
 * SMS Send API Endpoint
 * Comprehensive implementation with all enterprise features
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages, smsUsage, contactCommunications } from '@/lib/db/schema';
import { sendSMSWithTestMode } from '@/lib/sms/twilio-client';
import { checkRateLimit } from '@/lib/sms/rate-limiter';
import { parseInternationalPhone, isSMSSupportedCountry } from '@/lib/utils/phone';
import { calculateSMSSegments, validateSMSLength } from '@/lib/sms/character-counter';
import { logSMSAudit } from '@/lib/sms/audit-service';
import { checkSMSConsent } from '@/lib/sms/audit-service';
import { eq, gte, lte, and } from 'drizzle-orm';

const SMS_PRICE = parseFloat(process.env.SMS_PRICE_PER_MESSAGE || '0.05');
const SMS_COST = parseFloat(process.env.SMS_COST_PER_MESSAGE || '0.0075');

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authenticate
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json();
    const { contactId, toPhone, message } = body;

    if (!toPhone || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // 3. Rate Limiting
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      await logSMSAudit({
        userId: user.id,
        action: 'rate_limit_exceeded',
        metadata: { reason: rateLimit.reason },
      });
      
      return NextResponse.json(
        { 
          error: rateLimit.reason,
          resetAt: rateLimit.resetAt,
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    // 4. Phone Validation (International)
    const phoneValidation = parseInternationalPhone(toPhone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Check country support
    if (phoneValidation.country && !isSMSSupportedCountry(phoneValidation.country)) {
      return NextResponse.json(
        { error: `SMS not supported in ${phoneValidation.country}` },
        { status: 400 }
      );
    }

    // 5. Character Encoding & Length Validation
    const lengthValidation = validateSMSLength(message, 10);
    if (!lengthValidation.valid) {
      return NextResponse.json(
        { error: lengthValidation.error, segments: lengthValidation.segments },
        { status: 400 }
      );
    }

    const segments = lengthValidation.segments;
    const totalCost = segments.messageCount * SMS_PRICE;

    // 6. Privacy: Check consent
    if (contactId) {
      const hasConsent = await checkSMSConsent(contactId);
      if (!hasConsent) {
        console.warn('SMS sent without explicit consent for contact:', contactId);
        // Continue anyway but log it
      }
    }

    console.log('📤 Sending SMS:', {
      to: phoneValidation.e164,
      segments: segments.messageCount,
      encoding: segments.encoding,
      cost: totalCost,
    });

    // 7. Send with Test Mode Support
    const result = await sendSMSWithTestMode({
      to: phoneValidation.e164!,
      message: message,
    });

    if (!result.success) {
      await logSMSAudit({
        userId: user.id,
        action: 'send_failed',
        metadata: { error: result.error, phone: phoneValidation.e164 },
      });
      
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // 8. Save to database
    const [smsRecord] = await db.insert(smsMessages).values({
      userId: user.id,
      contactId: contactId || null,
      toPhone: phoneValidation.e164!,
      fromPhone: process.env.TWILIO_PHONE_NUMBER || '',
      messageBody: message,
      twilioSid: result.sid,
      twilioStatus: result.status || 'queued',
      costUsd: (result.cost || SMS_COST).toString(),
      priceChargedUsd: totalCost.toString(),
      direction: 'outbound',
      sentAt: new Date(),
    }).returning();

    // 9. Communication timeline
    if (contactId) {
      await db.insert(contactCommunications).values({
        userId: user.id,
        contactId: contactId,
        type: 'sms_sent',
        direction: 'outbound',
        body: message,
        snippet: message.substring(0, 200),
        smsId: smsRecord.id,
        status: result.status || 'queued',
        metadata: {
          cost: totalCost,
          segments: segments.messageCount,
          encoding: segments.encoding,
          country: phoneValidation.country,
        },
        occurredAt: new Date(),
      });
    }

    // 10. Audit Log
    await logSMSAudit({
      userId: user.id,
      smsId: smsRecord.id,
      action: 'sent',
      amountCharged: totalCost,
      metadata: {
        twilioSid: result.sid,
        segments: segments.messageCount,
        duration: Date.now() - startTime,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // 11. Update usage tracking
    await updateUsageTracking(user.id, result.cost || SMS_COST, totalCost);

    // 12. Success response
    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      smsId: smsRecord.id,
      twilioSid: result.sid,
      cost: totalCost,
      segments: segments.messageCount,
      encoding: segments.encoding,
    });

  } catch (error: any) {
    console.error('❌ SMS send error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS', details: error.message },
      { status: 500 }
    );
  }
}

async function updateUsageTracking(userId: string, cost: number, charged: number) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const existingUsage = await db.query.smsUsage.findFirst({
    where: and(
      eq(smsUsage.userId, userId),
      gte(smsUsage.periodStart, periodStart),
      lte(smsUsage.periodEnd, periodEnd)
    ),
  });

  if (existingUsage) {
    await db.update(smsUsage)
      .set({
        totalMessagesSent: existingUsage.totalMessagesSent + 1,
        totalCostUsd: (parseFloat(existingUsage.totalCostUsd) + cost).toFixed(2),
        totalChargedUsd: (parseFloat(existingUsage.totalChargedUsd) + charged).toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(smsUsage.id, existingUsage.id));
  } else {
    await db.insert(smsUsage).values({
      userId,
      periodStart,
      periodEnd,
      totalMessagesSent: 1,
      totalCostUsd: cost.toFixed(2),
      totalChargedUsd: charged.toFixed(2),
    });
  }
}

