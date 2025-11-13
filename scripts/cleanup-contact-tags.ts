/**
 * Script to remove unwanted tags from all contacts
 * Usage: npx tsx scripts/cleanup-contact-tags.ts
 */

import { db } from '../lib/db/drizzle';
import { contacts } from '../lib/db/schema';
import { sql } from 'drizzle-orm';

// List of tags to remove (add more as needed)
const TAGS_TO_REMOVE = [
  'Contacts',
  'My Contacts',
  'Starred',
  'Other Contacts',
  'Default',
  'All Contacts',
  // Add more default/unwanted tags here
];

async function cleanupTags() {
  console.log('🧹 Starting contact tag cleanup...');
  console.log(`Tags to remove: ${TAGS_TO_REMOVE.join(', ')}`);

  try {
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

        console.log(`  ✓ Updated contact ${contact.email || contact.displayName}: removed ${removedCount} tag(s)`);
      }
    }

    console.log('\n✅ Tag cleanup complete!');
    console.log(`   - Contacts updated: ${updatedCount}`);
    console.log(`   - Total tags removed: ${totalTagsRemoved}`);
    console.log(`   - Total contacts: ${allContacts.length}`);

  } catch (error) {
    console.error('❌ Tag cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupTags();
