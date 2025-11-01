import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Nylas from 'nylas';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

// DELETE: Remove an email account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const accountId = params.accountId;

    console.log('🗑️ Starting account deletion for:', accountId);

    // Get account details for Nylas cleanup
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Cleanup Nylas resources BEFORE deleting from database
    if (account.nylasGrantId) {
      try {
        console.log('🧹 Revoking Nylas grant:', account.nylasGrantId);
        await nylas.auth.revoke({
          grantId: account.nylasGrantId,
        });
        console.log('✅ Nylas grant revoked');
      } catch (grantError) {
        console.warn('⚠️ Failed to revoke Nylas grant (may already be revoked):', grantError);
        // Continue with deletion even if grant revocation fails
      }
    }

    if (account.webhookId) {
      try {
        console.log('🧹 Deleting Nylas webhook:', account.webhookId);
        await nylas.webhooks.destroy({
          webhookId: account.webhookId,
        });
        console.log('✅ Nylas webhook deleted');
      } catch (webhookError) {
        console.warn('⚠️ Failed to delete Nylas webhook (may already be deleted):', webhookError);
        // Continue with deletion even if webhook deletion fails
      }
    }

    // Delete related data from database (explicit for better logging)
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

