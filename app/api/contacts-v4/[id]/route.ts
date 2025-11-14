/**
 * Contacts V4 Individual Contact API
 * GET /api/contacts-v4/[id] - Get single contact
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
 * GET - Get single contact by ID
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

    // Fetch contact
    const contact = await db.query.contactsV4.findFirst({
      where: and(
        eq(contactsV4.id, params.id),
        eq(contactsV4.userId, user.id),
        eq(contactsV4.isDeleted, false)
      ),
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contact,
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
        { error: 'updates field is required' },
        { status: 400 }
      );
    }

    // Check if contact exists and belongs to user
    const existing = await db.query.contactsV4.findFirst({
      where: and(
        eq(contactsV4.id, params.id),
        eq(contactsV4.userId, user.id),
        eq(contactsV4.isDeleted, false)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Validate that contact has at least email or phone after update
    const newEmails = updates.emails || existing.emails;
    const newPhones = updates.phone_numbers || existing.phoneNumbers;

    if (
      (!newEmails || (Array.isArray(newEmails) && newEmails.length === 0)) &&
      (!newPhones || (Array.isArray(newPhones) && newPhones.length === 0))
    ) {
      return NextResponse.json(
        { error: 'Contact must have at least one email or phone number' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      localUpdatedAt: new Date(),
      syncStatus: sync_immediately ? 'pending_update' : existing.syncStatus,
    };

    // Map form fields to database fields
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
    if (updates.birthday !== undefined) updateData.birthday = updates.birthday ? new Date(updates.birthday) : null;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.groups !== undefined) updateData.groups = updates.groups;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.is_favorite !== undefined) updateData.isFavorite = updates.is_favorite;

    // Update contact
    const [updatedContact] = await db
      .update(contactsV4)
      .set(updateData)
      .where(and(
        eq(contactsV4.id, params.id),
        eq(contactsV4.userId, user.id)
      ))
      .returning();

    // TODO: If sync_immediately is true, trigger sync to Nylas

    return NextResponse.json({
      success: true,
      contact: updatedContact,
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

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Check if contact exists and belongs to user
    const existing = await db.query.contactsV4.findFirst({
      where: and(
        eq(contactsV4.id, params.id),
        eq(contactsV4.userId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Permanent delete
      await db
        .delete(contactsV4)
        .where(and(
          eq(contactsV4.id, params.id),
          eq(contactsV4.userId, user.id)
        ));

      // TODO: If contact was synced, delete from Nylas
    } else {
      // Soft delete
      await db
        .update(contactsV4)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          syncStatus: 'pending_delete',
          localUpdatedAt: new Date(),
        })
        .where(and(
          eq(contactsV4.id, params.id),
          eq(contactsV4.userId, user.id)
        ));

      // TODO: Trigger delete sync to Nylas
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? 'Contact permanently deleted' : 'Contact deleted',
    });
  } catch (error: any) {
    console.error('❌ Delete contact error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
