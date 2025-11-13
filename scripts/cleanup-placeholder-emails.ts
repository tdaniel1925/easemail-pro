/**
 * Script to remove placeholder/invalid emails from contacts
 * Usage: npx tsx scripts/cleanup-placeholder-emails.ts
 */

import { db } from '../lib/db/drizzle';
import { contacts } from '../lib/db/schema';
import { sql, or, like } from 'drizzle-orm';

// Common placeholder email patterns
const PLACEHOLDER_PATTERNS = [
  'noemail@',
  'noreply@',
  'no-reply@',
  'donotreply@',
  'do-not-reply@',
  'example.com',
  'test@',
  'placeholder@',
  'temp@',
  'temporary@',
  'dummy@',
  'fake@',
  '@example',
  '@placeholder',
  '@temp',
  '@test',
  // Add more patterns as needed
];

async function cleanupPlaceholderEmails() {
  console.log('🧹 Starting placeholder email cleanup...');
  console.log(`Placeholder patterns: ${PLACEHOLDER_PATTERNS.join(', ')}`);

  try {
    // Get all contacts
    const allContacts = await db.select().from(contacts);

    let updatedCount = 0;
    let deletedCount = 0;

    for (const contact of allContacts) {
      if (!contact.email) {
        continue;
      }

      const emailLower = contact.email.toLowerCase();

      // Check if email matches any placeholder pattern
      const isPlaceholder = PLACEHOLDER_PATTERNS.some(pattern =>
        emailLower.includes(pattern.toLowerCase())
      );

      if (isPlaceholder) {
        // If contact has a phone number, keep the contact but remove the email
        if (contact.phone) {
          await db.update(contacts)
            .set({ email: sql`NULL` })
            .where(sql`id = ${contact.id}`);

          updatedCount++;
          console.log(`  ✓ Removed placeholder email from: ${contact.displayName} (kept contact with phone)`);
        } else {
          // No phone number, delete the entire contact
          await db.delete(contacts)
            .where(sql`id = ${contact.id}`);

          deletedCount++;
          console.log(`  🗑️ Deleted contact with placeholder email: ${contact.email}`);
        }
      }
    }

    console.log('\n✅ Placeholder email cleanup complete!');
    console.log(`   - Emails removed (contacts kept): ${updatedCount}`);
    console.log(`   - Contacts deleted: ${deletedCount}`);
    console.log(`   - Total contacts scanned: ${allContacts.length}`);

  } catch (error) {
    console.error('❌ Placeholder email cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupPlaceholderEmails();
