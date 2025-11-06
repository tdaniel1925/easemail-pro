import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Running migration 032: Add is_read to sms_messages...');

    await db.execute(sql`
      ALTER TABLE sms_messages 
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS sms_messages_is_read_idx ON sms_messages(user_id, direction, is_read) WHERE direction = 'inbound';
    `);

    console.log('✅ Migration 032 complete: is_read column added to sms_messages');

    return NextResponse.json({
      success: true,
      message: 'is_read column added successfully',
    });
  } catch (error: any) {
    console.error('❌ Migration 032 failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

