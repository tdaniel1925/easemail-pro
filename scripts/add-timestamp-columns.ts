import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function addTimestampColumns() {
  console.log('Adding created_at and updated_at to organization_members...\n');

  try {
    // Add created_at
    await db.execute(sql`
      ALTER TABLE organization_members
      ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    console.log('✅ Added created_at column');

    // Add updated_at
    await db.execute(sql`
      ALTER TABLE organization_members
      ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    console.log('✅ Added updated_at column');

    // Verify
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organization_members'
      AND column_name IN ('created_at', 'updated_at')
    `);

    console.log('\n✅ Verification - Found columns:', result);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addTimestampColumns();
