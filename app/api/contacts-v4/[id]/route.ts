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

export const dynamic = 'force-dynamic';

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
    const { updates, sync_immediately } = body;

    if (!updates) {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
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

    // TODO: If sync_immediately is true, trigger sync to Nylas

    return NextResponse.json({
      success: true,
      contact: transformContactToResponse(updatedContact),
    });
  } catch (error: any) {
    console.error('❌ Update contact error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update contact' },
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

    // TODO: Trigger sync to Nylas to delete remotely

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
    account_id: contact.accountId,
    user_id: contact.userId,
    nylas_contact_id: contact.nylasContactId,
    nylas_grant_id: contact.nylasGrantId,
    provider: contact.provider,
    source: contact.source,

    // Name fields
    display_name: contact.displayName,
    given_name: contact.givenName,
    middle_name: contact.middleName,
    surname: contact.surname,
    suffix: contact.suffix,
    nickname: contact.nickname,

    // Contact methods
    emails: contact.emails,
    phone_numbers: contact.phoneNumbers,
    physical_addresses: contact.physicalAddresses,
    web_pages: contact.webPages,
    im_addresses: contact.imAddresses,

    // Professional
    job_title: contact.jobTitle,
    company_name: contact.companyName,
    manager_name: contact.managerName,
    office_location: contact.officeLocation,
    department: contact.department,

    // Personal
    birthday: contact.birthday,
    notes: contact.notes,
    picture_url: contact.pictureUrl,

    // Organization
    groups: contact.groups,
    tags: contact.tags,

    // Metadata
    is_favorite: contact.isFavorite,
    is_deleted: contact.isDeleted,
    sync_status: contact.syncStatus,
    sync_error: contact.syncError,
    version: contact.version,

    // Timestamps
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
    last_synced_at: contact.lastSyncedAt,
    local_updated_at: contact.localUpdatedAt,
    remote_updated_at: contact.remoteUpdatedAt,
  };
}
