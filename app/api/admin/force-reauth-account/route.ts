import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/force-reauth-account
 * Force an email account to require re-authentication
 * This clears tokens and marks the account for re-auth
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.emailAddress, email),
    });

    if (!account) {
      return NextResponse.json(
        { error: `No account found for ${email}` },
        { status: 404 }
      );
    }

    // Clear tokens and force re-auth
    await db
      .update(emailAccounts)
      .set({
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        syncStatus: 'paused',
        lastError: 'Re-authentication required',
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, account.id));

    return NextResponse.json({
      success: true,
      message: `Account ${email} marked for re-authentication`,
      accountId: account.id,
      grantId: account.nylasGrantId,
    });
  } catch (error: any) {
    console.error('Force reauth error:', error);
    return NextResponse.json(
      { error: 'Failed to force re-auth' },
      { status: 500 }
    );
  }
}
