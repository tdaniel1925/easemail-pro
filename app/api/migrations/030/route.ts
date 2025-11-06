import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Running migration 030: Add SMS Conversations...');

    // Create sms_conversations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        
        contact_phone VARCHAR(50) NOT NULL,
        twilio_number VARCHAR(50) NOT NULL,
        
        last_message_at TIMESTAMP NOT NULL,
        message_count INTEGER DEFAULT 1,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        
        CONSTRAINT sms_conv_unique UNIQUE(contact_phone, twilio_number)
      );
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sms_conv_user_id ON sms_conversations(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sms_conv_contact_id ON sms_conversations(contact_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sms_conv_phone ON sms_conversations(contact_phone);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sms_conv_twilio ON sms_conversations(twilio_number);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sms_conv_last_message ON sms_conversations(last_message_at DESC);`);

    console.log('✅ Migration 030 complete: SMS conversations table created');

    return NextResponse.json({
      success: true,
      message: 'SMS conversations table created successfully',
    });
  } catch (error: any) {
    console.error('❌ Migration 030 failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

