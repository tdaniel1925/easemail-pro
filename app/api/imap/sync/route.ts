/**
 * POST /api/imap/sync
 * Sync emails from IMAP account
 *
 * This route handles syncing emails from direct IMAP connections (e.g., Fastmail)
 * No 90-day limitation - syncs ALL emails from all folders
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { connectToIMAP, getIMAPFolders, fetchIMAPEmails, closeIMAPConnection, getLastUID } from '@/lib/imap/connection';

// Folder name mappings for consistent naming
const FOLDER_MAPPINGS: Record<string, string> = {
  'INBOX': 'inbox',
  'Sent': 'sent',
  'Sent Items': 'sent',
  'Sent Messages': 'sent',
  'Drafts': 'drafts',
  'Trash': 'trash',
  'Deleted': 'trash',
  'Spam': 'spam',
  'Junk': 'spam',
  'Archive': 'archive',
  'All Mail': 'all',
};

function normalizeFolderName(folderName: string): string {
  // Check exact matches first
  if (FOLDER_MAPPINGS[folderName]) {
    return FOLDER_MAPPINGS[folderName];
  }

  // Check case-insensitive matches
  const lowerName = folderName.toLowerCase();
  for (const [key, value] of Object.entries(FOLDER_MAPPINGS)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // Return sanitized folder name
  return folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

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

    // Verify this is an IMAP account
    if (account.provider !== 'imap') {
      return NextResponse.json(
        { error: 'This account is not an IMAP account. Use /api/nylas/sync for Nylas accounts.' },
        { status: 400 }
      );
    }

    // Check IMAP credentials
    if (!account.imapHost || !account.imapUsername || !account.imapPassword) {
      return NextResponse.json(
        { error: 'IMAP credentials missing for this account' },
        { status: 400 }
      );
    }

    console.log(`\n🔄 Starting IMAP sync for ${account.emailAddress}`);

    // Update sync status
    await db.update(emailAccounts)
      .set({
        syncStatus: 'syncing',
        lastActivityAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    // IMAP connection (will be refreshed periodically)
    let connection = await connectToIMAP({
      host: account.imapHost,
      port: account.imapPort || 993,
      username: account.imapUsername,
      password: account.imapPassword, // FIXME: Decrypt in production
      tls: account.imapTls ?? true,
    });

    // Track connection age to refresh before timeout
    let connectionStartTime = Date.now();
    const CONNECTION_MAX_AGE = 10 * 60 * 1000; // 10 minutes (refresh before 30min IMAP timeout)

    // Get list of folders
    const imapFolders = await getIMAPFolders(connection);
    console.log(`📁 Found ${imapFolders.length} folders:`, imapFolders);

    // Sync folders to database
    for (const folderName of imapFolders) {
      const normalizedName = normalizeFolderName(folderName);

      try {
        await db.insert(emailFolders).values({
          accountId: accountId,
          nylasFolderId: `imap-${accountId}-${normalizedName}`, // Unique ID for IMAP folder
          displayName: folderName,
          folderType: normalizedName, // inbox, sent, drafts, etc.
          fullPath: folderName,
          unreadCount: 0,
          totalCount: 0,
        }).onConflictDoNothing();
      } catch (err) {
        console.log(`Folder ${folderName} already exists, skipping`);
      }
    }

    let totalSynced = 0;
    const folderStats: Record<string, number> = {};
    const isInitialSync = !account.initialSyncCompleted;

    console.log(`\n📊 Sync type: ${isInitialSync ? 'INITIAL (fetch ALL emails)' : 'INCREMENTAL (fetch new emails only)'}`);

    // Sync emails from each folder
    for (const folderName of imapFolders) {
      try {
        console.log(`\n📥 Syncing folder: ${folderName}`);

        const normalizedFolderName = normalizeFolderName(folderName);

        // Fetch emails in smaller batches to prevent timeout
        // IMPORTANT: Keep batch size small (50) for speed and reliability!
        const BATCH_SIZE = 50; // Small batches = faster, more reliable
        const MAX_BATCHES = 100; // Safety limit: max 5,000 emails per sync run
        const RECONNECT_EVERY = 20; // Reconnect every 20 batches (~10 min)

        let lastProcessedUid = isInitialSync ? 0 : (account.imapLastUid || 0);
        let hasMore = true;
        let batchNumber = 1;
        let folderSyncCount = 0;

        while (hasMore && batchNumber <= MAX_BATCHES) {
          // Refresh IMAP connection every N batches or if connection is old
          const connectionAge = Date.now() - connectionStartTime;
          if (batchNumber > 1 && (batchNumber % RECONNECT_EVERY === 0 || connectionAge > CONNECTION_MAX_AGE)) {
            console.log(`🔄 Refreshing IMAP connection (batch ${batchNumber}, age: ${Math.round(connectionAge / 60000)}min)`);
            try {
              closeIMAPConnection(connection);
              connection = await connectToIMAP({
                host: account.imapHost,
                port: account.imapPort || 993,
                username: account.imapUsername,
                password: account.imapPassword,
                tls: account.imapTls ?? true,
              });
              connectionStartTime = Date.now();
              console.log(`✅ Connection refreshed`);
            } catch (reconnectError) {
              console.error(`❌ Failed to refresh connection:`, reconnectError);
              hasMore = false;
              break;
            }
          }

          console.log(`\n📦 Batch ${batchNumber}/${MAX_BATCHES} for ${folderName} (UID > ${lastProcessedUid})`);

          let messages;
          try {
            messages = await fetchIMAPEmails(connection, folderName, {
              uid: lastProcessedUid,
              limit: BATCH_SIZE,
            });
          } catch (fetchError) {
            console.error(`❌ Failed to fetch batch ${batchNumber}:`, fetchError);
            // Try to reconnect once
            try {
              console.log(`🔄 Attempting reconnect after fetch failure...`);
              closeIMAPConnection(connection);
              connection = await connectToIMAP({
                host: account.imapHost,
                port: account.imapPort || 993,
                username: account.imapUsername,
                password: account.imapPassword,
                tls: account.imapTls ?? true,
              });
              connectionStartTime = Date.now();
              // Retry the fetch
              messages = await fetchIMAPEmails(connection, folderName, {
                uid: lastProcessedUid,
                limit: BATCH_SIZE,
              });
              console.log(`✅ Reconnect successful, retry succeeded`);
            } catch (retryError) {
              console.error(`❌ Retry failed:`, retryError);
              hasMore = false;
              break;
            }
          }

          console.log(`✅ Fetched ${messages.length} emails in batch ${batchNumber}`);

          if (messages.length === 0) {
            console.log(`📭 No more emails to fetch from ${folderName}`);
            hasMore = false;
            break;
          }

        // Process and prepare emails for batch insert
        const emailsToInsert: any[] = [];
        let maxUidInBatch = lastProcessedUid;

        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];

          if (!message || !message.parsed) {
            console.warn(`⚠️ Skipping invalid message ${i + 1}/${messages.length}`);
            if (message?.uid && message.uid > maxUidInBatch) {
              maxUidInBatch = message.uid;
            }
            continue;
          }

          const parsed = message.parsed;

          try {
            // Limit body sizes to prevent huge emails from slowing things down
            const MAX_BODY_SIZE = 100000; // 100KB limit (reduced for speed)
            const bodyText = (parsed.text || '').substring(0, MAX_BODY_SIZE);
            const bodyHtml = (parsed.html || parsed.textAsHtml || '').substring(0, MAX_BODY_SIZE);

            // Prepare email data
            emailsToInsert.push({
              accountId: accountId,
              provider: 'imap',
              providerMessageId: `imap-${account.id}-${message.uid}`,
              folder: normalizedFolderName,
              folders: [folderName],

              // Email data
              fromEmail: parsed.from?.value[0]?.address || null,
              fromName: parsed.from?.value[0]?.name || null,
              toEmails: parsed.to?.value?.map((addr: any) => ({
                email: addr.address,
                name: addr.name || '',
              })) || [],
              ccEmails: parsed.cc?.value?.map((addr: any) => ({
                email: addr.address,
                name: addr.name || '',
              })) || [],
              bccEmails: parsed.bcc?.value?.map((addr: any) => ({
                email: addr.address,
                name: addr.name || '',
              })) || [],

              subject: parsed.subject || '(No Subject)',
              snippet: parsed.text?.substring(0, 200) || '',
              bodyText,
              bodyHtml,

              receivedAt: parsed.date || new Date(),
              sentAt: parsed.date || new Date(),

              isRead: !message.flags.includes('\\Seen'),
              isStarred: message.flags.includes('\\Flagged'),

              hasAttachments: (parsed.attachments?.length || 0) > 0,
              attachmentsCount: parsed.attachments?.length || 0,
              attachments: parsed.attachments?.map((att: any) => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
              })) || [],
            });

            // Track highest UID
            if (message.uid > maxUidInBatch) {
              maxUidInBatch = message.uid;
            }
          } catch (parseError) {
            console.error(`❌ Failed to parse email UID ${message.uid}:`, parseError instanceof Error ? parseError.message : String(parseError));
            // Track UID anyway
            if (message.uid > maxUidInBatch) {
              maxUidInBatch = message.uid;
            }
          }
        }

        // Batch insert all emails at once (MUCH faster than one-by-one)
        let batchInsertCount = 0;
        if (emailsToInsert.length > 0) {
          try {
            const inserted = await db.insert(emails)
              .values(emailsToInsert)
              .onConflictDoNothing()
              .returning({ id: emails.id });

            batchInsertCount = inserted.length;
            folderSyncCount += batchInsertCount;
            totalSynced += batchInsertCount;

            console.log(`📝 Batch inserted ${batchInsertCount}/${emailsToInsert.length} emails (${emailsToInsert.length - batchInsertCount} duplicates skipped)`);
          } catch (insertError) {
            console.error(`❌ Batch insert failed:`, insertError);
            // Fall back to individual inserts if batch fails
            for (const emailData of emailsToInsert) {
              try {
                const [inserted] = await db.insert(emails)
                  .values(emailData)
                  .onConflictDoNothing()
                  .returning({ id: emails.id });
                if (inserted) {
                  batchInsertCount++;
                  folderSyncCount++;
                  totalSynced++;
                }
              } catch (individualError) {
                console.error(`❌ Individual insert failed for UID:`, individualError);
              }
            }
          }
        }

        // Update last processed UID
        lastProcessedUid = maxUidInBatch;

          // Update progress after each batch
          console.log(`📊 Batch ${batchNumber} complete: ${folderSyncCount} emails from ${folderName}, ${totalSynced} total`);

          // Save progress every 5 batches (reduce DB overhead)
          if (batchNumber % 5 === 0 || messages.length < BATCH_SIZE) {
            if (lastProcessedUid > 0) {
              try {
                await db.update(emailAccounts)
                  .set({
                    imapLastUid: lastProcessedUid,
                    syncedEmailCount: totalSynced,
                    lastActivityAt: new Date(),
                  })
                  .where(eq(emailAccounts.id, accountId));
              } catch (updateError) {
                console.error(`⚠️ Failed to update progress:`, updateError);
              }
            }
          }

          // Progress report every 10 batches
          if (batchNumber % 10 === 0) {
            const elapsed = Math.round((Date.now() - connectionStartTime) / 1000);
            const rate = Math.round(folderSyncCount / (elapsed || 1) * 60);
            console.log(`\n🔄 PROGRESS: ${folderSyncCount} emails from ${folderName} (${batchNumber} batches, ${rate}/min)`);
          }

          // Check if we got fewer emails than batch size (means we're done)
          if (messages.length < BATCH_SIZE) {
            console.log(`✅ Completed ${folderName}: received ${messages.length} < ${BATCH_SIZE} emails in batch`);
            hasMore = false;
          }

          batchNumber++;

          // Safety check: If we hit max batches, log warning
          if (batchNumber > MAX_BATCHES) {
            console.log(`⚠️ Hit MAX_BATCHES limit (${MAX_BATCHES}) for ${folderName}. Will resume on next sync.`);
          }
        } // End of batch while loop

        folderStats[folderName] = folderSyncCount;
        console.log(`✅ Completed syncing ${folderName}: ${folderSyncCount} total emails`);

      } catch (folderError) {
        console.error(`Error syncing folder ${folderName}:`, folderError);
      }
    }

    // Close connection
    closeIMAPConnection(connection);

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

    console.log(`\n✅ IMAP sync completed: ${totalSynced} total emails synced`);

    return NextResponse.json({
      success: true,
      syncedCount: totalSynced,
      foldersProcessed: imapFolders.length,
      folderStats,
      message: `Successfully synced ${totalSynced} emails from ${imapFolders.length} folders`,
    });

  } catch (error) {
    console.error('IMAP sync error:', error);

    // Update error status
    if (error instanceof Error && error.message.includes('accountId')) {
      const accountId = (await request.json()).accountId;
      if (accountId) {
        await db.update(emailAccounts)
          .set({
            syncStatus: 'error',
            lastError: error.message,
          })
          .where(eq(emailAccounts.id, accountId));
      }
    }

    return NextResponse.json(
      {
        error: 'IMAP sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
