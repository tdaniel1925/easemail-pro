/**
 * SMS Send API Endpoint
 * Comprehensive implementation with all enterprise features
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages, smsUsage, contactCommunications, smsConversations } from '@/lib/db/schema';
import { sendSMSWithTestMode } from '@/lib/sms/twilio-client';
import { checkRateLimit } from '@/lib/sms/rate-limiter';
import { parseInternationalPhone, isSMSSupportedCountry } from '@/lib/utils/phone';
import { calculateSMSSegments, validateSMSLength } from '@/lib/sms/character-counter';
import { logSMSAudit } from '@/lib/sms/audit-service';
import { checkSMSConsent } from '@/lib/sms/audit-service';
import { calculateSMSCostAndPrice, getSMSPricingWarning } from '@/lib/sms/pricing';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authenticate
    const supabase = await createClient();
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

    // HIGH PRIORITY FIX: Calculate cost and price based on destination country
    const pricing = calculateSMSCostAndPrice(phoneValidation.country, segments.messageCount);
    const totalCost = pricing.price; // What we charge the customer
    const estimatedCost = pricing.cost; // What we expect to pay Twilio

    // Show pricing warning if destination is expensive
    const pricingWarning = getSMSPricingWarning(phoneValidation.country);

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
      country: phoneValidation.country || 'Unknown',
      segments: segments.messageCount,
      encoding: segments.encoding,
      estimatedCost: estimatedCost,
      chargedPrice: totalCost,
      pricePerSegment: pricing.pricePerSegment,
      warning: pricingWarning,
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
      costUsd: (result.cost || estimatedCost).toString(), // Use Twilio's actual cost or our estimate
      priceChargedUsd: totalCost.toString(), // Country-specific pricing
      direction: 'outbound',
      sentAt: new Date(),
    }).returning();

    // 9. Communication timeline
    if (contactId) {
      try {
        console.log('📝 Adding SMS to communication timeline for contact:', contactId);
        
        const timelineEntry = await db.insert(contactCommunications).values({
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
          } as any,
          occurredAt: new Date(),
        }).returning();
        
        console.log('✅ SMS added to timeline successfully:', timelineEntry[0]?.id);
      } catch (timelineError: any) {
        // Don't fail the whole SMS send if timeline insert fails
        console.error('⚠️ Failed to add to communication timeline:', timelineError);
        console.error('⚠️ Timeline error details:', {
          message: timelineError.message,
          code: timelineError.code,
          detail: timelineError.detail,
        });
        console.warn('SMS was still sent successfully. Timeline feature may need migration.');
      }
    } else {
      console.warn('⚠️ No contactId provided, skipping timeline entry');
    }

    // 10. Track SMS conversation for inbound routing
    if (contactId) {
      try {
        console.log('🔗 Tracking SMS conversation for inbound routing...');
        
        // Create or update conversation record
        await db.insert(smsConversations).values({
          userId: user.id,
          contactId: contactId,
          contactPhone: phoneValidation.e164!,
          twilioNumber: process.env.TWILIO_PHONE_NUMBER || '',
          lastMessageAt: new Date(),
          messageCount: 1,
        }).onConflictDoUpdate({
          target: [smsConversations.contactPhone, smsConversations.twilioNumber],
          set: {
            lastMessageAt: new Date(),
            contactId: contactId, // Update in case contact changed
            messageCount: sql`${smsConversations.messageCount} + 1`,
            updatedAt: new Date(),
          },
        });
        
        console.log('✅ Conversation tracked for inbound SMS routing');
      } catch (convError: any) {
        // Don't fail the whole SMS send if conversation tracking fails
        console.error('⚠️ Failed to track conversation:', convError.message);
      }
    }

    // 11. Audit Log
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

    // 12. Update usage tracking
    await updateUsageTracking(user.id, result.cost || estimatedCost, totalCost);

    // 13. Success response
    console.log('✅ SMS API Success - returning response with twilioSid:', result.sid);
    
    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      smsId: smsRecord.id,
      twilioSid: result.sid,
      status: result.status,
      cost: totalCost,
      segments: segments.messageCount,
      encoding: segments.encoding,
      country: phoneValidation.country,
      pricePerSegment: pricing.pricePerSegment,
      warning: pricingWarning || undefined,
    });

  } catch (error: any) {
    console.error('❌ SMS send error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send SMS', 
        details: error.message,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

async function updateUsageTracking(userId: string, cost: number, charged: number) {
  try {
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
          totalMessagesSent: (existingUsage.totalMessagesSent || 0) + 1,
          totalCostUsd: (parseFloat(existingUsage.totalCostUsd || '0') + cost).toFixed(2),
          totalChargedUsd: (parseFloat(existingUsage.totalChargedUsd || '0') + charged).toFixed(2),
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
  } catch (usageError: any) {
    // Don't fail SMS send if usage tracking fails
    console.warn('⚠️ Failed to update SMS usage tracking:', usageError.message);
    console.warn('SMS was still sent successfully. Usage tracking may need migration.');
  }
}

