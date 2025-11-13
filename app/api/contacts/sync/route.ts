/**
 * Manual Contact Sync Endpoint
 * Allows users to manually trigger contact sync for their accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts, contactSyncStatus, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute max for manual sync

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👥 Starting manual contact sync for user:', user.id);

    // Get user's active email accounts
    const accountsToSync = await db.query.emailAccounts.findMany({
      where: and(
        eq(emailAccounts.userId, user.id),
        eq(emailAccounts.isActive, true)
      ),
      columns: {
        id: true,
        userId: true,
        emailAddress: true,
        nylasGrantId: true,
      },
    });

    if (accountsToSync.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active email accounts found',
        duration: Date.now() - startTime,
      }, { status: 400 });
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

        // Fetch contacts from Nylas
        let allContacts: any[] = [];
        let pageToken: string | undefined = undefined;
        let hasMore = true;

        while (hasMore && allContacts.length < 200) { // Max 200 per manual sync
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

          if (allContacts.length >= 200) break; // Prevent timeout
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

    console.log(`✅ Manual contact sync complete:`, results);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.successful}/${accountsToSync.length} accounts`,
      ...results,
      duration,
    });
  } catch (error) {
    console.error('❌ Manual contact sync failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Sync failed',
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

    const contactData = {
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
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing contact
      await db.update(contacts)
        .set(contactData)
        .where(eq(contacts.id, existing.id));
      return 'updated';
    } else {
      // Insert new contact
      await db.insert(contacts).values({
        ...contactData,
        createdAt: new Date(),
      });
      return 'added';
    }
  } catch (error) {
    console.error('[Contact Sync] Error syncing contact:', error);
    return 'skipped';
  }
}
