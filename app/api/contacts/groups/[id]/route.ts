import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactGroups } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/contacts/groups/[id] - Get group details
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

    const [group] = await db
      .select()
      .from(contactGroups)
      .where(and(eq(contactGroups.id, params.id), eq(contactGroups.userId, user.id)));

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

// PATCH /api/contacts/groups/[id] - Update group
export async function PATCH(
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
    const { name, color, icon, description } = body;

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;

    const [updatedGroup] = await db
      .update(contactGroups)
      .set(updates)
      .where(and(eq(contactGroups.id, params.id), eq(contactGroups.userId, user.id)))
      .returning();

    if (!updatedGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, group: updatedGroup });
  } catch (error: any) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/groups/[id] - Delete group
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

    // Delete group (cascade will handle memberships)
    const [deletedGroup] = await db
      .delete(contactGroups)
      .where(and(eq(contactGroups.id, params.id), eq(contactGroups.userId, user.id)))
      .returning();

    if (!deletedGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete group' },
      { status: 500 }
    );
  }
}

