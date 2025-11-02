import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { and, eq, lt, sql } from 'drizzle-orm';

/**
 * POST /api/cron/cleanup-deactivated-users
 * Deletes users that have been deactivated for more than 60 days
 * Should be called by a cron job (daily or weekly)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 Starting cleanup of deactivated users...');

    // Calculate 60 days ago
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Find users deactivated more than 60 days ago
    const usersToDelete = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.accountStatus, 'deactivated'),
          lt(users.deactivatedAt, sixtyDaysAgo)
        )
      );

    console.log(`📋 Found ${usersToDelete.length} users to delete`);

    if (usersToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to delete',
        deletedCount: 0,
      });
    }

    // Delete users
    const userIds = usersToDelete.map(u => u.id);
    
    for (const userId of userIds) {
      await db.delete(users).where(eq(users.id, userId));
      console.log(`🗑️  Deleted user: ${userId}`);
    }

    console.log(`✅ Cleanup complete. Deleted ${usersToDelete.length} users.`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${usersToDelete.length} user(s)`,
      deletedCount: usersToDelete.length,
      deletedUsers: usersToDelete.map(u => ({
        id: u.id,
        email: u.email,
        deactivatedAt: u.deactivatedAt,
      })),
    });

  } catch (error: any) {
    console.error('❌ Error during user cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/cron/cleanup-deactivated-users
 * Preview users that would be deleted (for testing)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate 60 days ago
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Find users that would be deleted
    const usersToDelete = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        deactivatedAt: users.deactivatedAt,
        daysDeactivated: sql<number>`EXTRACT(DAY FROM (NOW() - ${users.deactivatedAt}))`,
      })
      .from(users)
      .where(
        and(
          eq(users.accountStatus, 'deactivated'),
          lt(users.deactivatedAt, sixtyDaysAgo)
        )
      );

    return NextResponse.json({
      success: true,
      message: `Found ${usersToDelete.length} user(s) that would be deleted`,
      count: usersToDelete.length,
      users: usersToDelete,
    });

  } catch (error: any) {
    console.error('❌ Error previewing cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Preview failed',
      details: error.message,
    }, { status: 500 });
  }
}

