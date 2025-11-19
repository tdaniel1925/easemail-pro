/**
 * Admin Financial Reporting API
 * 
 * Provides comprehensive financial metrics and revenue reporting
 * GET /api/admin/billing/financial-report
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { 
  invoices, 
  costEntries, 
  users, 
  organizations,
  revenueSchedule,
  creditNotes,
  billingTransactions
} from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, isNotNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    // Default to current month
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startDate = periodStart ? new Date(periodStart) : defaultStart;
    const endDate = periodEnd ? new Date(periodEnd) : defaultEnd;

    // 1. Revenue Summary
    const allInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      );

    const totalRevenue = allInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);

    const pendingRevenue = allInvoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);

    const failedRevenue = allInvoices
      .filter(inv => inv.status === 'failed')
      .reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);

    // 2. Cost Summary
    const allCosts = await db
      .select()
      .from(costEntries)
      .where(
        and(
          gte(costEntries.occurredAt, startDate),
          lte(costEntries.occurredAt, endDate)
        )
      );

    const totalCosts = allCosts.reduce((sum, c) => sum + parseFloat(c.costUsd || '0'), 0);

    // 3. Profit Margin
    const profit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // 4. Revenue by Source (subscriptions vs usage)
    const subscriptionRevenue = allInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.subtotal || '0'), 0); // Simplified

    const usageRevenue = allCosts.reduce((sum, c) => sum + parseFloat(c.costUsd || '0'), 0);

    // 5. Customer Metrics
    const activeCustomers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountStatus, 'active'));

    const activeOrgs = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(eq(organizations.isActive, true));

    // 6. Top Revenue Customers
    const invoicesByCustomer = allInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((acc, inv) => {
        const key = inv.organizationId || inv.userId;
        if (!key) return acc;
        
        if (!acc[key]) {
          acc[key] = {
            id: key,
            type: inv.organizationId ? 'organization' : 'user',
            revenue: 0,
            invoiceCount: 0,
          };
        }
        
        acc[key].revenue += parseFloat(inv.total || '0');
        acc[key].invoiceCount += 1;
        
        return acc;
      }, {} as Record<string, any>);

    const topCustomers = Object.values(invoicesByCustomer)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // 7. Payment Success Rate
    const totalInvoices = allInvoices.length;
    const paidInvoices = allInvoices.filter(inv => inv.status === 'paid').length;
    const paymentSuccessRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    // 8. Monthly Recurring Revenue (MRR) - estimated from subscriptions
    const monthlySubscriptionRevenue = totalRevenue; // Simplified
    
    // 9. Churn indicators
    const suspendedAccounts = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountStatus, 'suspended'));

    // 10. Credit notes issued
    const creditNotesIssued = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          isNotNull(creditNotes.issuedAt),
          gte(creditNotes.issuedAt, startDate),
          lte(creditNotes.issuedAt, endDate)
        )
      );

    const totalCredits = creditNotesIssued.reduce(
      (sum, cn) => sum + parseFloat(cn.amountUsd || '0'),
      0
    );

    // 11. Revenue Schedule (deferred revenue)
    const deferredRevenueRecords = await db
      .select()
      .from(revenueSchedule)
      .where(eq(revenueSchedule.status, 'recognizing'));

    const deferredRevenue = deferredRevenueRecords.reduce(
      (sum, rs) => sum + parseFloat(rs.unrecognizedAmount || '0'),
      0
    );

    // 12. Daily breakdown
    const revenueByDay = allInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((acc, inv) => {
        const date = new Date(inv.createdAt!).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = 0;
        acc[date] += parseFloat(inv.total || '0');
        return acc;
      }, {} as Record<string, number>);

    const costsByDay = allCosts.reduce((acc, c) => {
      const date = new Date(c.occurredAt!).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += parseFloat(c.costUsd || '0');
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      revenue: {
        total: totalRevenue,
        pending: pendingRevenue,
        failed: failedRevenue,
        subscription: subscriptionRevenue,
        usage: usageRevenue,
        deferred: deferredRevenue,
        byDay: revenueByDay,
      },
      costs: {
        total: totalCosts,
        byDay: costsByDay,
      },
      profitability: {
        profit,
        profitMargin,
        grossMargin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0,
      },
      customers: {
        activeUsers: activeCustomers[0]?.count || 0,
        activeOrganizations: activeOrgs[0]?.count || 0,
        suspended: suspendedAccounts[0]?.count || 0,
        topCustomers,
      },
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        pending: allInvoices.filter(inv => inv.status === 'pending').length,
        failed: allInvoices.filter(inv => inv.status === 'failed').length,
        paymentSuccessRate,
      },
      credits: {
        totalIssued: creditNotesIssued.length,
        totalAmount: totalCredits,
      },
      mrr: monthlySubscriptionRevenue,
    });
  } catch (error: any) {
    console.error('[Admin] Financial report API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate financial report', details: error.message },
      { status: 500 }
    );
  }
}

