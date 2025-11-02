import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactGroupMemberships, contactGroups, contacts } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// POST /api/contacts/groups/assign - Add contacts to groups
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds, groupIds } = body;

    if (!Array.isArray(contactIds) || !Array.isArray(groupIds)) {
      return NextResponse.json(
        { error: 'contactIds and groupIds must be arrays' },
        { status: 400 }
      );
    }

    if (contactIds.length === 0 || groupIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one contact and one group are required' },
        { status: 400 }
      );
    }

    // Verify user owns these contacts
    const userContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.userId, user.id), inArray(contacts.id, contactIds)));

    if (userContacts.length !== contactIds.length) {
      return NextResponse.json(
        { error: 'Some contacts not found or unauthorized' },
        { status: 403 }
      );
    }

    // Verify user owns these groups
    const userGroups = await db
      .select({ id: contactGroups.id })
      .from(contactGroups)
      .where(and(eq(contactGroups.userId, user.id), inArray(contactGroups.id, groupIds)));

    if (userGroups.length !== groupIds.length) {
      return NextResponse.json(
        { error: 'Some groups not found or unauthorized' },
        { status: 403 }
      );
    }

    // Create memberships (ignore duplicates)
    const memberships = [];
    for (const contactId of contactIds) {
      for (const groupId of groupIds) {
        memberships.push({
          contactId,
          groupId,
        });
      }
    }

    // Use ON CONFLICT DO NOTHING to avoid duplicates
    const result = await db
      .insert(contactGroupMemberships)
      .values(memberships)
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({
      success: true,
      message: `Added ${contactIds.length} contact(s) to ${groupIds.length} group(s)`,
      membershipsCreated: result.length,
    });
  } catch (error: any) {
    console.error('Error adding contacts to groups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add contacts to groups' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/groups/assign - Remove contacts from groups
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds, groupIds } = body;

    if (!Array.isArray(contactIds) || !Array.isArray(groupIds)) {
      return NextResponse.json(
        { error: 'contactIds and groupIds must be arrays' },
        { status: 400 }
      );
    }

    // Verify user owns these contacts
    const userContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.userId, user.id), inArray(contacts.id, contactIds)));

    if (userContacts.length !== contactIds.length) {
      return NextResponse.json(
        { error: 'Some contacts not found or unauthorized' },
        { status: 403 }
      );
    }

    // Delete memberships
    await db
      .delete(contactGroupMemberships)
      .where(
        and(
          inArray(contactGroupMemberships.contactId, contactIds),
          inArray(contactGroupMemberships.groupId, groupIds)
        )
      );

    return NextResponse.json({
      success: true,
      message: `Removed ${contactIds.length} contact(s) from ${groupIds.length} group(s)`,
    });
  } catch (error: any) {
    console.error('Error removing contacts from groups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove contacts from groups' },
      { status: 500 }
    );
  }
}

