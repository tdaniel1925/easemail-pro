// Script to drop old problematic index
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function dropOldIndex() {
  try {
    console.log('Dropping old index idx_emails_folder_lower...');
    await db.execute(sql`DROP INDEX IF EXISTS idx_emails_folder_lower;`);
    console.log('✓ Successfully dropped old index');
  } catch (error) {
    console.error('Error dropping index:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

dropOldIndex();
