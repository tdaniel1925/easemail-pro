import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// DELETE: Remove an email account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const accountId = params.accountId;

    console.log('🗑️ Starting account deletion for:', accountId);

    // Delete related data first (ensures clean removal)
    console.log('🗑️ Deleting folders...');
    await db.delete(emailFolders).where(eq(emailFolders.accountId, accountId));
    
    console.log('🗑️ Deleting emails...');
    await db.delete(emails).where(eq(emails.accountId, accountId));
    
    console.log('🗑️ Deleting account...');
    await db.delete(emailAccounts).where(eq(emailAccounts.id, accountId));

    console.log('✅ Account and all related data deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

