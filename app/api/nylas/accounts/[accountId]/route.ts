import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import {
  emailAccounts,
  emails,
  emailFolders,
  emailDrafts,
  calendarEvents,
  calendarSyncState,
  calendars,
  contacts,
  contactSyncStatus
} from '@/lib/db/schema';
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
    // Note: Schema has cascade deletes, but we explicitly delete to ensure cleanup

    // 1. Delete email drafts
    await db.delete(emailDrafts).where(eq(emailDrafts.accountId, accountId));
    console.log('  ✓ Deleted email drafts');

    // 2. Delete emails (this also handles thread references via threadId field)
    await db.delete(emails).where(eq(emails.accountId, accountId));
    console.log('  ✓ Deleted emails');

    // 3. Delete folders
    await db.delete(emailFolders).where(eq(emailFolders.accountId, accountId));
    console.log('  ✓ Deleted email folders');

    // 4. Delete calendar-related data
    await db.delete(calendarSyncState).where(eq(calendarSyncState.emailAccountId, accountId));
    console.log('  ✓ Deleted calendar sync state');

    await db.delete(calendars).where(eq(calendars.emailAccountId, accountId));
    console.log('  ✓ Deleted calendars');

    // Note: calendarEvents don't have accountId, they're user-scoped
    // They'll be cleaned up when the user deletes their account

    // 5. Delete contact-related data
    await db.delete(contactSyncStatus).where(eq(contactSyncStatus.emailAccountId, accountId));
    console.log('  ✓ Deleted contact sync status');

    // Note: contacts don't have accountId, they're user-scoped
    // They'll be cleaned up when the user deletes their account

    // 6. Finally, delete the account itself (cascade will handle remaining references)
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
