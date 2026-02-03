-- Migration 026: Add Billing Tables for PayPal Integration
-- Created: 2026-02-03

-- Usage Records Table
-- Tracks usage of SMS, AI, storage, and email for billing purposes
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'sms', 'ai', 'storage', 'email'
  quantity DECIMAL(15, 6) NOT NULL, -- Number of units (messages, tokens, GB, emails)
  unit_price DECIMAL(10, 6) NOT NULL, -- Price per unit in USD
  total_cost DECIMAL(10, 2) NOT NULL, -- Total cost for this usage
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  invoice_id UUID, -- References invoice when generated
  metadata JSONB DEFAULT '{}', -- Additional data (model name, file size, etc.)
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_org_id ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_records(type);
CREATE INDEX IF NOT EXISTS idx_usage_billing_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_invoice ON usage_records(invoice_id);

-- Subscription Plans Table
-- Defines available subscription tiers
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  monthly_price DECIMAL(10, 2) NOT NULL,
  yearly_price DECIMAL(10, 2), -- Discounted annual price
  currency VARCHAR(3) DEFAULT 'USD',
  paypal_plan_id VARCHAR(255), -- PayPal billing plan ID
  features JSONB DEFAULT '[]', -- List of features
  limits JSONB DEFAULT '{}', -- Usage limits (maxSeats, maxEmails, etc.)
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0, -- For sorting in UI
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Subscriptions Table
-- Tracks user/organization subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  paypal_subscription_id VARCHAR(255) UNIQUE, -- PayPal subscription ID
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'cancelled', 'expired'
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Ensure either user_id or organization_id is set
  CONSTRAINT subscription_owner_check CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR
    (user_id IS NULL AND organization_id IS NOT NULL)
  )
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Invoices Table
-- Tracks billing invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: INV-2024-0001
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'open', 'paid', 'void', 'uncollectible'

  -- Amounts
  subscription_amount DECIMAL(10, 2) DEFAULT 0, -- Base subscription fee
  usage_amount DECIMAL(10, 2) DEFAULT 0, -- Usage-based charges
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Payment details
  paypal_order_id VARCHAR(255),
  payment_method VARCHAR(50), -- 'paypal', 'card', etc.
  paid_at TIMESTAMP,
  due_date TIMESTAMP,

  -- Billing period
  period_start TIMESTAMP,
  period_end TIMESTAMP,

  -- Line items (stored as JSON)
  items JSONB DEFAULT '[]',

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Ensure either user_id or organization_id is set
  CONSTRAINT invoice_owner_check CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR
    (user_id IS NULL AND organization_id IS NOT NULL)
  )
);

-- Add subscription_id column to existing invoices table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
  END IF;

  -- Add other PayPal-specific columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'paypal_order_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN paypal_order_id VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'subscription_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN subscription_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'usage_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN usage_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'items'
  ) THEN
    ALTER TABLE invoices ADD COLUMN items JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'notes'
  ) THEN
    ALTER TABLE invoices ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_paypal ON invoices(paypal_order_id);

-- Payment Methods Table
-- Stores saved payment methods (PayPal accounts, cards)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'paypal', 'card', 'bank_account'
  is_default BOOLEAN DEFAULT false,

  -- PayPal specific
  paypal_email VARCHAR(255),
  paypal_payer_id VARCHAR(255),

  -- Card specific (if adding card support later)
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'failed'

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Ensure either user_id or organization_id is set
  CONSTRAINT payment_method_owner_check CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR
    (user_id IS NULL AND organization_id IS NOT NULL)
  )
);

-- Indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(is_default);

-- Billing Events Table
-- Audit log for billing-related events
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'subscription.created', 'payment.succeeded', 'invoice.generated', etc.
  event_data JSONB NOT NULL,
  paypal_event_id VARCHAR(255), -- PayPal webhook event ID
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for billing events
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_org ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON billing_events(processed);
CREATE INDEX IF NOT EXISTS idx_billing_events_paypal ON billing_events(paypal_event_id);

-- Add PayPal-related fields to organizations table (if not exists)
DO $$
BEGIN
  -- Add paypal_customer_id to organizations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'paypal_customer_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN paypal_customer_id VARCHAR(255);
  END IF;

  -- Add billing_status to organizations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN billing_status VARCHAR(50) DEFAULT 'active';
  END IF;
END $$;

-- Add PayPal-related fields to users table (if not exists)
DO $$
BEGIN
  -- Add paypal_customer_id to users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'paypal_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN paypal_customer_id VARCHAR(255);
  END IF;

  -- Add subscription_tier to users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
  END IF;
END $$;

-- Insert default subscription plans
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

-- Create function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  seq_number INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  -- Get current year
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';

  -- Generate invoice number: INV-2024-0001
  new_invoice_number := 'INV-' || year_part || '-' || LPAD(seq_number::TEXT, 4, '0');

  NEW.invoice_number := new_invoice_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating invoice numbers
DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
CREATE TRIGGER trigger_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 026 completed successfully: Billing tables created';
END
$$;
