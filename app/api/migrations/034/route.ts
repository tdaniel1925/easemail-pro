import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Running migration 034: Optimize webhook performance...');

    // 1. Add unique index on nylas_webhook_id for deduplication
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_nylas_id
        ON webhook_events(nylas_webhook_id)
        WHERE nylas_webhook_id IS NOT NULL;
    `);
    console.log('✅ Created unique index on nylas_webhook_id');

    // 2. Add index on processed status for background job queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
        ON webhook_events(processed, created_at DESC)
        WHERE processed = false;
    `);
    console.log('✅ Created index on processed status');

    // 3. Add index on event_type for monitoring queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_type
        ON webhook_events(event_type, created_at DESC);
    `);
    console.log('✅ Created index on event_type');

    // 4. Add index on account_id for per-account queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_account
        ON webhook_events(account_id, created_at DESC)
        WHERE account_id IS NOT NULL;
    `);
    console.log('✅ Created index on account_id');

    // 5. Add comments documenting the indexes
    await db.execute(sql`
      COMMENT ON INDEX idx_webhook_events_nylas_id IS 'Unique constraint for webhook deduplication - prevents duplicate processing';
    `);
    await db.execute(sql`
      COMMENT ON INDEX idx_webhook_events_processed IS 'Speeds up background job queries for unprocessed events';
    `);
    await db.execute(sql`
      COMMENT ON INDEX idx_webhook_events_type IS 'Speeds up monitoring queries by event type';
    `);
    await db.execute(sql`
      COMMENT ON INDEX idx_webhook_events_account IS 'Speeds up per-account webhook queries';
    `);
    console.log('✅ Added index documentation');

    // 6. Cleanup old processed webhooks (keep 30 days)
    const result = await db.execute(sql`
      DELETE FROM webhook_events
      WHERE processed = true
        AND processed_at < NOW() - INTERVAL '30 days'
    `);
    
    console.log(`✅ Cleaned up old webhook events`);

    console.log('✅ Migration 034 complete: Webhook performance optimized');

    return NextResponse.json({
      success: true,
      message: 'Webhook performance optimization complete',
      details: {
        uniqueIndexCreated: true,
        processedIndexCreated: true,
        typeIndexCreated: true,
        accountIndexCreated: true,
        oldEventsCleanedUp: true,
      },
    });
  } catch (error: any) {
    console.error('❌ Migration 034 failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

