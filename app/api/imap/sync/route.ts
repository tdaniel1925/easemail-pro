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

    // Connect to IMAP
    const connection = await connectToIMAP({
      host: account.imapHost,
      port: account.imapPort || 993,
      username: account.imapUsername,
      password: account.imapPassword, // FIXME: Decrypt in production
      tls: account.imapTls ?? true,
    });

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

    // Sync emails from each folder
    for (const folderName of imapFolders) {
      try {
        console.log(`\n📥 Syncing folder: ${folderName}`);

        const normalizedFolderName = normalizeFolderName(folderName);

        // Fetch emails (use UID-based sync for incremental updates)
        const messages = await fetchIMAPEmails(connection, folderName, {
          uid: account.imapLastUid || 0, // Incremental sync
          limit: 500, // Process in batches
        });

        console.log(`Found ${messages.length} emails in ${folderName}`);

        let folderSyncCount = 0;

        // Process each email
        for (const message of messages) {
          if (!message || !message.parsed) continue;

          const parsed = message.parsed;

          try {
            // Map email to database format
            const [inserted] = await db.insert(emails).values({
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
              bodyText: parsed.text || '',
              bodyHtml: parsed.html || parsed.textAsHtml || '',

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
            }).onConflictDoNothing().returning();

            if (inserted) {
              folderSyncCount++;
              totalSynced++;
            }
          } catch (emailError) {
            console.error(`Failed to insert email ${message.uid}:`, emailError);
          }
        }

        folderStats[folderName] = folderSyncCount;
        console.log(`✅ Synced ${folderSyncCount} new emails from ${folderName}`);

        // Update last UID for this folder
        if (messages.length > 0) {
          const lastUid = Math.max(...messages.map((m) => m.uid));
          await db.update(emailAccounts)
            .set({ imapLastUid: lastUid })
            .where(eq(emailAccounts.id, accountId));
        }

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
