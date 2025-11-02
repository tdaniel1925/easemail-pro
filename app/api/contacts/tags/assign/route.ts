import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactTagAssignments, contactTags, contacts } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// POST /api/contacts/tags/assign - Assign tags to contacts
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds, tagIds } = body;

    if (!Array.isArray(contactIds) || !Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'contactIds and tagIds must be arrays' },
        { status: 400 }
      );
    }

    if (contactIds.length === 0 || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one contact and one tag are required' },
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

    // Verify user owns these tags
    const userTags = await db
      .select({ id: contactTags.id })
      .from(contactTags)
      .where(and(eq(contactTags.userId, user.id), inArray(contactTags.id, tagIds)));

    if (userTags.length !== tagIds.length) {
      return NextResponse.json(
        { error: 'Some tags not found or unauthorized' },
        { status: 403 }
      );
    }

    // Create assignments (ignore duplicates)
    const assignments = [];
    for (const contactId of contactIds) {
      for (const tagId of tagIds) {
        assignments.push({
          contactId,
          tagId,
        });
      }
    }

    // Use ON CONFLICT DO NOTHING to avoid duplicates
    const result = await db
      .insert(contactTagAssignments)
      .values(assignments)
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({
      success: true,
      message: `Assigned ${tagIds.length} tag(s) to ${contactIds.length} contact(s)`,
      assignmentsCreated: result.length,
    });
  } catch (error: any) {
    console.error('Error assigning tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign tags' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/tags/assign - Remove tags from contacts
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds, tagIds } = body;

    if (!Array.isArray(contactIds) || !Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'contactIds and tagIds must be arrays' },
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

    // Delete assignments
    await db
      .delete(contactTagAssignments)
      .where(
        and(
          inArray(contactTagAssignments.contactId, contactIds),
          inArray(contactTagAssignments.tagId, tagIds)
        )
      );

    return NextResponse.json({
      success: true,
      message: `Removed ${tagIds.length} tag(s) from ${contactIds.length} contact(s)`,
    });
  } catch (error: any) {
    console.error('Error removing tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove tags' },
      { status: 500 }
    );
  }
}

