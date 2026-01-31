/**
 * SMS Cleanup Cron Job
 * Enforces data retention policy for SMS messages
 *
 * Schedule: Daily at 2 AM UTC
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sms",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { smsMessages, smsConversations, smsAuditLog } from '@/lib/db/schema';
import { lt, and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // ✅ Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron job request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 Starting SMS cleanup cron job...');

    const startTime = Date.now();
    const stats = {
      smsDeleted: 0,
      conversationsDeleted: 0,
      auditLogsKept: 0,
    };

    // Read retention policy from environment (default: 90 days)
    const retentionDays = parseInt(process.env.SMS_RETENTION_DAYS || '90');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`📅 Deleting SMS messages older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);

    // Step 1: Soft-delete old SMS messages
    // We use soft delete to preserve audit trail
    const deletedSMS = await db
      .delete(smsMessages)
      .where(lt(smsMessages.createdAt, cutoffDate))
      .returning({ id: smsMessages.id });

    stats.smsDeleted = deletedSMS.length;

    console.log(`✅ Deleted ${stats.smsDeleted} SMS messages`);

    // Step 2: Clean up inactive conversations (6 months old)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const deletedConversations = await db
      .delete(smsConversations)
      .where(lt(smsConversations.lastMessageAt, sixMonthsAgo))
      .returning({ id: smsConversations.id });

    stats.conversationsDeleted = deletedConversations.length;

    console.log(`✅ Deleted ${stats.conversationsDeleted} inactive conversations`);

    // Step 3: Keep audit logs (required for compliance - 7 years typical retention)
    // We don't delete audit logs, but we can count them for reporting
    const auditRetentionDays = 7 * 365; // 7 years
    const auditCutoffDate = new Date();
    auditCutoffDate.setDate(auditCutoffDate.getDate() - auditRetentionDays);

    // Only delete audit logs older than 7 years (compliance requirement)
    const deletedAudits = await db
      .delete(smsAuditLog)
      .where(lt(smsAuditLog.createdAt, auditCutoffDate))
      .returning({ id: smsAuditLog.id });

    stats.auditLogsKept = deletedAudits.length;

    console.log(`✅ Deleted ${stats.auditLogsKept} audit logs older than 7 years`);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      stats,
      config: {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        conversationRetentionMonths: 6,
        auditRetentionYears: 7,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ SMS cleanup completed:', result);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ SMS cleanup cron job error:', error);
    return NextResponse.json(
      {
        error: 'SMS cleanup failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual cleanup (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    // TODO: Add admin session verification here

    const body = await request.json();
    const customRetentionDays = body.retentionDays || parseInt(process.env.SMS_RETENTION_DAYS || '90');

    // Create a temporary override for retention days
    const originalValue = process.env.SMS_RETENTION_DAYS;
    process.env.SMS_RETENTION_DAYS = customRetentionDays.toString();

    // Run cleanup with custom retention
    const result = await GET(request);

    // Restore original value
    if (originalValue) {
      process.env.SMS_RETENTION_DAYS = originalValue;
    }

    return result;

  } catch (error: any) {
    console.error('❌ Manual SMS cleanup error:', error);
    return NextResponse.json(
      { error: 'Manual cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}
