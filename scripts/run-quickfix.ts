import * as fs from 'fs';
import * as path from 'path';
import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function runQuickFix() {
  console.log('🔧 Running quick fix for missing timestamp columns...');

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'migrations', 'QUICKFIX_add_missing_timestamps.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolons and run each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      await db.execute(sql.raw(statement));
    }

    console.log('✅ Quick fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    process.exit(1);
  }
}

runQuickFix();
