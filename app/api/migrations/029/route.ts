import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Migration API: Add hide_signature_prompt to user_preferences
 *
 * This endpoint adds a hide_signature_prompt column to the user_preferences table
 * Safe to run multiple times (uses IF NOT EXISTS)
 *
 * Call once after deployment to apply the schema change
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Running migration: Add hide_signature_prompt to user_preferences');

    // Add the column (safe if already exists)
    await db.execute(sql`
      ALTER TABLE user_preferences
      ADD COLUMN IF NOT EXISTS hide_signature_prompt BOOLEAN DEFAULT false
    `);

    // Create index for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_hide_signature_prompt
      ON user_preferences(hide_signature_prompt)
      WHERE hide_signature_prompt = false
    `);

    // Verify column exists
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_preferences'
        AND column_name = 'hide_signature_prompt'
    `);

    console.log('✅ Migration complete - hide_signature_prompt column ready');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      column: Array.isArray(result) ? result[0] : null,
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);

    // If column already exists, that's fine
    if (error.message?.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Column already exists (no action needed)',
      });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
