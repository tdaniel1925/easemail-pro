/**
 * Contacts V4 Sync Service
 * Handles bidirectional sync with Nylas V3 API
 * Features: Delta sync, conflict resolution, batch operations, progress tracking
 */

import { db } from '@/lib/db/drizzle';
import { contactsV4, contactSyncState, contactSyncLogs, contactConflicts } from '@/lib/db/schema-contacts-v4';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import type {
  NylasContact,
  NylasContactListResponse,
  ContactV4,
  ContactSyncState,
  SyncProgressUpdate,
  NylasEmail,
  NylasPhoneNumber,
  NylasPhysicalAddress,
  NylasWebPage,
  NylasIMAddress,
  NylasContactGroup,
} from '@/lib/types/contacts-v4';

// ============================================
// CONFIGURATION
// ============================================

const NYLAS_API_URI = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';
const NYLAS_API_KEY = process.env.NYLAS_API_KEY!;
const SYNC_BATCH_SIZE = 50; // Nylas pagination limit
const INSERT_BATCH_SIZE = 100; // Database insert batch size
const RATE_LIMIT_DELAY = 25; // 25ms = 40 requests/second (Nylas limit)

// ============================================
// TYPES
// ============================================

interface SyncOptions {
  accountId: string;
  userId: string;
  grantId: string;
  provider: 'google' | 'microsoft';
  forceFullSync?: boolean;
  onProgress?: (update: SyncProgressUpdate) => void;
}

interface SyncResult {
  success: boolean;
  total: number;
  imported: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: number;
  conflicts: number;
  duration_ms: number;
  error?: string;
}

// ============================================
// MAIN SYNC CLASS
// ============================================

export class ContactsV4SyncService {
  private accountId: string;
  private userId: string;
  private grantId: string;
  private provider: 'google' | 'microsoft';
  private onProgress?: (update: SyncProgressUpdate) => void;

  constructor(options: SyncOptions) {
    this.accountId = options.accountId;
    this.userId = options.userId;
    this.grantId = options.grantId;
    this.provider = options.provider;
    this.onProgress = options.onProgress;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Perform full or delta sync
   */
  async sync(forceFullSync = false): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Update sync state to 'syncing'
      await this.updateSyncState({
        sync_status: 'syncing',
        last_sync_attempt: new Date(),
        current_operation: 'initializing',
      });

      this.sendProgress({
        type: 'start',
        status: 'Initializing sync...',
      });

      // Get or create sync state
      const syncState = await this.getSyncState();
      const cursor = !forceFullSync ? syncState?.last_sync_cursor : undefined;

      // Fetch contacts from Nylas
      const { contacts: nylasContacts, nextCursor } = await this.fetchAllContacts(cursor);

      this.sendProgress({
        type: 'fetching',
        total: nylasContacts.length,
        status: `Fetched ${nylasContacts.length} contacts from ${this.provider}`,
      });

      // Process contacts
      const result = await this.processContacts(nylasContacts);

      // Update sync state with results
      await this.updateSyncState({
        sync_status: 'idle',
        last_successful_sync: new Date(),
        last_sync_cursor: nextCursor || cursor,
        total_contacts: result.imported + result.updated,
        synced_contacts: result.imported + result.updated,
        error_contacts: result.errors,
        conflict_contacts: result.conflicts,
        current_operation: null,
        progress_current: 0,
        progress_total: 0,
        progress_percentage: 0,
      });

      const durationMs = Date.now() - startTime;

      this.sendProgress({
        type: 'complete',
        status: 'Sync complete!',
        total: nylasContacts.length,
        imported: result.imported,
        updated: result.updated,
        deleted: result.deleted,
        skipped: result.skipped,
        errors: result.errors,
        conflicts: result.conflicts,
      });

      // Log successful sync
      await this.logSyncOperation({
        operation: 'sync',
        direction: 'remote_to_local',
        status: 'success',
        durationMs,
        triggeredBy: 'manual_sync',
      });

      return {
        success: true,
        total: nylasContacts.length,
        ...result,
        duration_ms: durationMs,
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      console.error('❌ Contacts V4 sync failed:', error);

      // Update sync state to error
      await this.updateSyncState({
        sync_status: 'error',
        sync_error: error.message,
        current_operation: null,
      });

      // Log error
      await this.logSyncOperation({
        operation: 'sync',
        direction: 'remote_to_local',
        status: 'error',
        errorMessage: error.message,
        durationMs,
        triggeredBy: 'manual_sync',
      });

      this.sendProgress({
        type: 'error',
        status: error.message || 'Sync failed',
        error: error.message || 'Sync failed',
      });

      return {
        success: false,
        total: 0,
        imported: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: 1,
        conflicts: 0,
        duration_ms: durationMs,
        error: error.message,
      };
    }
  }

  // ============================================
  // NYLAS API METHODS
  // ============================================

  /**
   * Fetch all contacts from Nylas with pagination
   */
  private async fetchAllContacts(cursor?: string): Promise<{
    contacts: NylasContact[];
    nextCursor?: string;
  }> {
    const allContacts: NylasContact[] = [];
    let pageToken = cursor;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      const url = new URL(`${NYLAS_API_URI}/v3/grants/${this.grantId}/contacts`);
      url.searchParams.append('limit', SYNC_BATCH_SIZE.toString());
      if (pageToken) {
        url.searchParams.append('page_token', pageToken);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NYLAS_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Nylas API error: ${response.status} ${response.statusText}`);
      }

      const data: NylasContactListResponse = await response.json();
      allContacts.push(...data.data);

      hasMore = !!data.next_cursor;
      pageToken = data.next_cursor;
      pageCount++;

      this.sendProgress({
        type: 'fetching',
        total: allContacts.length,
        status: `Fetching page ${pageCount}... (${allContacts.length} contacts)`,
      });

      // Rate limiting
      if (hasMore) {
        await this.delay(RATE_LIMIT_DELAY);
      }
    }

    return {
      contacts: allContacts,
      nextCursor: pageToken,
    };
  }

  /**
   * Create contact in Nylas
   */
  async createRemoteContact(contact: Partial<ContactV4>): Promise<NylasContact> {
    const url = `${NYLAS_API_URI}/v3/grants/${this.grantId}/contacts`;

    const requestBody = this.transformToNylas(contact);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to create contact: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Update contact in Nylas
   */
  async updateRemoteContact(nylasContactId: string, contact: Partial<ContactV4>): Promise<NylasContact> {
    const url = `${NYLAS_API_URI}/v3/grants/${this.grantId}/contacts/${nylasContactId}`;

    const requestBody = this.transformToNylas(contact);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to update contact: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete contact in Nylas
   */
  async deleteRemoteContact(nylasContactId: string): Promise<void> {
    const url = `${NYLAS_API_URI}/v3/grants/${this.grantId}/contacts/${nylasContactId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete contact: ${response.status} ${response.statusText}`);
    }
  }

  // ============================================
  // CONTACT PROCESSING
  // ============================================

  /**
   * Process fetched contacts (create, update, detect conflicts)
   */
  private async processContacts(nylasContacts: NylasContact[]): Promise<{
    imported: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
    conflicts: number;
  }> {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let conflicts = 0;

    // Fetch ALL existing contacts for this account in ONE query
    const existingContacts = await db.query.contactsV4.findMany({
      where: and(
        eq(contactsV4.userId, this.userId),
        eq(contactsV4.accountId, this.accountId),
        eq(contactsV4.isDeleted, false)
      ),
    });

    // Create lookup map by nylas_contact_id
    const existingMap = new Map(
      existingContacts
        .filter(c => c.nylasContactId)
        .map(c => [c.nylasContactId!, c])
    );

    console.log(`📋 Found ${existingContacts.length} existing contacts`);

    // Prepare batch inserts/updates
    const contactsToInsert: any[] = [];
    const contactsToUpdate: { id: string; data: any }[] = [];

    for (let i = 0; i < nylasContacts.length; i++) {
      const nylasContact = nylasContacts[i];

      try {
        // Validate contact has email or phone
        if (!nylasContact.emails?.length && !nylasContact.phone_numbers?.length) {
          skipped++;
          continue;
        }

        // Check if contact exists
        const existing = existingMap.get(nylasContact.id);

        if (existing) {
          // Check for conflicts
          const hasConflict = await this.detectConflict(existing, nylasContact);

          if (hasConflict) {
            // Create conflict record for manual resolution
            await this.createConflictRecord(existing, nylasContact);
            conflicts++;
            skipped++;
          } else {
            // Safe to update
            const updateData = this.transformFromNylas(nylasContact);
            contactsToUpdate.push({
              id: existing.id,
              data: {
                ...updateData,
                remoteUpdatedAt: nylasContact.updated_at
                  ? new Date(nylasContact.updated_at * 1000)
                  : null,
                lastSyncedAt: new Date(),
                version: (existing.version || 0) + 1,
              },
            });
            updated++;
          }
        } else {
          // New contact - prepare for insert
          const insertData = this.transformFromNylas(nylasContact);
          contactsToInsert.push({
            ...insertData,
            userId: this.userId,
            accountId: this.accountId,
            nylasContactId: nylasContact.id,
            nylasGrantId: nylasContact.grant_id,
            provider: this.provider,
            source: nylasContact.source || 'address_book',
            remoteUpdatedAt: nylasContact.updated_at
              ? new Date(nylasContact.updated_at * 1000)
              : null,
            lastSyncedAt: new Date(),
          });
          imported++;
        }
      } catch (error: any) {
        console.error('Error processing contact:', error);
        errors++;
      }

      // Send progress update
      if ((i + 1) % 10 === 0 || i === nylasContacts.length - 1) {
        const percentage = Math.round(((i + 1) / nylasContacts.length) * 100);

        this.sendProgress({
          type: 'progress',
          total: nylasContacts.length,
          current: i + 1,
          percentage,
          imported,
          updated,
          skipped,
          errors,
          conflicts,
          status: `Processing: ${i + 1} / ${nylasContacts.length} (${percentage}%)`,
        });

        await this.updateSyncState({
          progress_current: i + 1,
          progress_total: nylasContacts.length,
          progress_percentage: percentage,
        });
      }
    }

    // Batch insert new contacts
    if (contactsToInsert.length > 0) {
      this.sendProgress({
        type: 'progress',
        status: `Saving ${contactsToInsert.length} new contacts...`,
      });

      for (let i = 0; i < contactsToInsert.length; i += INSERT_BATCH_SIZE) {
        const batch = contactsToInsert.slice(i, i + INSERT_BATCH_SIZE);
        try {
          await db.insert(contactsV4).values(batch);
          console.log(`✅ Inserted batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1} (${batch.length} contacts)`);
        } catch (error: any) {
          console.error('❌ Batch insert error:', error);
          errors += batch.length;
          imported -= batch.length;
        }
      }
    }

    // Batch update existing contacts
    if (contactsToUpdate.length > 0) {
      this.sendProgress({
        type: 'progress',
        status: `Updating ${contactsToUpdate.length} contacts...`,
      });

      for (const { id, data } of contactsToUpdate) {
        try {
          await db.update(contactsV4)
            .set(data)
            .where(eq(contactsV4.id, id));
        } catch (error: any) {
          console.error('❌ Update error:', error);
          errors++;
          updated--;
        }
      }
    }

    return {
      imported,
      updated,
      deleted: 0, // Delta sync will handle deletes
      skipped,
      errors,
      conflicts,
    };
  }

  // ============================================
  // CONFLICT DETECTION & RESOLUTION
  // ============================================

  /**
   * Detect if contact has conflicting changes
   */
  private async detectConflict(local: any, remote: NylasContact): Promise<boolean> {
    // If local was never synced, no conflict
    if (!local.lastSyncedAt) {
      return false;
    }

    // If local wasn't modified since last sync, no conflict
    if (!local.localUpdatedAt || local.localUpdatedAt <= local.lastSyncedAt) {
      return false;
    }

    // If remote wasn't updated since last sync, no conflict
    const remoteUpdatedAt = remote.updated_at
      ? new Date(remote.updated_at * 1000)
      : null;

    if (!remoteUpdatedAt || remoteUpdatedAt <= local.lastSyncedAt) {
      return false;
    }

    // Both local and remote were modified since last sync = CONFLICT
    console.log(`⚠️ Conflict detected for contact ${local.id}`);
    return true;
  }

  /**
   * Create conflict record for manual resolution
   */
  private async createConflictRecord(local: any, remote: NylasContact): Promise<void> {
    try {
      await db.insert(contactConflicts).values({
        userId: this.userId,
        contactId: local.id,
        localVersion: local,
        remoteVersion: remote,
        conflictFields: this.detectConflictFields(local, remote),
        conflictReason: 'Concurrent modifications detected',
        conflictType: 'concurrent_edit',
        status: 'pending',
      });

      console.log(`📝 Created conflict record for contact ${local.id}`);
    } catch (error: any) {
      console.error('Error creating conflict record:', error);
    }
  }

  /**
   * Detect which fields have conflicting values
   */
  private detectConflictFields(local: any, remote: NylasContact): string[] {
    const fields: string[] = [];

    if (local.givenName !== remote.given_name) fields.push('given_name');
    if (local.surname !== remote.surname) fields.push('surname');
    if (local.jobTitle !== remote.job_title) fields.push('job_title');
    if (local.companyName !== remote.company_name) fields.push('company_name');

    // Compare JSONB arrays (emails, phones, etc.)
    if (JSON.stringify(local.emails) !== JSON.stringify(remote.emails)) {
      fields.push('emails');
    }
    if (JSON.stringify(local.phoneNumbers) !== JSON.stringify(remote.phone_numbers)) {
      fields.push('phone_numbers');
    }

    return fields;
  }

  // ============================================
  // DATA TRANSFORMATION
  // ============================================

  /**
   * Transform Nylas contact to local format
   */
  private transformFromNylas(nylas: NylasContact): Partial<ContactV4> {
    return {
      givenName: nylas.given_name || null,
      middleName: nylas.middle_name || null,
      surname: nylas.surname || null,
      suffix: nylas.suffix || null,
      nickname: nylas.nickname || null,
      emails: nylas.emails || [],
      phoneNumbers: nylas.phone_numbers || [],
      physicalAddresses: nylas.physical_addresses || [],
      webPages: nylas.web_pages || [],
      imAddresses: nylas.im_addresses || [],
      jobTitle: nylas.job_title || null,
      companyName: nylas.company_name || null,
      managerName: nylas.manager_name || null,
      officeLocation: nylas.office_location || null,
      department: nylas.department || null,
      birthday: nylas.birthday ? new Date(nylas.birthday) : null,
      notes: nylas.notes || null,
      pictureUrl: nylas.picture_url || null,
      groups: nylas.groups || [],
      syncStatus: 'synced',
    };
  }

  /**
   * Transform local contact to Nylas format
   */
  private transformToNylas(local: Partial<ContactV4>): Partial<NylasContact> {
    return {
      given_name: local.givenName || undefined,
      middle_name: local.middleName || undefined,
      surname: local.surname || undefined,
      suffix: local.suffix || undefined,
      nickname: local.nickname || undefined,
      emails: local.emails || [],
      phone_numbers: local.phoneNumbers || [],
      physical_addresses: local.physicalAddresses || [],
      web_pages: local.webPages || [],
      im_addresses: local.imAddresses || [],
      job_title: local.jobTitle || undefined,
      company_name: local.companyName || undefined,
      manager_name: local.managerName || undefined,
      office_location: local.officeLocation || undefined,
      department: local.department || undefined,
      birthday: local.birthday ? local.birthday.toISOString().split('T')[0] : undefined,
      notes: local.notes || undefined,
      groups: local.groups || [],
    };
  }

  // ============================================
  // SYNC STATE MANAGEMENT
  // ============================================

  /**
   * Get sync state for account
   */
  private async getSyncState(): Promise<any | null> {
    const results = await db.query.contactSyncState.findFirst({
      where: eq(contactSyncState.accountId, this.accountId),
    });

    return results || null;
  }

  /**
   * Update sync state
   */
  private async updateSyncState(updates: Partial<ContactSyncState>): Promise<void> {
    try {
      const existing = await this.getSyncState();

      if (existing) {
        await db.update(contactSyncState)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(contactSyncState.accountId, this.accountId));
      } else {
        await db.insert(contactSyncState).values({
          userId: this.userId,
          accountId: this.accountId,
          ...updates,
        });
      }
    } catch (error: any) {
      console.error('Error updating sync state:', error);
    }
  }

  /**
   * Log sync operation
   */
  private async logSyncOperation(log: {
    operation: string;
    direction: string;
    status: string;
    errorMessage?: string;
    durationMs?: number;
    triggeredBy?: string;
  }): Promise<void> {
    try {
      await db.insert(contactSyncLogs).values({
        userId: this.userId,
        accountId: this.accountId,
        contactId: null,
        operation: log.operation as any,
        direction: log.direction as any,
        status: log.status as any,
        errorMessage: log.errorMessage || null,
        durationMs: log.durationMs || null,
        triggeredBy: log.triggeredBy as any,
      });
    } catch (error: any) {
      console.error('Error logging sync operation:', error);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Send progress update
   */
  private sendProgress(update: SyncProgressUpdate): void {
    if (this.onProgress) {
      this.onProgress(update);
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createContactsSyncService(options: SyncOptions): ContactsV4SyncService {
  return new ContactsV4SyncService(options);
}
