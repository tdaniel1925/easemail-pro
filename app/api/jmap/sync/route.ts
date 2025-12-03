/**
 * POST /api/jmap/sync
 * Sync emails from Fastmail using JMAP (5x faster than IMAP!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { createFastmailJMAPClient } from '@/lib/jmap/client';
import { extractAndSaveJMAPAttachments } from '@/lib/attachments/extract-from-jmap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get account from database
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify ownership
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Verify this is a JMAP account
    if (account.provider !== 'jmap') {
      return NextResponse.json(
        { error: 'This account is not a JMAP account' },
        { status: 400 }
      );
    }

    console.log(`\n🚀 Starting JMAP sync for ${account.emailAddress} (MUCH FASTER!)`);

    // Update sync status
    await db.update(emailAccounts)
      .set({
        syncStatus: 'syncing',
        lastActivityAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    // Decrypt API token
    const apiToken = Buffer.from(account.imapPassword || '', 'base64').toString('utf-8');

    // Create JMAP client with API token
    const jmapClient = createFastmailJMAPClient(apiToken);
    await jmapClient.connect();

    // Get all mailboxes
    const mailboxes = await jmapClient.getMailboxes();
    console.log(`📁 Found ${mailboxes.length} mailboxes`);

    // Sync mailboxes to database
    for (const mailbox of mailboxes) {
      try {
        await db.insert(emailFolders).values({
          accountId: accountId,
          nylasFolderId: mailbox.id,
          displayName: mailbox.name,
          folderType: mailbox.role || mailbox.name.toLowerCase(),
          fullPath: mailbox.name,
          unreadCount: mailbox.unreadEmails || 0,
          totalCount: mailbox.totalEmails || 0,
        }).onConflictDoNothing();
      } catch (err) {
        console.log(`Mailbox ${mailbox.name} already exists, skipping`);
      }
    }

    let totalSynced = 0;
    const BATCH_SIZE = 100; // JMAP can handle larger batches!

    // Sync emails from each mailbox
    for (const mailbox of mailboxes) {
      try {
        console.log(`\n📥 Syncing mailbox: ${mailbox.name}`);

        const normalizedFolderName = mailbox.role || mailbox.name.toLowerCase();

        // Paginate through ALL emails in this mailbox
        let position = 0;
        let hasMore = true;
        let folderTotalSynced = 0;

        while (hasMore) {
          console.log(`  📄 Fetching batch at position ${position}...`);

          // Get emails batch (JMAP is MUCH faster than IMAP!)
          const { emails: jmapEmails, total } = await jmapClient.getEmails({
            mailboxId: mailbox.id,
            limit: BATCH_SIZE,
            position,
          });

          console.log(`  Found ${jmapEmails.length} emails (${folderTotalSynced + jmapEmails.length}/${total} total in ${mailbox.name})`);

          if (jmapEmails.length === 0) {
            hasMore = false;
            break;
          }

          // Prepare emails for batch insert
          const emailsToInsert = jmapEmails.map(jmapEmail => {
            // Map JMAP attachments to our schema format (including contentId for inline images)
            const mappedAttachments = (jmapEmail.attachments || []).map(att => ({
              id: att.blobId, // Use blobId as the attachment ID
              filename: att.name || 'attachment',
              size: att.size || 0,
              contentType: att.type || 'application/octet-stream',
              contentId: att.cid || undefined, // cid for inline image resolution (cid:xxx)
              providerFileId: att.blobId, // Store blobId for download
            }));

            return {
              accountId: accountId,
              provider: 'jmap',
              providerMessageId: jmapEmail.id,
              folder: normalizedFolderName,
              folders: [mailbox.name],

              // Email data
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
              bodyText: jmapEmail.preview || '', // Will fetch full body later if needed
              bodyHtml: '',

              receivedAt: new Date(jmapEmail.receivedAt),
              sentAt: new Date(jmapEmail.receivedAt),

              isRead: !!jmapEmail.keywords?.['$seen'],
              isStarred: !!jmapEmail.keywords?.['$flagged'],

              hasAttachments: jmapEmail.hasAttachment || false,
              attachmentsCount: mappedAttachments.length,
              attachments: mappedAttachments,
            };
          });

          // Batch insert (MUCH faster!)
          if (emailsToInsert.length > 0) {
            const inserted = await db.insert(emails)
              .values(emailsToInsert)
              .onConflictDoNothing()
              .returning({ id: emails.id });

            folderTotalSynced += inserted.length;
            totalSynced += inserted.length;
            console.log(`  ✅ Synced ${inserted.length} emails from batch (${folderTotalSynced} total in folder)`);

            // Extract attachments for newly inserted emails (save to attachments table)
            for (let i = 0; i < inserted.length; i++) {
              const insertedEmail = inserted[i];
              const originalEmail = emailsToInsert[i];

              // Only process emails with attachments
              if (originalEmail.attachments && originalEmail.attachments.length > 0) {
                try {
                  await extractAndSaveJMAPAttachments({
                    emailId: insertedEmail.id,
                    providerMessageId: originalEmail.providerMessageId,
                    accountId: accountId,
                    userId: user.id,
                    attachments: originalEmail.attachments.map(att => ({
                      blobId: att.id,
                      name: att.filename,
                      size: att.size,
                      type: att.contentType,
                      cid: att.contentId,
                    })),
                    emailSubject: originalEmail.subject,
                    senderEmail: originalEmail.fromEmail || undefined,
                    senderName: originalEmail.fromName || undefined,
                    emailDate: originalEmail.receivedAt,
                  });
                } catch (attachmentError) {
                  console.error(`Failed to extract attachments for email ${insertedEmail.id}:`, attachmentError);
                }
              }
            }
          }

          // Move to next batch
          position += BATCH_SIZE;

          // Check if we've reached the end
          if (position >= total) {
            hasMore = false;
          }
        }

        console.log(`✅ Completed ${mailbox.name}: ${folderTotalSynced} emails synced`)

      } catch (folderError) {
        console.error(`Error syncing mailbox ${mailbox.name}:`, folderError);
      }
    }

    // Update account sync status
    await db.update(emailAccounts)
      .set({
        syncStatus: 'completed',
        lastSyncedAt: new Date(),
        lastActivityAt: new Date(),
        initialSyncCompleted: true,
        syncedEmailCount: totalSynced,
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(`\n✅ JMAP sync completed: ${totalSynced} emails synced`);

    return NextResponse.json({
      success: true,
      message: 'JMAP sync completed',
      totalSynced,
      mailboxCount: mailboxes.length,
    });
  } catch (error) {
    console.error('❌ JMAP sync error:', error);

    // Update account with error
    try {
      await db.update(emailAccounts)
        .set({
          syncStatus: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lastActivityAt: new Date(),
        })
        .where(eq(emailAccounts.id, (await request.json()).accountId));
    } catch (updateError) {
      console.error('Failed to update account status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'JMAP sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
