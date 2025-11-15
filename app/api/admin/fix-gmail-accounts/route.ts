/**
 * Admin endpoint to diagnose and fix Gmail accounts with userId issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Gmail Fix] Checking Gmail accounts for user:', user.id);

    // 2. Find all Gmail accounts
    const allGmailAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.emailProvider, 'gmail'),
    });

    console.log(`[Gmail Fix] Found ${allGmailAccounts.length} Gmail accounts`);

    // 3. Find Gmail accounts with issues
    const problemAccounts = allGmailAccounts.filter(acc =>
      !acc.userId || acc.userId !== user.id
    );

    console.log(`[Gmail Fix] Found ${problemAccounts.length} Gmail accounts with userId issues`);

    // 4. Find user's Gmail accounts specifically
    const userGmailAccounts = allGmailAccounts.filter(acc =>
      acc.userId === user.id
    );

    return NextResponse.json({
      success: true,
      userId: user.id,
      userEmail: user.email,
      totalGmailAccounts: allGmailAccounts.length,
      userGmailAccounts: userGmailAccounts.length,
      problemAccounts: problemAccounts.length,
      accounts: allGmailAccounts.map(acc => ({
        id: acc.id,
        emailAddress: acc.emailAddress,
        userId: acc.userId,
        hasIssue: !acc.userId || acc.userId !== user.id,
        nylasGrantId: acc.nylasGrantId,
      })),
    });

  } catch (error) {
    console.error('[Gmail Fix] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check Gmail accounts',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Gmail Fix] Fixing Gmail accounts for user:', user.id, user.email);

    // 2. Find Gmail accounts that match user's email but have wrong/null userId
    const gmailAccountsToFix = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.emailAddress, user.email || ''),
    });

    console.log(`[Gmail Fix] Found ${gmailAccountsToFix.length} accounts with email:`, user.email);

    const fixed = [];
    const errors = [];

    // 3. Fix each account
    for (const account of gmailAccountsToFix) {
      if (!account.userId || account.userId !== user.id) {
        try {
          console.log('[Gmail Fix] Fixing account:', account.id, account.emailAddress);

          await db.update(emailAccounts)
            .set({
              userId: user.id,
              updatedAt: new Date(),
            })
            .where(eq(emailAccounts.id, account.id));

          fixed.push({
            id: account.id,
            emailAddress: account.emailAddress,
            oldUserId: account.userId,
            newUserId: user.id,
          });

          console.log('[Gmail Fix] ✅ Fixed account:', account.id);
        } catch (error) {
          console.error('[Gmail Fix] ❌ Failed to fix account:', account.id, error);
          errors.push({
            id: account.id,
            emailAddress: account.emailAddress,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      fixed: fixed.length,
      errors: errors.length,
      details: {
        fixed,
        errors,
      },
    });

  } catch (error) {
    console.error('[Gmail Fix] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix Gmail accounts',
    }, { status: 500 });
  }
}
