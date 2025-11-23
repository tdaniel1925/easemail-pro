/**
 * Cleanup Script: Remove Excluded Attachments
 * Removes .ics, .vcf, and other excluded file types from attachments database
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const { eq, inArray } = require('drizzle-orm');
const postgres = require('postgres');
const { attachments } = require('../lib/db/schema');

// Excluded file extensions (matches attachment-filter.ts)
const EXCLUDED_EXTENSIONS = ['ics', 'vcf', 'p7s', 'asc', 'sig', 'eml', 'winmail.dat'];

async function cleanupExcludedAttachments() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔧 Connecting to database...');
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // First, count how many attachments will be deleted
    console.log('📊 Counting excluded attachments...');
    const excludedAttachments = await db
      .select()
      .from(attachments)
      .where(inArray(attachments.fileExtension, EXCLUDED_EXTENSIONS));

    console.log(`\n📋 Found ${excludedAttachments.length} excluded attachments:`);

    // Group by extension for reporting
    const byExtension = excludedAttachments.reduce((acc, att) => {
      acc[att.fileExtension] = (acc[att.fileExtension] || 0) + 1;
      return acc;
    }, {});

    Object.entries(byExtension).forEach(([ext, count]) => {
      console.log(`   - .${ext}: ${count} files`);
    });

    if (excludedAttachments.length === 0) {
      console.log('\n✅ No excluded attachments found. Database is clean!');
      await client.end();
      return;
    }

    // Delete excluded attachments
    console.log('\n🗑️  Deleting excluded attachments...');
    const result = await db
      .delete(attachments)
      .where(inArray(attachments.fileExtension, EXCLUDED_EXTENSIONS));

    console.log(`✅ Successfully deleted ${excludedAttachments.length} excluded attachments`);
    console.log('\n📝 Summary:');
    console.log(`   - Total deleted: ${excludedAttachments.length}`);
    console.log(`   - Excluded extensions: ${EXCLUDED_EXTENSIONS.join(', ')}`);
    console.log('\n✨ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the cleanup
cleanupExcludedAttachments();
