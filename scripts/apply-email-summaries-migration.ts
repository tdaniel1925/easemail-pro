/**
 * Apply email_summaries migration to remote Supabase database
 * Run with: npx tsx scripts/apply-email-summaries-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('📦 Reading migration file...');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20250118000000_create_email_summaries.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying migration to Supabase...');
  console.log('Migration SQL:');
  console.log(sql);
  console.log('\n');

  // Execute the SQL
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error);

    // Try alternative approach: split by statements
    console.log('\n🔄 Trying statement-by-statement execution...');

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

      try {
        const { error: stmtError } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (stmtError) {
          // Some errors are okay (e.g., table already exists)
          if (stmtError.message.includes('already exists')) {
            console.log('⚠️  Already exists, skipping...');
          } else {
            console.error('❌ Statement failed:', stmtError.message);
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (err) {
        console.error('❌ Error:', err);
      }
    }
  } else {
    console.log('✅ Migration applied successfully!');
  }

  console.log('\n📊 Verifying table creation...');

  const { data, error: checkError } = await supabase
    .from('email_summaries')
    .select('count')
    .limit(1);

  if (checkError) {
    console.error('❌ Table verification failed:', checkError);
  } else {
    console.log('✅ Table email_summaries is accessible!');
  }

  console.log('\n✅ Migration complete!');
}

applyMigration().catch(console.error);
