import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { labels, emailLabels, emails } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// DELETE /api/labels/[id] - Delete a label
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const labelId = params.id;

    // Verify label belongs to user
    const label = await db.query.labels.findFirst({
      where: and(
        eq(labels.id, labelId),
        eq(labels.userId, user.id)
      ),
    });

    if (!label) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    // Delete the label (emailLabels junction entries will be cascade deleted)
    await db.delete(labels)
      .where(eq(labels.id, labelId));

    return NextResponse.json({
      success: true,
      message: 'Label deleted',
    });
  } catch (error: any) {
    console.error('Error deleting label:', error);
    return NextResponse.json(
      { error: 'Failed to delete label', message: error.message },
      { status: 500 }
    );
  }
}

