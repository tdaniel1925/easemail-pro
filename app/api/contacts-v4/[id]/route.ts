/**
 * Contacts V4 Individual Contact API
 * GET /api/contacts-v4/[id] - Get contact by ID
 * PUT /api/contacts-v4/[id] - Update contact
 * DELETE /api/contacts-v4/[id] - Delete contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema-contacts-v4';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ✅ SECURITY: Input validation schema for contact updates
const emailSchema = z.object({
  email: z.string().email(),
  type: z.enum(['work', 'personal', 'other']).optional(),
});

const phoneSchema = z.object({
  number: z.string().min(1).max(50),
  type: z.enum(['mobile', 'work', 'home', 'other']).optional(),
});

const addressSchema = z.object({
  street: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  type: z.enum(['work', 'home', 'other']).optional(),
});

const contactUpdateSchema = z.object({
  updates: z.object({
    given_name: z.string().max(255).optional(),
    middle_name: z.string().max(255).optional(),
    surname: z.string().max(255).optional(),
    suffix: z.string().max(50).optional(),
    nickname: z.string().max(255).optional(),
    emails: z.array(emailSchema).max(10).optional(),
    phone_numbers: z.array(phoneSchema).max(10).optional(),
    physical_addresses: z.array(addressSchema).max(5).optional(),
    web_pages: z.array(z.string().url()).max(10).optional(),
    im_addresses: z.array(z.string().max(255)).max(10).optional(),
    job_title: z.string().max(255).optional(),
    company_name: z.string().max(255).optional(),
    manager_name: z.string().max(255).optional(),
    office_location: z.string().max(255).optional(),
    department: z.string().max(255).optional(),
    birthday: z.string().optional(),
    notes: z.string().max(5000).optional(),
    groups: z.array(z.object({
      name: z.string().max(255),
    })).max(20).optional(),
    tags: z.array(z.string().max(100)).max(50).optional(),
    is_favorite: z.boolean().optional(),
  }),
  sync_immediately: z.boolean().optional(),
  last_updated_at: z.string().datetime().optional(), // For optimistic locking
});

/**
 * GET - Get contact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contact from database
    const contact = await db.query.contactsV4.findFirst({
      where: and(
        eq(contactsV4.id, params.id),
        eq(contactsV4.userId, user.id),
        eq(contactsV4.isDeleted, false)
      ),
    });

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contact: transformContactToResponse(contact),
    });
  } catch (error: any) {
    console.error('❌ Get contact error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update contact
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // ✅ SECURITY: Validate input with Zod schema
    const validationResult = contactUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid contact data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { updates, sync_immediately, last_updated_at } = validationResult.data;

    // Optimistic locking: Check if contact has been updated since client last saw it
    if (last_updated_at) {
      const existingContact = await db.query.contactsV4.findFirst({
        where: and(
          eq(contactsV4.id, params.id),
          eq(contactsV4.userId, user.id),
          eq(contactsV4.isDeleted, false)
        ),
      });

      if (!existingContact) {
        return NextResponse.json(
          { success: false, error: 'Contact not found' },
          { status: 404 }
        );
      }

      // Check if contact was modified after client's version
      const clientTimestamp = new Date(last_updated_at);
      const serverTimestamp = existingContact.localUpdatedAt || existingContact.createdAt;

      if (serverTimestamp > clientTimestamp) {
        return NextResponse.json(
          {
            success: false,
            error: 'Contact has been modified by another process',
            conflict: true,
            serverVersion: existingContact,
          },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      localUpdatedAt: new Date(),
      syncStatus: sync_immediately ? 'pending_update' : 'synced',
    };

    // Map snake_case API fields to camelCase DB fields
    if (updates.given_name !== undefined) updateData.givenName = updates.given_name;
    if (updates.middle_name !== undefined) updateData.middleName = updates.middle_name;
    if (updates.surname !== undefined) updateData.surname = updates.surname;
    if (updates.suffix !== undefined) updateData.suffix = updates.suffix;
    if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
    if (updates.emails !== undefined) updateData.emails = updates.emails;
    if (updates.phone_numbers !== undefined) updateData.phoneNumbers = updates.phone_numbers;
    if (updates.physical_addresses !== undefined) updateData.physicalAddresses = updates.physical_addresses;
    if (updates.web_pages !== undefined) updateData.webPages = updates.web_pages;
    if (updates.im_addresses !== undefined) updateData.imAddresses = updates.im_addresses;
    if (updates.job_title !== undefined) updateData.jobTitle = updates.job_title;
    if (updates.company_name !== undefined) updateData.companyName = updates.company_name;
    if (updates.manager_name !== undefined) updateData.managerName = updates.manager_name;
    if (updates.office_location !== undefined) updateData.officeLocation = updates.office_location;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.birthday !== undefined) updateData.birthday = updates.birthday;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.groups !== undefined) updateData.groups = updates.groups;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.is_favorite !== undefined) updateData.isFavorite = updates.is_favorite;

    // Update contact
    const [updatedContact] = await db
      .update(contactsV4)
      .set(updateData)
      .where(
        and(
          eq(contactsV4.id, params.id),
          eq(contactsV4.userId, user.id),
          eq(contactsV4.isDeleted, false)
        )
      )
      .returning();

    if (!updatedContact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Trigger immediate sync to Nylas if requested
    if (body.sync_immediately) {
      const { triggerContactSync } = await import('@/lib/services/contacts-v4-sync-trigger');

      // Trigger async (don't wait for response)
      triggerContactSync({
        contactId: updatedContact.id,
        userId: user.id,
      }).then((result) => {
        if (result.success) {
          console.log(`✅ Contact updated in Nylas: ${updatedContact.id}`);
        } else {
          console.error(`⚠️ Contact update sync failed: ${result.error}`);
        }
      }).catch((error) => {
        console.error(`❌ Contact update sync trigger error:`, error);
      });
    }

    return NextResponse.json({
      success: true,
      contact: transformContactToResponse(updatedContact),
    });
  } catch (error: any) {
    // ✅ SECURITY: Log detailed error internally, return generic message
    console.error('❌ Update contact error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete - mark as deleted
    const [deletedContact] = await db
      .update(contactsV4)
      .set({
        isDeleted: true,
        localUpdatedAt: new Date(),
        syncStatus: 'pending_delete',
      })
      .where(
        and(
          eq(contactsV4.id, params.id),
          eq(contactsV4.userId, user.id),
          eq(contactsV4.isDeleted, false)
        )
      )
      .returning();

    if (!deletedContact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Trigger immediate sync to Nylas to delete remotely
    const { triggerContactSync } = await import('@/lib/services/contacts-v4-sync-trigger');

    // Trigger async (don't wait for response)
    triggerContactSync({
      contactId: deletedContact.id,
      userId: user.id,
    }).then((result) => {
      if (result.success) {
        console.log(`✅ Contact deleted in Nylas: ${deletedContact.id}`);
      } else {
        console.error(`⚠️ Contact deletion sync failed: ${result.error}`);
      }
    }).catch((error) => {
      console.error(`❌ Contact deletion sync trigger error:`, error);
    });

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Delete contact error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPERS
// ============================================

function transformContactToResponse(contact: any) {
  return {
    id: contact.id,
    accountId: contact.accountId,
    userId: contact.userId,
    nylasContactId: contact.nylasContactId,
    nylasGrantId: contact.nylasGrantId,
    provider: contact.provider,
    source: contact.source,

    // Name fields
    displayName: contact.displayName,
    givenName: contact.givenName,
    middleName: contact.middleName,
    surname: contact.surname,
    suffix: contact.suffix,
    nickname: contact.nickname,

    // Contact methods
    emails: contact.emails,
    phoneNumbers: contact.phoneNumbers,
    physicalAddresses: contact.physicalAddresses,
    webPages: contact.webPages,
    imAddresses: contact.imAddresses,

    // Professional
    jobTitle: contact.jobTitle,
    companyName: contact.companyName,
    managerName: contact.managerName,
    officeLocation: contact.officeLocation,
    department: contact.department,

    // Personal
    birthday: contact.birthday,
    notes: contact.notes,
    pictureUrl: contact.pictureUrl,

    // Organization
    groups: contact.groups,
    tags: contact.tags,

    // Metadata
    isFavorite: contact.isFavorite,
    isDeleted: contact.isDeleted,
    syncStatus: contact.syncStatus,
    syncError: contact.syncError,
    version: contact.version,

    // Timestamps
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    lastSyncedAt: contact.lastSyncedAt,
    localUpdatedAt: contact.localUpdatedAt,
    remoteUpdatedAt: contact.remoteUpdatedAt,
  };
}
