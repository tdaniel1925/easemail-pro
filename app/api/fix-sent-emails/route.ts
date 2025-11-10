import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emails, emailAccounts } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Fix emails that are from account owner but incorrectly classified as inbox
 * This reclassifies them as 'sent' emails
 * GET /api/fix-sent-emails?limit=100
 */
export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');

  try {
    // Get all email accounts to check against
    const accounts = await db.query.emailAccounts.findMany();

    let totalFixed = 0;
    let totalChecked = 0;

    for (const account of accounts) {
      // Find emails that are:
      // 1. FROM the account owner
      // 2. NOT in sent folder
      // 3. NOT drafts
      const emailsToFix = await db
        .select()
        .from(emails)
        .where(
          and(
            eq(emails.accountId, account.id),
            eq(emails.fromEmail, account.emailAddress),
            ne(emails.folder, 'sent'),
            ne(emails.folder, 'drafts')
          )
        )
        .limit(limit);

      console.log(`Found ${emailsToFix.length} emails to reclassify for account ${account.emailAddress}`);
      totalChecked += emailsToFix.length;

      for (const email of emailsToFix) {
        try {
          // Update folder to 'sent'
          await db.update(emails)
            .set({
              folder: 'sent',
              updatedAt: new Date(),
            })
            .where(eq(emails.id, email.id));

          console.log(`✅ Reclassified email "${email.subject}" from "${email.folder}" to "sent"`);
          totalFixed++;
        } catch (error) {
          console.error(`Error fixing email ${email.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      fixed: totalFixed,
      accountsProcessed: accounts.length,
    });
  } catch (error) {
    console.error('Fix sent emails error:', error);
    return NextResponse.json({
      error: 'Fix failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
