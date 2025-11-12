import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function checkColumns() {
  console.log('Checking for created_at/updated_at columns...\n');

  try {
    // Check organization_members
    const orgMembersColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organization_members'
      ORDER BY ordinal_position
    `);

    console.log('organization_members columns:');
    console.log(JSON.stringify(orgMembersColumns, null, 2));
    console.log('');

    // Check user_audit_logs
    const auditLogsColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_audit_logs'
      ORDER BY ordinal_position
    `);

    console.log('user_audit_logs columns:');
    console.log(JSON.stringify(auditLogsColumns, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkColumns();
