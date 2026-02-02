/**
 * Check Admin Status
 * Verifies the current role and permissions for a user
 */

import { db } from '../lib/db/drizzle';
import { users, organizationMembers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkAdminStatus() {
  const email = 'tdaniel@botmakers.ai';

  console.log('🔍 Checking admin status for:', email);
  console.log('');

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log('❌ User not found:', email);
    console.log('');
    console.log('To create this user as platform admin, run:');
    console.log(`npx tsx scripts/make-platform-admin.ts ${email}`);
    return;
  }

  console.log('✅ User found');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Full Name:', user.fullName || '(not set)');
  console.log('   Role:', user.role);
  console.log('   Organization ID:', user.organizationId || '(none)');
  console.log('   Account Status:', user.accountStatus);
  console.log('   Created:', user.createdAt);
  console.log('');

  // Check if platform admin
  if (user.role === 'platform_admin') {
    console.log('✅ STATUS: PLATFORM ADMIN (Super Admin)');
    console.log('');
    console.log('Capabilities:');
    console.log('   ✅ Access admin dashboard at /admin');
    console.log('   ✅ Create and manage organizations');
    console.log('   ✅ Create and manage all users');
    console.log('   ✅ Access system settings');
    console.log('   ✅ View financial reports and usage analytics');
    console.log('   ✅ Full access to all features across all organizations');
  } else {
    console.log('⚠️  STATUS: NOT A PLATFORM ADMIN');
    console.log('   Current role:', user.role);
    console.log('');
    console.log('To make this user a platform admin, run:');
    console.log(`npx tsx scripts/make-platform-admin.ts ${email}`);
  }

  console.log('');

  // Check organization memberships
  if (user.organizationId) {
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, user.id),
      with: {
        organization: true,
      },
    });

    if (membership) {
      console.log('📋 Organization Membership:');
      console.log('   Organization:', membership.organization?.name || 'Unknown');
      console.log('   Role in Org:', membership.role);
      console.log('   Active:', membership.isActive);
    }
  } else {
    console.log('📋 Organization: None (individual account)');
  }

  console.log('');
  console.log('Admin Dashboard URL:');
  console.log(`   ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin`);
}

checkAdminStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
