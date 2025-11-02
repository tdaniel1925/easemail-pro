import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * POST /api/user/[userId]/last-login
 * Update user's last login timestamp
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;

    await db.update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating last login:', error);
    return NextResponse.json({ error: 'Failed to update last login' }, { status: 500 });
  }
}

