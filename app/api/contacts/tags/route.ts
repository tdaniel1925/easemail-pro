import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactTags, contactTagAssignments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/contacts/tags - List all user's tags
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await db
      .select()
      .from(contactTags)
      .where(eq(contactTags.userId, user.id))
      .orderBy(contactTags.name);

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/contacts/tags - Create new tag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, icon, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const [newTag] = await db
      .insert(contactTags)
      .values({
        userId: user.id,
        name: name.trim(),
        color: color || '#4ecdc4',
        icon: icon || null,
        description: description || null,
      })
      .returning();

    return NextResponse.json({ success: true, tag: newTag });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    
    if (error.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create tag' },
      { status: 500 }
    );
  }
}

