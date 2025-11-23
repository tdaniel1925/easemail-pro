/**
 * Contacts V4 Sync Trigger
 * Triggers immediate sync to Nylas for pending contacts
 */

import { db } from '@/lib/db/drizzle';
import { contactsV4, emailAccounts } from '@/lib/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { retryFetch } from '@/lib/utils/retry';

const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';
const NYLAS_API_KEY = process.env.NYLAS_API_KEY!;

interface SyncTriggerOptions {
  contactId: string;
  userId: string;
}

interface SyncTriggerResult {
  success: boolean;
  nylasContactId?: string;
  error?: string;
}

/**
 * Trigger immediate sync for a single pending contact
 */
export async function triggerContactSync(options: SyncTriggerOptions): Promise<SyncTriggerResult> {
  const { contactId, userId } = options;

  try {
    // Get contact with pending status
    const contact = await db.query.contactsV4.findFirst({
      where: and(
        eq(contactsV4.id, contactId),
        eq(contactsV4.userId, userId),
        or(
          eq(contactsV4.syncStatus, 'pending_create'),
          eq(contactsV4.syncStatus, 'pending_update'),
          eq(contactsV4.syncStatus, 'pending_delete')
        )
      ),
    });

    if (!contact) {
      return { success: false, error: 'Contact not found or not pending sync' };
    }

    // Get account with grant ID
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.userId, userId),
        eq(emailAccounts.isActive, true)
      ),
    });

    if (!account?.nylasGrantId) {
      return { success: false, error: 'No active email account with Nylas grant' };
    }

    const grantId = account.nylasGrantId;

    // Perform sync based on status
    if (contact.syncStatus === 'pending_create') {
      return await createContactInNylas(contact, grantId);
    } else if (contact.syncStatus === 'pending_update') {
      return await updateContactInNylas(contact, grantId);
    } else if (contact.syncStatus === 'pending_delete') {
      return await deleteContactInNylas(contact, grantId);
    }

    return { success: false, error: 'Unknown sync status' };
  } catch (error: any) {
    console.error('❌ Sync trigger error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create contact in Nylas
 */
async function createContactInNylas(contact: any, grantId: string): Promise<SyncTriggerResult> {
  try {
    const nylasContact = transformToNylasFormat(contact);

    const response = await retryFetch(`${NYLAS_API_URI}/v3/grants/${grantId}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nylasContact),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create contact in Nylas');
    }

    const created = await response.json();

    // Update local contact with Nylas ID
    await db.update(contactsV4)
      .set({
        nylasContactId: created.data.id,
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contactsV4.id, contact.id));

    console.log(`✅ Created contact in Nylas: ${created.data.id}`);

    return { success: true, nylasContactId: created.data.id };
  } catch (error: any) {
    console.error('❌ Create in Nylas failed:', error);

    // Mark as error
    await db.update(contactsV4)
      .set({
        syncStatus: 'error',
        syncError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(contactsV4.id, contact.id));

    return { success: false, error: error.message };
  }
}

/**
 * Update contact in Nylas
 */
async function updateContactInNylas(contact: any, grantId: string): Promise<SyncTriggerResult> {
  try {
    if (!contact.nylasContactId) {
      // Contact was never synced, create instead
      return await createContactInNylas(contact, grantId);
    }

    const nylasContact = transformToNylasFormat(contact);

    const response = await retryFetch(`${NYLAS_API_URI}/v3/grants/${grantId}/contacts/${contact.nylasContactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nylasContact),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update contact in Nylas');
    }

    const updated = await response.json();

    // Update local contact
    await db.update(contactsV4)
      .set({
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contactsV4.id, contact.id));

    console.log(`✅ Updated contact in Nylas: ${updated.data.id}`);

    return { success: true, nylasContactId: updated.data.id };
  } catch (error: any) {
    console.error('❌ Update in Nylas failed:', error);

    // Mark as error
    await db.update(contactsV4)
      .set({
        syncStatus: 'error',
        syncError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(contactsV4.id, contact.id));

    return { success: false, error: error.message };
  }
}

/**
 * Delete contact in Nylas
 */
async function deleteContactInNylas(contact: any, grantId: string): Promise<SyncTriggerResult> {
  try {
    if (!contact.nylasContactId) {
      // Contact was never synced, just mark as deleted locally
      await db.update(contactsV4)
        .set({
          isDeleted: true,
          syncStatus: 'synced',
          updatedAt: new Date(),
        })
        .where(eq(contactsV4.id, contact.id));

      return { success: true };
    }

    const response = await retryFetch(`${NYLAS_API_URI}/v3/grants/${grantId}/contacts/${contact.nylasContactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
      },
    }, { maxAttempts: 3 });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete contact in Nylas');
    }

    // Soft delete locally
    await db.update(contactsV4)
      .set({
        isDeleted: true,
        syncStatus: 'synced',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contactsV4.id, contact.id));

    console.log(`✅ Deleted contact in Nylas: ${contact.nylasContactId}`);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Delete in Nylas failed:', error);

    // Mark as error
    await db.update(contactsV4)
      .set({
        syncStatus: 'error',
        syncError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(contactsV4.id, contact.id));

    return { success: false, error: error.message };
  }
}

/**
 * Transform local contact to Nylas format
 */
function transformToNylasFormat(contact: any): any {
  const nylasContact: any = {};

  // Name
  if (contact.givenName) nylasContact.given_name = contact.givenName;
  if (contact.surname) nylasContact.surname = contact.surname;
  if (contact.middleName) nylasContact.middle_name = contact.middleName;
  if (contact.nickname) nylasContact.nickname = contact.nickname;

  // Emails
  if (contact.emails && contact.emails.length > 0) {
    nylasContact.emails = contact.emails.map((email: any) => ({
      type: email.type || 'personal',
      email: email.email,
    }));
  }

  // Phone numbers
  if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
    nylasContact.phone_numbers = contact.phoneNumbers.map((phone: any) => ({
      type: phone.type || 'personal',
      number: phone.number,
    }));
  }

  // Physical addresses
  if (contact.physicalAddresses && contact.physicalAddresses.length > 0) {
    nylasContact.physical_addresses = contact.physicalAddresses.map((addr: any) => ({
      type: addr.type || 'work',
      street_address: addr.streetAddress,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postalCode,
      country: addr.country,
    }));
  }

  // Web pages
  if (contact.webPages && contact.webPages.length > 0) {
    nylasContact.web_pages = contact.webPages.map((web: any) => ({
      type: web.type || 'homepage',
      url: web.url,
    }));
  }

  // Company/Job
  if (contact.companyName) nylasContact.company_name = contact.companyName;
  if (contact.jobTitle) nylasContact.job_title = contact.jobTitle;

  // Birthday
  if (contact.birthday) nylasContact.birthday = contact.birthday;

  // Notes
  if (contact.notes) nylasContact.notes = contact.notes;

  // Groups (send as JSON string in notes for now, Nylas doesn't have groups API)
  if (contact.groups && contact.groups.length > 0) {
    const groupsNote = `\n\n[Groups: ${contact.groups.join(', ')}]`;
    nylasContact.notes = (nylasContact.notes || '') + groupsNote;
  }

  return nylasContact;
}
