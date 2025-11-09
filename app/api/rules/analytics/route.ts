import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailRules, ruleExecutions, users } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import type { RuleAnalytics } from '@/lib/rules/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rules/analytics
 * Get rule analytics and performance stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get total rules count
    const rulesCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailRules)
      .where(eq(emailRules.userId, dbUser.id));

    // Get active rules count
    const activeRulesCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailRules)
      .where(sql`${emailRules.userId} = ${dbUser.id} AND ${emailRules.isActive} = true`);

    // Get total executions
    const executionsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ruleExecutions)
      .innerJoin(emailRules, eq(ruleExecutions.ruleId, emailRules.id))
      .where(eq(emailRules.userId, dbUser.id));

    // Get success rate
    const successCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ruleExecutions)
      .innerJoin(emailRules, eq(ruleExecutions.ruleId, emailRules.id))
      .where(sql`${emailRules.userId} = ${dbUser.id} AND ${ruleExecutions.success} = true`);

    const successRate = executionsCount[0].count > 0
      ? (successCount[0].count / executionsCount[0].count) * 100
      : 0;

    // Get top rules by triggers
    const topRules = await db
      .select({
        ruleId: emailRules.id,
        name: emailRules.name,
        timesTriggered: emailRules.executionCount,
      })
      .from(emailRules)
      .where(eq(emailRules.userId, dbUser.id))
      .orderBy(desc(emailRules.executionCount))
      .limit(10);

    // Get recent executions
    const recentExecutions = await db.query.ruleExecutions.findMany({
      where: sql`${ruleExecutions.ruleId} IN (
        SELECT id FROM email_rules WHERE user_id = ${dbUser.id}
      )`,
      orderBy: [desc(ruleExecutions.executedAt)],
      limit: 20,
    });

    // Get executions by day (last 30 days)
    const executionsByDay = await db.execute(sql`
      SELECT 
        DATE(executed_at) as date,
        COUNT(*)::int as count
      FROM rule_executions re
      INNER JOIN email_rules er ON re.rule_id = er.id
      WHERE er.user_id = ${dbUser.id}
        AND re.executed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(executed_at)
      ORDER BY DATE(executed_at) DESC
    `);

    const analytics: RuleAnalytics = {
      totalRules: rulesCount[0].count,
      activeRules: activeRulesCount[0].count,
      totalExecutions: executionsCount[0].count,
      successRate,
      topRules,
      recentExecutions,
      executionsByDay: (executionsByDay as any[]).map(row => ({
        date: row.date,
        count: row.count,
      })),
    };

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching rule analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

