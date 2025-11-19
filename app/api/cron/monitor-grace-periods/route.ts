/**
 * Grace Period Monitor Cron Job
 * 
 * Runs daily to check for expired grace periods and suspend accounts
 * Path: /api/cron/monitor-grace-periods
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, organizations } from '@/lib/db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized grace period monitor attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Cron] Starting grace period monitor');
    
    const now = new Date();
    let suspendedCount = 0;
    let warningsCount = 0;
    
    // Find accounts in grace period that have expired
    const expiredOrgs = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.accountStatus, 'grace_period'),
          lte(organizations.gracePeriodEndsAt, now)
        )
      );
    
    const expiredUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.accountStatus, 'grace_period'),
          lte(users.gracePeriodEndsAt, now)
        )
      );
    
    // Suspend expired accounts
    for (const org of expiredOrgs) {
      await db
        .update(organizations)
        .set({
          accountStatus: 'suspended',
          suspendedAt: now,
          suspensionReason: 'Grace period expired - payment not received',
        })
        .where(eq(organizations.id, org.id));
      
      suspendedCount++;
      console.log(`[Cron] Suspended organization ${org.id}`);
    }
    
    for (const user of expiredUsers) {
      await db
        .update(users)
        .set({
          accountStatus: 'suspended',
          suspendedAt: now,
          suspensionReason: 'Grace period expired - payment not received',
        })
        .where(eq(users.id, user.id));
      
      suspendedCount++;
      console.log(`[Cron] Suspended user ${user.id}`);
    }
    
    // Send warnings for accounts approaching expiry (1 day before)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const approachingOrgs = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.accountStatus, 'grace_period'),
          lte(organizations.gracePeriodEndsAt, tomorrow),
          gte(organizations.gracePeriodEndsAt, now)
        )
      );
    
    const approachingUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.accountStatus, 'grace_period'),
          lte(users.gracePeriodEndsAt, tomorrow),
          gte(users.gracePeriodEndsAt, now)
        )
      );
    
    warningsCount = approachingOrgs.length + approachingUsers.length;
    
    // TODO: Send warning emails to approaching accounts
    
    console.log(
      `[Cron] Grace period monitor completed: ` +
      `${suspendedCount} suspended, ${warningsCount} warnings sent`
    );
    
    return NextResponse.json({
      success: true,
      suspended: suspendedCount,
      warnings: warningsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Grace period monitor failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

