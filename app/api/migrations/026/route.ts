/**
 * Migration 026: Add Billing Tables for PayPal Integration
 * Run via POST /api/migrations/026
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    logger.db.info('Running billing tables migration 026...');

    // Read the SQL file directly
    const sqlPath = join(process.cwd(), 'migrations', '026_add_billing_tables.sql');
    const migrationSQL = readFileSync(sqlPath, 'utf-8');

    // Execute the entire migration
    await db.execute(sql.raw(migrationSQL));

    logger.db.info('Billing tables migration 026 completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Billing tables migration 026 completed successfully',
      tables: [
        'usage_records',
        'subscription_plans',
        'subscriptions',
        'invoices (updated)',
        'payment_methods',
        'billing_events',
      ],
      plansInserted: 4,
    });
  } catch (error) {
    logger.db.error('Billing tables migration 026 failed', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
