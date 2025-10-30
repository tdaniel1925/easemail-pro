import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID required' },
        { status: 400 }
      );
    }

    console.log('🛑 Stopping sync for account:', accountId);

    // Update account status to 'active' (stopped syncing)
    await db.update(emailAccounts)
      .set({
        syncStatus: 'active',
        syncProgress: 0,
        syncCursor: null, // Reset cursor so next sync starts fresh
      })
      .where(eq(emailAccounts.id, accountId));

    console.log('✅ Sync stopped for account:', accountId);

    return NextResponse.json({
      success: true,
      message: 'Sync stopped successfully',
    });
  } catch (error) {
    console.error('❌ Stop sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop sync' },
      { status: 500 }
    );
  }
}

