/**
 * Migration 026: Add Billing Tables
 * Run via POST /api/migrations/026
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    logger.db.info('Running billing tables migration...');

    // Execute the migration SQL
    await db.execute(sql`
      -- Usage Records Table
      CREATE TABLE IF NOT EXISTS usage_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        quantity DECIMAL(15, 6) NOT NULL,
        unit_price DECIMAL(10, 6) NOT NULL,
        total_cost DECIMAL(10, 2) NOT NULL,
        billing_period_start TIMESTAMP NOT NULL,
        billing_period_end TIMESTAMP NOT NULL,
        invoice_id UUID,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage_records(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_org_id ON usage_records(organization_id);
      CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_records(type);
      CREATE INDEX IF NOT EXISTS idx_usage_billing_period ON usage_records(billing_period_start, billing_period_end);
      CREATE INDEX IF NOT EXISTS idx_usage_invoice ON usage_records(invoice_id);
    `);

    // Subscription Plans Table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        monthly_price DECIMAL(10, 2) NOT NULL,
        yearly_price DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'USD',
        paypal_plan_id VARCHAR(255),
        features JSONB DEFAULT '[]',
        limits JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Billing Events Table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS billing_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB NOT NULL,
        paypal_event_id VARCHAR(255),
        processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_billing_events_org ON billing_events(organization_id);
      CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON billing_events(processed);
      CREATE INDEX IF NOT EXISTS idx_billing_events_paypal ON billing_events(paypal_event_id);
    `);

    // Add PayPal fields to organizations table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'paypal_customer_id'
        ) THEN
          ALTER TABLE organizations ADD COLUMN paypal_customer_id VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'billing_status'
        ) THEN
          ALTER TABLE organizations ADD COLUMN billing_status VARCHAR(50) DEFAULT 'active';
        END IF;
      END $$;
    `);

    // Add PayPal fields to users table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'paypal_customer_id'
        ) THEN
          ALTER TABLE users ADD COLUMN paypal_customer_id VARCHAR(255);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'subscription_tier'
        ) THEN
          ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
        END IF;
      END $$;
    `);

    // Insert default subscription plans
    await db.execute(sql`
      INSERT INTO subscription_plans (name, slug, description, monthly_price, yearly_price, features, limits, display_order)
      VALUES
        (
          'Free',
          'free',
          'Perfect for trying out EaseMail',
          0.00,
          0.00,
          '["Basic email management", "1 email account", "Community support"]'::jsonb,
          '{"maxSeats": 1, "maxEmails": 100, "maxStorage": 1, "aiRequests": 10, "smsMessages": 0}'::jsonb,
          1
        ),
        (
          'Starter',
          'starter',
          'Great for individuals and small teams',
          9.99,
          99.99,
          '["Everything in Free", "Up to 5 email accounts", "Priority support", "1000 emails/month", "100 AI requests/month"]'::jsonb,
          '{"maxSeats": 5, "maxEmails": 1000, "maxStorage": 10, "aiRequests": 100, "smsMessages": 50}'::jsonb,
          2
        ),
        (
          'Pro',
          'pro',
          'For growing businesses',
          29.99,
          299.99,
          '["Everything in Starter", "Up to 20 email accounts", "10GB storage", "Unlimited emails", "500 AI requests/month", "200 SMS/month"]'::jsonb,
          '{"maxSeats": 20, "maxEmails": -1, "maxStorage": 50, "aiRequests": 500, "smsMessages": 200}'::jsonb,
          3
        ),
        (
          'Enterprise',
          'enterprise',
          'For large organizations',
          99.99,
          999.99,
          '["Everything in Pro", "Unlimited users", "Unlimited storage", "Unlimited AI requests", "1000 SMS/month", "Dedicated support", "Custom integrations"]'::jsonb,
          '{"maxSeats": -1, "maxEmails": -1, "maxStorage": -1, "aiRequests": -1, "smsMessages": 1000}'::jsonb,
          4
        )
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Create invoice number generation function (skip if already exists)
    try {
      await db.execute(sql`
        DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;

        CREATE FUNCTION generate_invoice_number()
        RETURNS TRIGGER AS $func$
        DECLARE
          year_part VARCHAR(4);
          seq_number INTEGER;
          new_invoice_number VARCHAR(50);
        BEGIN
          year_part := TO_CHAR(NOW(), 'YYYY');

          SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1
          INTO seq_number
          FROM invoices
          WHERE invoice_number LIKE 'INV-' || year_part || '-%';

          new_invoice_number := 'INV-' || year_part || '-' || LPAD(seq_number::TEXT, 4, '0');

          NEW.invoice_number := new_invoice_number;
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
      `);

      await db.execute(sql`
        DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
        CREATE TRIGGER trigger_generate_invoice_number
          BEFORE INSERT ON invoices
          FOR EACH ROW
          WHEN (NEW.invoice_number IS NULL)
          EXECUTE FUNCTION generate_invoice_number();
      `);
    } catch (err) {
      // Function/trigger might already exist, that's okay
      logger.db.warn('Invoice function/trigger already exists', err);
    }

    logger.db.info('Billing tables migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Billing tables created successfully',
      tables: [
        'usage_records',
        'subscription_plans',
        'billing_events',
      ],
      plansInserted: 4,
    });
  } catch (error) {
    logger.db.error('Billing tables migration failed', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
