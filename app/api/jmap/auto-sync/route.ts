/**
 * POST /api/jmap/auto-sync
 * Automatically sync new emails for all JMAP accounts
 * This should be called periodically (every 5-10 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createFastmailJMAPClient } from '@/lib/jmap/client';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting auto-sync for JMAP accounts...');

    // Get all active JMAP accounts with auto-sync enabled
    const jmapAccounts = await db.query.emailAccounts.findMany({
      where: and(
        eq(emailAccounts.provider, 'jmap'),
        eq(emailAccounts.isActive, true),
        eq(emailAccounts.autoSync, true)
      ),
    });

    console.log(`📧 Found ${jmapAccounts.length} JMAP accounts to sync`);

    if (jmapAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No JMAP accounts to sync',
        synced: 0,
      });
    }

    let totalNewEmails = 0;

    // Sync each account
    for (const account of jmapAccounts) {
      try {
        console.log(`\n📥 Auto-syncing: ${account.emailAddress}`);

        // Update sync status
        await db.update(emailAccounts)
          .set({
            syncStatus: 'syncing',
            lastActivityAt: new Date(),
          })
          .where(eq(emailAccounts.id, account.id));

        // Decrypt API token
        const apiToken = Buffer.from(account.imapPassword || '', 'base64').toString('utf-8');

        // Create JMAP client
        const jmapClient = createFastmailJMAPClient(apiToken);
        await jmapClient.connect();

        // Get all mailboxes
        const mailboxes = await jmapClient.getMailboxes();

        // Only sync recent emails (last 100 per folder)
        const RECENT_BATCH_SIZE = 100;
        let accountNewEmails = 0;

        for (const mailbox of mailboxes) {
          try {
            // Get recent emails
            const { emails: jmapEmails } = await jmapClient.getEmails({
              mailboxId: mailbox.id,
              limit: RECENT_BATCH_SIZE,
            });

            const normalizedFolderName = mailbox.role || mailbox.name.toLowerCase();

            // Prepare emails for insert
            const emailsToInsert = jmapEmails.map(jmapEmail => ({
              accountId: account.id,
              provider: 'jmap',
              providerMessageId: jmapEmail.id,
              folder: normalizedFolderName,
              folders: [mailbox.name],

              fromEmail: jmapEmail.from?.[0]?.email || null,
              fromName: jmapEmail.from?.[0]?.name || null,
              toEmails: jmapEmail.to?.map(addr => ({
                email: addr.email,
                name: addr.name || '',
              })) || [],
              ccEmails: jmapEmail.cc?.map(addr => ({
                email: addr.email,
                name: addr.name || '',
              })) || [],
              bccEmails: jmapEmail.bcc?.map(addr => ({
                email: addr.email,
                name: addr.name || '',
              })) || [],

              subject: jmapEmail.subject || '(No Subject)',
              snippet: jmapEmail.preview || '',
              bodyText: jmapEmail.preview || '',
              bodyHtml: '',

              receivedAt: new Date(jmapEmail.receivedAt),
              sentAt: new Date(jmapEmail.receivedAt),

              isRead: !!jmapEmail.keywords?.['$seen'],
              isStarred: !!jmapEmail.keywords?.['$flagged'],

              hasAttachments: jmapEmail.hasAttachment || false,
              attachmentsCount: 0,
              attachments: [],
            }));

            // Insert new emails (skip duplicates)
            if (emailsToInsert.length > 0) {
              const inserted = await db.insert(emails)
                .values(emailsToInsert)
                .onConflictDoNothing()
                .returning({ id: emails.id });

              accountNewEmails += inserted.length;

              if (inserted.length > 0) {
                console.log(`  ✅ ${mailbox.name}: ${inserted.length} new emails`);
              }
            }
          } catch (mailboxError) {
            console.error(`  ❌ Error syncing ${mailbox.name}:`, mailboxError);
          }
        }

        totalNewEmails += accountNewEmails;

        // Update sync status
        await db.update(emailAccounts)
          .set({
            syncStatus: 'completed',
            lastSyncedAt: new Date(),
            lastActivityAt: new Date(),
          })
          .where(eq(emailAccounts.id, account.id));

        // Broadcast real-time event if new emails were found
        if (accountNewEmails > 0) {
          try {
            const supabase = await createClient();
            const channel = supabase.channel(`email-sync:${account.id}`);

            await channel.send({
              type: 'broadcast',
              event: 'email-sync',
              payload: {
                type: 'message.created',
                accountId: account.id,
                timestamp: Date.now(),
                newCount: accountNewEmails,
              },
            });

            console.log(`📡 Broadcasted sync event for ${account.emailAddress}`);
          } catch (broadcastError) {
            console.error('Failed to broadcast sync event:', broadcastError);
          }
        }

        console.log(`✅ ${account.emailAddress}: ${accountNewEmails} new emails synced`);

      } catch (accountError) {
        console.error(`❌ Error syncing account ${account.emailAddress}:`, accountError);

        // Update sync status to failed
        await db.update(emailAccounts)
          .set({
            syncStatus: 'failed',
            lastError: accountError instanceof Error ? accountError.message : 'Unknown error',
            lastActivityAt: new Date(),
          })
          .where(eq(emailAccounts.id, account.id));
      }
    }

    console.log(`\n✅ Auto-sync completed: ${totalNewEmails} new emails across ${jmapAccounts.length} accounts`);

    return NextResponse.json({
      success: true,
      message: 'Auto-sync completed',
      accountsSynced: jmapAccounts.length,
      newEmailsFound: totalNewEmails,
    });

  } catch (error) {
    console.error('❌ Auto-sync error:', error);
    return NextResponse.json(
      {
        error: 'Auto-sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
