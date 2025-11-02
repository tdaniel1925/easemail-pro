import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { labels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/labels - Fetch all labels for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userLabels = await db.query.labels.findMany({
      where: eq(labels.userId, user.id),
      orderBy: (labels, { asc }) => [asc(labels.name)],
    });

    return NextResponse.json({
      success: true,
      labels: userLabels,
    });
  } catch (error: any) {
    console.error('Error fetching labels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch labels', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/labels - Create a new label
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, color } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Label name is required' },
        { status: 400 }
      );
    }

    // Check if label already exists for this user
    const existing = await db.query.labels.findFirst({
      where: and(
        eq(labels.userId, user.id),
        eq(labels.name, name.trim())
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Label already exists' },
        { status: 400 }
      );
    }

    const [label] = await db.insert(labels).values({
      userId: user.id,
      name: name.trim(),
      color: color || '#4ecdc4',
    }).returning();

    return NextResponse.json({
      success: true,
      label,
    });
  } catch (error: any) {
    console.error('Error creating label:', error);
    return NextResponse.json(
      { error: 'Failed to create label', message: error.message },
      { status: 500 }
    );
  }
}

