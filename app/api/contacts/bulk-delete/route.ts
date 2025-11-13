import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { contactIds } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: contactIds array' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Starting bulk delete of ${contactIds.length} contacts for user ${user.id}`);

    // 3. Verify all contacts belong to this user before deleting
    const contactsToDelete = await db.query.contacts.findMany({
      where: inArray(contacts.id, contactIds),
    });

    const unauthorizedContacts = contactsToDelete.filter(c => c.userId !== user.id);
    if (unauthorizedContacts.length > 0) {
      console.error(`❌ User ${user.id} attempted to delete ${unauthorizedContacts.length} contacts they don't own`);
      return NextResponse.json(
        { error: 'Unauthorized: Some contacts do not belong to you' },
        { status: 403 }
      );
    }

    // 4. Delete all contacts in a single transaction
    // This is much faster than individual DELETE requests
    const result = await db.delete(contacts)
      .where(inArray(contacts.id, contactIds))
      .returning();

    console.log(`✅ Successfully deleted ${result.length} contacts for user ${user.id}`);

    return NextResponse.json({
      success: true,
      deletedCount: result.length,
      message: `Successfully deleted ${result.length} contact(s)`,
    });

  } catch (error: any) {
    console.error('❌ Bulk delete error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete contacts',
        details: error.message
      },
      { status: 500 }
    );
  }
}
