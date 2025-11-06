import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Running migration 031: Add show_ai_summaries preference...');

    await db.execute(sql`
      ALTER TABLE user_preferences 
      ADD COLUMN IF NOT EXISTS show_ai_summaries BOOLEAN DEFAULT true;
    `);

    console.log('✅ Migration 031 complete: show_ai_summaries column added');

    return NextResponse.json({
      success: true,
      message: 'show_ai_summaries preference added successfully',
    });
  } catch (error: any) {
    console.error('❌ Migration 031 failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

