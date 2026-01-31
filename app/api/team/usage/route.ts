
export const dynamic = 'force-dynamic';
/**
 * Team Usage API - Aggregate usage statistics
 * GET /api/team/usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth/permissions';
import { getOrganizationAIUsage } from '@/lib/usage/ai-tracker';
import { getOrganizationStorage } from '@/lib/usage/storage-calculator';
import { db } from '@/lib/db/drizzle';
import { smsUsage, users } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const context = await requireOrgAdmin();
    
    if (!context.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    // Get date range (default: current month)
    const now = new Date();
    const periodStart = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Get all users in organization
    const orgUsers = await db.query.users.findMany({
      where: eq(users.organizationId, context.organizationId),
    });
    
    const userIds = orgUsers.map(u => u.id);
    
    // 1. SMS Usage
    const smsRecords = await db.query.smsUsage.findMany({
      where: and(
        gte(smsUsage.periodStart, periodStart),
        lte(smsUsage.periodEnd, periodEnd)
      ),
    });
    
    const smsFiltered = smsRecords.filter(r => userIds.includes(r.userId));
    const totalSMS = smsFiltered.reduce((sum, r) => sum + (r.totalMessagesSent || 0), 0);
    const smsCost = smsFiltered.reduce((sum, r) => sum + parseFloat(r.totalChargedUsd || '0'), 0);
    
    // 2. AI Usage
    const aiUsage = await getOrganizationAIUsage(context.organizationId, periodStart, periodEnd);
    
    // 3. Storage Usage
    const storageUsage = await getOrganizationStorage(context.organizationId, periodStart, periodEnd);
    
    // 4. Calculate totals
    const totalCost = smsCost + aiUsage.totalCost + storageUsage.total.overageCost;
    
    return NextResponse.json({
      success: true,
      usage: {
        periodStart,
        periodEnd,
        sms: {
          messages: totalSMS,
          cost: smsCost,
        },
        ai: {
          requests: aiUsage.totalRequests,
          cost: aiUsage.totalCost,
          byUser: aiUsage.byUser,
        },
        storage: {
          totalGb: storageUsage.total.totalGb,
          overageGb: storageUsage.total.overageGb,
          cost: storageUsage.total.overageCost,
          byUser: storageUsage.byUser,
        },
        totalCost,
        userCount: orgUsers.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch team usage:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

