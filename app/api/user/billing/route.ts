/**
 * User Billing API - Individual user invoices and billing info
 * GET /api/user/billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/permissions';
import { getInvoices } from '@/lib/billing/invoice-generator';
import { getCurrentMonthAIUsage } from '@/lib/usage/ai-tracker';
import { getCurrentMonthStorage } from '@/lib/usage/storage-calculator';
import { db } from '@/lib/db/drizzle';
import { smsUsage, subscriptions } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth();
    
    // Get user's subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: context.organizationId
        ? eq(subscriptions.organizationId, context.organizationId)
        : eq(subscriptions.userId, context.userId),
    });
    
    // Get current month usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // SMS Usage
    const sms = await db.query.smsUsage.findFirst({
      where: and(
        eq(smsUsage.userId, context.userId),
        gte(smsUsage.periodStart, periodStart),
        lte(smsUsage.periodEnd, periodEnd)
      ),
    });
    
    // AI Usage
    const aiUsage = await getCurrentMonthAIUsage(context.userId);
    
    // Storage Usage
    const storage = await getCurrentMonthStorage(context.userId);
    
    // Recent invoices (last 12)
    const invoices = await getInvoices(
      context.organizationId,
      context.organizationId ? undefined : context.userId,
      12
    );
    
    // Calculate current month cost
    const smsCost = parseFloat(sms?.totalChargedUsd || '0');
    const aiCost = aiUsage.totalCost;
    const storageCost = storage.overageCost;
    const subscriptionCost = parseFloat(subscription?.pricePerMonth || '0');
    
    const currentMonthCost = subscriptionCost + smsCost + aiCost + storageCost;
    
    return NextResponse.json({
      success: true,
      billing: {
        subscription: subscription ? {
          planName: subscription.planName,
          billingCycle: subscription.billingCycle,
          pricePerMonth: parseFloat(subscription.pricePerMonth || '0'),
          seats: subscription.seatsUsed,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        } : null,
        currentMonth: {
          periodStart,
          periodEnd,
          subscription: subscriptionCost,
          sms: {
            messages: sms?.totalMessagesSent || 0,
            cost: smsCost,
          },
          ai: {
            requests: aiUsage.totalRequests,
            cost: aiCost,
            byFeature: aiUsage.byFeature,
          },
          storage: {
            totalGb: storage.totalGb,
            overageGb: storage.overageGb,
            cost: storageCost,
          },
          total: currentMonthCost,
        },
        recentInvoices: invoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          total: parseFloat(inv.totalUsd || '0'),
          status: inv.status,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          createdAt: inv.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch user billing:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

