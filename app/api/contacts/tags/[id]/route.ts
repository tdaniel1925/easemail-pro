import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactTags, contactTagAssignments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/contacts/tags/[id] - Get tag details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [tag] = await db
      .select()
      .from(contactTags)
      .where(and(eq(contactTags.id, params.id), eq(contactTags.userId, user.id)));

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tag });
  } catch (error: any) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

// PATCH /api/contacts/tags/[id] - Update tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
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

    const [updatedTag] = await db
      .update(contactTags)
      .set(updates)
      .where(and(eq(contactTags.id, params.id), eq(contactTags.userId, user.id)))
      .returning();

    if (!updatedTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tag: updatedTag });
  } catch (error: any) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/tags/[id] - Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete tag (cascade will handle assignments)
    const [deletedTag] = await db
      .delete(contactTags)
      .where(and(eq(contactTags.id, params.id), eq(contactTags.userId, user.id)))
      .returning();

    if (!deletedTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete tag' },
      { status: 500 }
    );
  }
}

