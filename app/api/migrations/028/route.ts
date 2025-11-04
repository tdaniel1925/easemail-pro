import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Migration API: Add recipient columns to email_drafts
 * 
 * This endpoint adds to, cc, bcc columns to the email_drafts table
 * Safe to run multiple times (uses IF NOT EXISTS)
 * 
 * Call once after deployment to apply the schema change
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Running migration: Add recipient columns to email_drafts');

    // Add the columns (safe if already exists)
    await db.execute(sql`
      ALTER TABLE email_drafts 
      ADD COLUMN IF NOT EXISTS "to" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS cc JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS bcc JSONB DEFAULT '[]'::jsonb
    `);

    // Verify columns exist
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_drafts' 
        AND column_name IN ('to', 'cc', 'bcc')
    `);

    console.log('✅ Migration complete - recipient columns ready');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      columns: Array.isArray(result) ? result : [],
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);

    // If columns already exist, that's fine
    if (error.message?.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Columns already exist (no action needed)',
      });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

