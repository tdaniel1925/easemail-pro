import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Get all contact IDs (for bulk selection)
 * GET /api/contacts-v4/all-ids
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const searchQuery = searchParams.get('search');

    console.log('🔍 Fetching all contact IDs for user:', user.id, { accountId, searchQuery });

    // Build where conditions
    const conditions = [eq(contactsV4.userId, user.id)];

    // Filter by account if specified (and not 'all')
    if (accountId && accountId !== 'all') {
      conditions.push(eq(contactsV4.emailAccountId, accountId));
    }

    // Apply search filter if provided
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      conditions.push(
        or(
          ilike(contactsV4.displayName, searchTerm),
          sql`${contactsV4.emails}::text ILIKE ${searchTerm}`,
          sql`${contactsV4.phoneNumbers}::text ILIKE ${searchTerm}`,
          ilike(contactsV4.companyName, searchTerm)
        )!
      );
    }

    // Fetch only IDs
    const contactIds = await db
      .select({ id: contactsV4.id })
      .from(contactsV4)
      .where(and(...conditions));

    console.log(`✅ Found ${contactIds.length} contact IDs`);

    return NextResponse.json({
      ids: contactIds.map(c => c.id),
      total: contactIds.length,
    });
  } catch (error: any) {
    console.error('❌ Get all IDs error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch contact IDs',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
