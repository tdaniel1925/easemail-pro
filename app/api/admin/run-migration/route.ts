import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Running webhook suppression migration...');

    // Add suppress_webhooks column
    await db.execute(sql`
      ALTER TABLE email_accounts
      ADD COLUMN IF NOT EXISTS suppress_webhooks BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ Added suppress_webhooks column');

    // Add index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_suppress_webhooks
      ON email_accounts(suppress_webhooks)
      WHERE suppress_webhooks = true
    `);

    console.log('✅ Added index');

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN email_accounts.suppress_webhooks IS 'Temporary flag to suppress webhook processing during initial sync to prevent race conditions'
    `);

    console.log('✅ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Webhook suppression migration completed'
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
