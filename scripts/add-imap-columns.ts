import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function addIMAPColumns() {
  console.log('📝 Adding IMAP columns to email_accounts table...');

  try {
    await db.execute(sql`
      ALTER TABLE email_accounts
        ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255),
        ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993,
        ADD COLUMN IF NOT EXISTS imap_username VARCHAR(255),
        ADD COLUMN IF NOT EXISTS imap_password TEXT,
        ADD COLUMN IF NOT EXISTS imap_tls BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS imap_last_uid INTEGER DEFAULT 0;
    `);

    console.log('✅ IMAP columns added successfully!');
    console.log('\nColumns added:');
    console.log('  - imap_host (VARCHAR 255)');
    console.log('  - imap_port (INTEGER, default: 993)');
    console.log('  - imap_username (VARCHAR 255)');
    console.log('  - imap_password (TEXT)');
    console.log('  - imap_tls (BOOLEAN, default: true)');
    console.log('  - imap_last_uid (INTEGER, default: 0)');

  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }

  process.exit(0);
}

addIMAPColumns();
