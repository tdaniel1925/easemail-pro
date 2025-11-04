/**
 * SMS Billing & Usage API
 * Returns usage statistics and billing information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { smsUsage, smsAuditLog } from '@/lib/db/schema';
import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { generateSMSReceipt } from '@/lib/sms/audit-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'current', 'history', 'receipt'
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const receiptId = searchParams.get('receiptId');

    // Generate receipt
    if (action === 'receipt' && receiptId) {
      const receipt = await generateSMSReceipt(receiptId);
      if (!receipt) {
        return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, receipt });
    }

    // Current period usage
    if (action === 'current') {
      const now = new Date();
      const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const currentUsage = await db.query.smsUsage.findFirst({
        where: and(
          eq(smsUsage.userId, user.id),
          gte(smsUsage.periodStart, currentPeriodStart),
          lte(smsUsage.periodEnd, currentPeriodEnd)
        ),
      });

      return NextResponse.json({
        success: true,
        usage: currentUsage || {
          totalMessagesSent: 0,
          totalMessagesReceived: 0,
          totalCostUsd: '0.00',
          totalChargedUsd: '0.00',
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
        },
      });
    }

    // Historical usage
    if (action === 'history') {
      const filters = [eq(smsUsage.userId, user.id)];

      if (periodStart) {
        filters.push(gte(smsUsage.periodStart, new Date(periodStart)));
      }

      if (periodEnd) {
        filters.push(lte(smsUsage.periodEnd, new Date(periodEnd)));
      }

      const history = await db.query.smsUsage.findMany({
        where: and(...filters),
        orderBy: [desc(smsUsage.periodStart)],
        limit: 12, // Last 12 months
      });

      // Calculate totals
      const totals = history.reduce(
        (acc, period) => ({
          messages: acc.messages + (period.totalMessagesSent || 0),
          cost: acc.cost + parseFloat(period.totalCostUsd || '0'),
          charged: acc.charged + parseFloat(period.totalChargedUsd || '0'),
        }),
        { messages: 0, cost: 0, charged: 0 }
      );

      return NextResponse.json({
        success: true,
        history,
        totals: {
          totalMessages: totals.messages,
          totalCost: totals.cost.toFixed(2),
          totalCharged: totals.charged.toFixed(2),
          profit: (totals.charged - totals.cost).toFixed(2),
        },
      });
    }

    // Audit log
    if (action === 'audit') {
      const auditLog = await db.query.smsAuditLog.findMany({
        where: eq(smsAuditLog.userId, user.id),
        orderBy: [desc(smsAuditLog.createdAt)],
        limit: 100,
      });

      return NextResponse.json({ success: true, auditLog });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Billing API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data', details: error.message },
      { status: 500 }
    );
  }
}

