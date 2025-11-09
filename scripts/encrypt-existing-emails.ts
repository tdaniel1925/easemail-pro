/**
 * Migration Script: Encrypt Existing Emails
 *
 * This script encrypts all existing email bodies in the database.
 * Run once when deploying encryption feature.
 *
 * Usage:
 *   npx tsx scripts/encrypt-existing-emails.ts
 *
 * IMPORTANT: Set ENCRYPTION_KEY before running!
 */

import { db } from '../lib/db';
import { emails } from '../lib/db/schema';
import { isNull, isNotNull, or, eq } from 'drizzle-orm';
import { encrypt, isEncryptionConfigured } from '../lib/security/encryption';

async function encryptExistingEmails() {
  console.log('🔐 Starting email encryption migration...\n');

  // Check if encryption is configured
  if (!isEncryptionConfigured()) {
    console.error('❌ ENCRYPTION_KEY not configured!');
    console.error('Generate a key with: npx tsx lib/security/encryption.ts');
    process.exit(1);
  }

  try {
    // Find all emails with unencrypted bodies
    // (Encrypted data starts with a base64 IV, which contains ':' characters)
    console.log('📧 Finding unencrypted emails...');

    const unencryptedEmails = await db.query.emails.findMany({
      where: or(
        isNotNull(emails.bodyHtml),
        isNotNull(emails.bodyText)
      ),
      limit: 10000, // Process in batches
    });

    console.log(`Found ${unencryptedEmails.length} emails to process\n`);

    let encryptedCount = 0;
    let errorCount = 0;

    for (const email of unencryptedEmails) {
      try {
        // Skip if already encrypted (contains ':' from our encryption format)
        const isBodyHtmlEncrypted = email.bodyHtml?.includes(':');
        const isBodyTextEncrypted = email.bodyText?.includes(':');

        if (isBodyHtmlEncrypted && isBodyTextEncrypted) {
          console.log(`⏭️  Skipping ${email.id} (already encrypted)`);
          continue;
        }

        // Encrypt the bodies
        const encryptedBodyHtml = email.bodyHtml && !isBodyHtmlEncrypted
          ? encrypt(email.bodyHtml)
          : email.bodyHtml;

        const encryptedBodyText = email.bodyText && !isBodyTextEncrypted
          ? encrypt(email.bodyText)
          : email.bodyText;

        // Update the email
        await db.update(emails)
          .set({
            bodyHtml: encryptedBodyHtml,
            bodyText: encryptedBodyText,
          })
          .where(eq(emails.id, email.id));

        encryptedCount++;

        if (encryptedCount % 100 === 0) {
          console.log(`✅ Encrypted ${encryptedCount} emails...`);
        }
      } catch (error) {
        console.error(`❌ Failed to encrypt email ${email.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Encrypted: ${encryptedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total processed: ${unencryptedEmails.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
encryptExistingEmails()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
