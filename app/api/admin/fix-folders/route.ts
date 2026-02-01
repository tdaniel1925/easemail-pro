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
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

// Force dynamic rendering - this route uses cookies
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized folder fix attempt');
      return unauthorized();
    }

    const body = await request.json();
    const { accountId, dryRun = true } = body;

    logger.admin.info('Starting folder assignment fix', {
      userId: user.id,
      accountId,
      mode: dryRun ? 'dry-run' : 'live'
    });

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
      logger.admin.warn('No accounts found for folder fix', { userId: user.id, accountId });
      return notFound('No accounts found');
    }

    logger.admin.info(`Processing accounts for folder fix`, {
      userId: user.id,
      accountCount: accounts.length
    });

    for (const account of accounts) {
      logger.admin.info('Processing account for folder fix', {
        accountId: account.id,
        emailAddress: account.emailAddress,
        userId: user.id
      });

      // Get all emails for this account
      const accountEmails = await db.query.emails.findMany({
        where: eq(emails.accountId, account.id),
      });

      logger.admin.info('Found emails for account', {
        accountId: account.id,
        emailCount: accountEmails.length,
        userId: user.id
      });
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

            logger.admin.info('Found folder mismatch', {
              emailId: email.id,
              currentFolder,
              correctFolder,
              dryRun,
              userId: user.id
            });

            if (!dryRun) {
              // Update the email
              await db.update(emails)
                .set({
                  folder: correctFolder,
                  updatedAt: new Date(),
                })
                .where(eq(emails.id, email.id));

              logger.admin.info('Fixed email folder', {
                emailId: email.id,
                newFolder: correctFolder,
                userId: user.id
              });
              stats.fixed++;
            } else {
              stats.fixed++; // Count as "would fix" in dry run
            }
          }
        } catch (error: any) {
          logger.api.error('Error processing email for folder fix', {
            error,
            emailId: email.id,
            userId: user.id
          });
          stats.errors++;
        }
      }
    }

    logger.admin.info('Folder assignment fix complete', {
      userId: user.id,
      mode: dryRun ? 'dry-run' : 'live',
      totalEmails: stats.totalEmails,
      incorrectlyAssigned: stats.incorrectlyAssigned,
      fixed: stats.fixed,
      errors: stats.errors
    });

    return successResponse({
      mode: dryRun ? 'dry-run' : 'live',
      stats
    }, dryRun
      ? `Found ${stats.incorrectlyAssigned} emails that need fixing. Call again with dryRun=false to fix them.`
      : `Successfully fixed ${stats.fixed} emails!`
    );

  } catch (error: any) {
    logger.api.error('Folder fix failed', error);
    return internalError();
  }
});

