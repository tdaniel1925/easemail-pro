/**
 * Make User Platform Admin
 * Updates the first user in the database to have platform_admin role
 *
 * Usage: npx tsx scripts/make-platform-admin.ts <email>
 */

import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function makePlatformAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx tsx scripts/make-platform-admin.ts <email>');
    process.exit(1);
  }

  console.log(`🔍 Looking for user with email: ${email}`);

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.fullName || user.email}`);
  console.log(`   Current role: ${user.role}`);

  if (user.role === 'platform_admin') {
    console.log('ℹ️  User is already a platform_admin');
    process.exit(0);
  }

  // Update role to platform_admin
  await db.update(users)
    .set({ role: 'platform_admin' })
    .where(eq(users.id, user.id));

  console.log('✅ User role updated to platform_admin');
  console.log('   Please refresh your browser to see the Admin Dashboard link');
}

makePlatformAdmin().catch(console.error);
