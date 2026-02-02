/**
 * Migration: Add "user_admin" Role to Organization Members
 *
 * This migration adds a new role tier between "admin" and "member"
 * for users who can manage other users but not organizational settings.
 *
 * Usage: npx tsx scripts/migrations/add-user-admin-role.ts
 */

import { db } from '../../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function addUserAdminRole() {
  console.log('🔄 Starting migration: Add user_admin role...');

  try {
    // Step 1: Add constraint to allow the new role value
    // PostgreSQL needs the constraint to be recreated with the new value
    console.log('📝 Step 1: Updating role column constraint...');

    await db.execute(sql`
      -- Drop existing constraint if it exists
      ALTER TABLE organization_members
      DROP CONSTRAINT IF EXISTS organization_members_role_check;
    `);

    await db.execute(sql`
      -- Add new constraint with user_admin included
      ALTER TABLE organization_members
      ADD CONSTRAINT organization_members_role_check
      CHECK (role IN ('owner', 'admin', 'user_admin', 'member'));
    `);

    console.log('✅ Step 1: Role constraint updated');

    // Step 2: Show current role distribution
    console.log('📝 Step 2: Current role distribution:');

    const roles = await db.execute(sql`
      SELECT role, COUNT(*) as count
      FROM organization_members
      GROUP BY role
      ORDER BY count DESC;
    `);

    const rolesArray = Array.from(roles);

    if (rolesArray && rolesArray.length > 0) {
      console.log('   Current roles:');
      rolesArray.forEach((row: any) => {
        console.log(`   - ${row.role}: ${row.count} members`);
      });
    } else {
      console.log('   No organization members found');
    }

    console.log('\n✅ Migration complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update TypeScript types in lib/auth/permissions.ts');
    console.log('   2. Update admin UI to show new role option');
    console.log('   3. Update permission checking logic');
    console.log('   4. Test the new role permissions');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addUserAdminRole()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
