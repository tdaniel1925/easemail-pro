/**
 * Cron Job: Sync Contacts
 * Runs every 15 minutes to sync new contacts for all accounts
 *
 * Why periodic sync is needed:
 * - Nylas v3 does NOT support contact.created webhook
 * - Only contact.updated and contact.deleted webhooks exist
 * - This catches new contacts that wouldn't trigger webhooks
 *
 * This handles:
 * 1. Initial sync for new accounts
 * 2. Periodic check for new contacts
 * 3. Fallback for webhook failures
 *
 * Note: Contact updates/deletes are handled in real-time by webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { contacts, contactSyncStatus, emailAccounts } from '@/lib/db/schema';
import { eq, and, or, isNull, lt } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👥 Starting contact sync cron job...');

    // Find sync status records that need updating
    // Criteria: never synced OR last synced > 15 minutes ago
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const syncRecords = await db.query.contactSyncStatus.findMany({
      where: and(
        eq(contactSyncStatus.syncEnabled, true),
        or(
          isNull(contactSyncStatus.lastSyncAt),
          lt(contactSyncStatus.lastSyncAt, fifteenMinutesAgo)
        )
      ),
      limit: 50, // Process max 50 accounts per run
    });

    // If no existing sync records, find accounts that need initial sync
    let accountsToSync = [];
    if (syncRecords.length === 0) {
      const accountsNeedingSync = await db.query.emailAccounts.findMany({
        where: and(
          eq(emailAccounts.isActive, true),
          or(
            isNull(emailAccounts.lastContactSyncAt),
            lt(emailAccounts.lastContactSyncAt, fifteenMinutesAgo)
          )
        ),
        columns: {
          id: true,
          userId: true,
          emailAddress: true,
          nylasGrantId: true,
          lastContactSyncAt: true,
        },
        limit: 50,
      });

      accountsToSync = accountsNeedingSync;
    } else {
      // Get accounts for existing sync records
      const accountIds = syncRecords.map(sr => sr.emailAccountId).filter(Boolean);
      accountsToSync = await db.query.emailAccounts.findMany({
        where: and(
          eq(emailAccounts.isActive, true),
          // @ts-ignore - drizzle typing issue with arrays
          or(...accountIds.map(id => eq(emailAccounts.id, id)))
        ),
      });
    }

    if (accountsToSync.length === 0) {
      console.log('✅ No accounts need contact sync');
      return NextResponse.json({
        success: true,
        message: 'No accounts need sync',
        synced: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`🔄 Syncing contacts for ${accountsToSync.length} account(s)...`);

    const nylas = getNylasClient();
    const results = {
      successful: 0,
      failed: 0,
      contactsAdded: 0,
      contactsUpdated: 0,
      contactsSkipped: 0,
      errors: [] as any[],
    };

    // Sync each account
    for (const account of accountsToSync) {
      try {
        if (!account.nylasGrantId) {
          console.log(`⚠️ Skipping ${account.emailAddress}: No grant ID`);
          continue;
        }

        console.log(`  📥 Syncing ${account.emailAddress || account.id}...`);

        // Find or create sync status
        let syncStatus = await db.query.contactSyncStatus.findFirst({
          where: and(
            eq(contactSyncStatus.userId, account.userId),
            eq(contactSyncStatus.emailAccountId, account.id)
          ),
        });

        if (!syncStatus) {
          const newStatus = await db.insert(contactSyncStatus).values({
            userId: account.userId,
            emailAccountId: account.id,
            provider: 'nylas',
            nylasGrantId: account.nylasGrantId,
            syncEnabled: true,
            syncStatus: 'syncing',
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();
          syncStatus = newStatus[0];
        } else {
          await db.update(contactSyncStatus)
            .set({ syncStatus: 'syncing', updatedAt: new Date() })
            .where(eq(contactSyncStatus.id, syncStatus.id));
        }

        // Fetch contacts from Nylas with pagination
        let allContacts: any[] = [];
        let pageToken: string | undefined = syncStatus.pageToken || undefined;
        let hasMore = true;

        while (hasMore && allContacts.length < 500) { // Max 500 per sync
          const response = await nylas.contacts.list({
            identifier: account.nylasGrantId,
            queryParams: {
              limit: 50,
              ...(pageToken && { pageToken }),
            },
          });

          allContacts = allContacts.concat(response.data);
          hasMore = !!response.nextCursor;
          pageToken = response.nextCursor;

          if (allContacts.length >= 500) break; // Prevent timeout
        }

        console.log(`  📋 Fetched ${allContacts.length} contacts`);

        // Process contacts
        for (const nylasContact of allContacts) {
          const result = await syncContact(account.userId, account.nylasGrantId, nylasContact);
          if (result === 'added') results.contactsAdded++;
          else if (result === 'updated') results.contactsUpdated++;
          else if (result === 'skipped') results.contactsSkipped++;
        }

        // Update sync status
        await db.update(contactSyncStatus)
          .set({
            lastSyncAt: new Date(),
            lastSuccessfulSyncAt: new Date(),
            syncStatus: 'idle',
            pageToken: pageToken || null,
            totalContactsSynced: (syncStatus.totalContactsSynced || 0) + allContacts.length,
            contactsAdded: (syncStatus.contactsAdded || 0) + results.contactsAdded,
            contactsUpdated: (syncStatus.contactsUpdated || 0) + results.contactsUpdated,
            contactsSkipped: (syncStatus.contactsSkipped || 0) + results.contactsSkipped,
            syncError: null,
            updatedAt: new Date(),
          })
          .where(eq(contactSyncStatus.id, syncStatus.id));

        // Update account's last contact sync time
        await db.update(emailAccounts)
          .set({
            lastContactSyncAt: new Date(),
          })
          .where(eq(emailAccounts.id, account.id));

        results.successful++;
        console.log(`  ✅ Synced ${account.emailAddress || account.id}`);
      } catch (error) {
        console.error(`  ❌ Failed to sync ${account.emailAddress || account.id}:`, error);
        results.failed++;
        results.errors.push({
          accountId: account.id,
          emailAddress: account.emailAddress,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update sync status with error
        const syncStatus = await db.query.contactSyncStatus.findFirst({
          where: and(
            eq(contactSyncStatus.userId, account.userId),
            eq(contactSyncStatus.emailAccountId, account.id)
          ),
        });

        if (syncStatus) {
          await db.update(contactSyncStatus)
            .set({
              syncStatus: 'error',
              syncError: error instanceof Error ? error.message : 'Unknown error',
              updatedAt: new Date(),
            })
            .where(eq(contactSyncStatus.id, syncStatus.id));
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Contact sync complete:`);
    console.log(`   - Accounts synced: ${results.successful}/${accountsToSync.length}`);
    console.log(`   - Contacts added: ${results.contactsAdded}`);
    console.log(`   - Contacts updated: ${results.contactsUpdated}`);
    console.log(`   - Contacts skipped: ${results.contactsSkipped}`);
    console.log(`   - Failed: ${results.failed}`);
    console.log(`   - Duration: ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.successful}/${accountsToSync.length} accounts`,
      ...results,
      duration,
    });
  } catch (error) {
    console.error('❌ Contact sync cron job failed:', error);

    return NextResponse.json({
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

async function syncContact(userId: string, grantId: string, nylasContact: any): Promise<'added' | 'updated' | 'skipped'> {
  try {
    // Get primary email
    const primaryEmail = nylasContact.emails?.find((e: any) => e.type === 'work' || e.type === 'personal')?.email
      || nylasContact.emails?.[0]?.email;

    const emailLower = primaryEmail ? primaryEmail.toLowerCase() : null;

    // Check if contact already exists
    const existing = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, userId),
        eq(contacts.providerContactId, nylasContact.id)
      ),
    });

    if (existing) {
      return 'skipped'; // Already exists, webhooks will handle updates
    }

    // Get primary phone
    const primaryPhone = nylasContact.phoneNumbers?.find((p: any) => p.type === 'work' || p.type === 'mobile')?.number
      || nylasContact.phoneNumbers?.[0]?.number;

    // Build full name
    const firstName = nylasContact.givenName || null;
    const lastName = nylasContact.surname || null;
    const fullName = firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || null;
    const displayName = fullName || (emailLower ? emailLower.split('@')[0] : 'Unknown');

    // Insert new contact
    await db.insert(contacts).values({
      userId,
      email: emailLower,
      firstName,
      lastName,
      fullName,
      displayName,
      phone: primaryPhone,
      company: nylasContact.companyName || null,
      jobTitle: nylasContact.jobTitle || null,
      website: nylasContact.webPages?.[0]?.url || null,
      notes: nylasContact.notes ? nylasContact.notes.join('\n') : null,
      tags: nylasContact.groups?.map((g: any) => g.name || g.id) || [],
      provider: 'nylas',
      providerContactId: nylasContact.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return 'added';
  } catch (error) {
    console.error('[Contact Sync] Error syncing contact:', error);
    return 'skipped';
  }
}
