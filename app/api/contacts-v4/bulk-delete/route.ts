import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema';
import { inArray, and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Bulk delete contacts
 * DELETE /api/contacts-v4/bulk-delete
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Contact IDs array is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Bulk deleting ${contactIds.length} contacts for user ${user.id}`);

    // Delete contacts - only those belonging to the user
    const result = await db
      .delete(contactsV4)
      .where(
        and(
          eq(contactsV4.userId, user.id),
          inArray(contactsV4.id, contactIds)
        )
      );

    console.log(`✅ Successfully deleted ${contactIds.length} contacts`);

    return NextResponse.json({
      success: true,
      deleted: contactIds.length,
    });
  } catch (error: any) {
    console.error('❌ Bulk delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete contacts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
