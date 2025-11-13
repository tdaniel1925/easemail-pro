import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, smsUsage, aiUsage, storageUsage, emailAccounts, emails } from '@/lib/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET: Fetch user usage statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch SMS usage
    const smsStats = await db
      .select({
        totalMessages: sql<number>`sum(total_messages_sent)::int`,
        totalCost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(smsUsage)
      .where(and(
        eq(smsUsage.userId, userId),
        gte(smsUsage.periodStart, startDate)
      ));

    // Fetch AI usage
    const aiStats = await db
      .select({
        totalRequests: sql<number>`sum(request_count)::int`,
        totalCost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        gte(aiUsage.periodStart, startDate)
      ));

    // Fetch storage usage
    const storageStats = await db
      .select({
        totalUsageBytes: sql<number>`sum(total_bytes)::bigint`,
      })
      .from(storageUsage)
      .where(and(
        eq(storageUsage.userId, userId),
        gte(storageUsage.periodStart, startDate)
      ));

    // Fetch email accounts count
    const [{ emailAccountCount }] = await db
      .select({ emailAccountCount: sql<number>`count(*)::int` })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId));

    // Fetch emails count (join through emailAccounts)
    const [{ emailCount }] = await db
      .select({ emailCount: sql<number>`count(*)::int` })
      .from(emails)
      .innerJoin(emailAccounts, eq(emails.accountId, emailAccounts.id))
      .where(eq(emailAccounts.userId, userId));

    // Get SMS usage by day
    const smsByDay = await db
      .select({
        date: sql<string>`date_trunc('day', period_start)::text`,
        count: sql<number>`sum(total_messages_sent)::int`,
        cost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(smsUsage)
      .where(and(
        eq(smsUsage.userId, userId),
        gte(smsUsage.periodStart, startDate)
      ))
      .groupBy(sql`date_trunc('day', period_start)`)
      .orderBy(sql`date_trunc('day', period_start)`);

    // Get AI usage by day
    const aiByDay = await db
      .select({
        date: sql<string>`date_trunc('day', period_start)::text`,
        count: sql<number>`sum(request_count)::int`,
        cost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.userId, userId),
        gte(aiUsage.periodStart, startDate)
      ))
      .groupBy(sql`date_trunc('day', period_start)`)
      .orderBy(sql`date_trunc('day', period_start)`);

    return NextResponse.json({
      success: true,
      usage: {
        sms: {
          totalMessages: smsStats[0]?.totalMessages || 0,
          totalCost: parseFloat(smsStats[0]?.totalCost || '0'),
          byDay: smsByDay,
        },
        ai: {
          totalRequests: aiStats[0]?.totalRequests || 0,
          totalCost: parseFloat(aiStats[0]?.totalCost || '0'),
          byDay: aiByDay,
        },
        storage: {
          totalUsageBytes: storageStats[0]?.totalUsageBytes || 0,
          totalUsageGB: ((storageStats[0]?.totalUsageBytes || 0) / 1024 / 1024 / 1024).toFixed(2),
        },
        data: {
          emailAccounts: emailAccountCount,
          totalEmails: emailCount,
        },
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Usage stats fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 });
  }
}
