import 'dotenv/config';
import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    // Check if test user already exists
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, testUserId),
    });

    if (existing) {
      console.log('✅ Test user already exists');
      return;
    }

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      email: 'test@example.com',
      fullName: 'Test User',
    });

    console.log('✅ Test user created successfully!');
    console.log('   ID: 00000000-0000-0000-0000-000000000000');
    console.log('   Email: test@example.com');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
  
  process.exit(0);
}

createTestUser();

