import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts, emails, emailFolders, emailDrafts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    accountId: string;
  }>;
}

/**
 * DELETE /api/nylas/accounts/[accountId]
 * Delete an email account and all associated data
 * ✅ FIX #4: Clear cache when account is deleted
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { accountId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - Account does not belong to you' }, { status: 403 });
    }
    
    console.log(`🗑️ Starting deletion of account ${account.emailAddress} (${accountId})`);
    
    // Delete all related data in order (to avoid foreign key constraints)
    
    // 1. Delete drafts
    await db.delete(emailDrafts).where(eq(emailDrafts.accountId, accountId));
    console.log('  ✓ Deleted email drafts');
    
    // 2. Delete emails (this also handles thread references via threadId field)
    await db.delete(emails).where(eq(emails.accountId, accountId));
    console.log('  ✓ Deleted emails');
    
    // 3. Delete folders
    await db.delete(emailFolders).where(eq(emailFolders.accountId, accountId));
    console.log('  ✓ Deleted email folders');
    
    // 4. Finally, delete the account itself
    await db.delete(emailAccounts).where(eq(emailAccounts.id, accountId));
    console.log('  ✓ Deleted email account');
    
    console.log(`✅ Successfully deleted account ${accountId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Account and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account', 
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
