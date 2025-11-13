/**
 * Admin API: Cleanup Default Tags
 * Removes default/unwanted tags from all contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts, users } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

// List of tags to remove
const TAGS_TO_REMOVE = [
  'Contacts',
  'My Contacts',
  'Starred',
  'Other Contacts',
  'Default',
  'All Contacts',
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate and check admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🧹 Starting tag cleanup (admin)...');

    // Get all contacts with tags
    const allContacts = await db.select().from(contacts);

    let updatedCount = 0;
    let totalTagsRemoved = 0;

    for (const contact of allContacts) {
      if (!contact.tags || contact.tags.length === 0) {
        continue;
      }

      // Filter out unwanted tags
      const originalTagsCount = contact.tags.length;
      const cleanedTags = contact.tags.filter(
        (tag: string) => !TAGS_TO_REMOVE.some(
          unwanted => tag.toLowerCase() === unwanted.toLowerCase()
        )
      );

      // Update if tags were removed
      if (cleanedTags.length < originalTagsCount) {
        await db.update(contacts)
          .set({ tags: cleanedTags })
          .where(sql`id = ${contact.id}`);

        const removedCount = originalTagsCount - cleanedTags.length;
        totalTagsRemoved += removedCount;
        updatedCount++;
      }
    }

    const duration = Date.now() - startTime;

    console.log('✅ Tag cleanup complete!');
    console.log(`   - Contacts updated: ${updatedCount}`);
    console.log(`   - Total tags removed: ${totalTagsRemoved}`);

    return NextResponse.json({
      success: true,
      contactsUpdated: updatedCount,
      tagsRemoved: totalTagsRemoved,
      totalContacts: allContacts.length,
      duration,
    });
  } catch (error) {
    console.error('❌ Tag cleanup failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Tag cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
