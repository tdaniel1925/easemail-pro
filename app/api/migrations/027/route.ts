import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Migration API: Add continuation_count column
 * 
 * This endpoint adds the continuation_count column to email_accounts table
 * Safe to run multiple times (uses IF NOT EXISTS)
 * 
 * Call once after deployment to apply the schema change
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Running migration: Add continuation_count column');

    // Add the column (safe if already exists)
    await db.execute(sql`
      ALTER TABLE email_accounts 
      ADD COLUMN IF NOT EXISTS continuation_count INTEGER DEFAULT 0
    `);

    // Verify column exists
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'email_accounts' 
        AND column_name = 'continuation_count'
    `);

    console.log('✅ Migration complete - continuation_count column ready');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      column: Array.isArray(result) && result.length > 0 ? result[0] : null,
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

