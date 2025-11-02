/**
 * API Route: Fix Folder Assignments
 * 
 * Accessible from browser/Postman to fix folder assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emails, emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { assignEmailFolder } from '@/lib/email/folder-utils';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, dryRun = true } = body;

    console.log('🔧 Starting Folder Assignment Fix');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    const stats = {
      totalEmails: 0,
      incorrectlyAssigned: 0,
      fixed: 0,
      errors: 0,
      byFolder: {} as Record<string, number>,
    };

    // Get account(s) to process
    const accounts = accountId
      ? await db.query.emailAccounts.findFirst({ 
          where: eq(emailAccounts.id, accountId) 
        }).then(a => a ? [a] : [])
      : await db.query.emailAccounts.findMany({
          where: eq(emailAccounts.userId, user.id)
        });

    if (accounts.length === 0) {
      return NextResponse.json({ 
        error: 'No accounts found',
        stats 
      }, { status: 404 });
    }

    console.log(`📧 Processing ${accounts.length} account(s)...`);

    for (const account of accounts) {
      console.log(`\n📬 Account: ${account.emailAddress}`);

      // Get all emails for this account
      const accountEmails = await db.query.emails.findMany({
        where: eq(emails.accountId, account.id),
      });

      console.log(`   Total emails: ${accountEmails.length}`);
      stats.totalEmails += accountEmails.length;

      for (const email of accountEmails) {
        try {
          const currentFolder = email.folder;
          const foldersArray = email.folders as string[] | null;

          // Skip if no folders array
          if (!foldersArray || foldersArray.length === 0) {
            continue;
          }

          // Calculate what the folder SHOULD be
          const correctFolder = assignEmailFolder(foldersArray);

          // Check if it's incorrect
          if (currentFolder !== correctFolder) {
            stats.incorrectlyAssigned++;
            
            // Track by folder type
            stats.byFolder[correctFolder] = (stats.byFolder[correctFolder] || 0) + 1;

            console.log(`   🔄 Mismatch:`);
            console.log(`      "${currentFolder}" → "${correctFolder}"`);

            if (!dryRun) {
              // Update the email
              await db.update(emails)
                .set({ 
                  folder: correctFolder,
                  updatedAt: new Date(),
                })
                .where(eq(emails.id, email.id));

              console.log(`      ✅ Fixed!`);
              stats.fixed++;
            } else {
              stats.fixed++; // Count as "would fix" in dry run
            }
          }
        } catch (error: any) {
          console.error(`   ❌ Error processing email ${email.id}:`, error.message);
          stats.errors++;
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`Total emails: ${stats.totalEmails}`);
    console.log(`Incorrectly assigned: ${stats.incorrectlyAssigned}`);
    console.log(`${dryRun ? 'Would fix' : 'Fixed'}: ${stats.fixed}`);
    console.log(`Errors: ${stats.errors}`);

    return NextResponse.json({
      success: true,
      mode: dryRun ? 'dry-run' : 'live',
      stats,
      message: dryRun 
        ? `Found ${stats.incorrectlyAssigned} emails that need fixing. Call again with dryRun=false to fix them.`
        : `Successfully fixed ${stats.fixed} emails!`,
    });

  } catch (error: any) {
    console.error('❌ Fix failed:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error.message 
    }, { status: 500 });
  }
}

