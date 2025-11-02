import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactGroups } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/contacts/groups - List all user's groups
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups = await db
      .select()
      .from(contactGroups)
      .where(eq(contactGroups.userId, user.id))
      .orderBy(contactGroups.name);

    return NextResponse.json({ success: true, groups });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST /api/contacts/groups - Create new group
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, icon, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const [newGroup] = await db
      .insert(contactGroups)
      .values({
        userId: user.id,
        name: name.trim(),
        color: color || '#6366f1',
        icon: icon || null,
        description: description || null,
      })
      .returning();

    return NextResponse.json({ success: true, group: newGroup });
  } catch (error: any) {
    console.error('Error creating group:', error);
    
    if (error.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create group' },
      { status: 500 }
    );
  }
}

