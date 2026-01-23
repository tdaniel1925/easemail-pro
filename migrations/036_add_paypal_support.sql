-- Migration 036: Add PayPal Support to Billing System
-- Date: 2026-01-22
-- Description: Adds PayPal-specific fields while maintaining backward compatibility with Stripe

-- Add PayPal fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_provider varchar(20) DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paypal')),
ADD COLUMN IF NOT EXISTS paypal_subscription_id varchar(255),
ADD COLUMN IF NOT EXISTS paypal_plan_id varchar(255);

-- Add PayPal fields to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paypal_invoice_id varchar(255),
ADD COLUMN IF NOT EXISTS payment_provider varchar(20) DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paypal'));

-- Add PayPal fields to payment_methods table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
    ALTER TABLE payment_methods
    ADD COLUMN IF NOT EXISTS payment_provider varchar(20) DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paypal')),
    ADD COLUMN IF NOT EXISTS paypal_payment_token varchar(255);
  END IF;
END
$$;

-- Create indexes for PayPal IDs
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_sub_id ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paypal_invoice_id ON invoices(paypal_invoice_id);

-- Make Stripe fields nullable (since PayPal won't use them)
ALTER TABLE subscriptions
ALTER COLUMN stripe_customer_id DROP NOT NULL,
ALTER COLUMN stripe_subscription_id DROP NOT NULL;

ALTER TABLE invoices
ALTER COLUMN stripe_invoice_id DROP NOT NULL;

-- Add unique constraints for PayPal IDs
ALTER TABLE subscriptions
ADD CONSTRAINT unique_paypal_subscription_id UNIQUE (paypal_subscription_id);

ALTER TABLE invoices
ADD CONSTRAINT unique_paypal_invoice_id UNIQUE (paypal_invoice_id);

-- Create PayPal products and plans tracking table
CREATE TABLE IF NOT EXISTS paypal_billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id varchar(50) NOT NULL, -- 'individual', 'team', 'enterprise'
  billing_cycle varchar(20) NOT NULL, -- 'monthly', 'annual'
  paypal_product_id varchar(255) NOT NULL,
  paypal_plan_id varchar(255) NOT NULL UNIQUE,
  price_per_seat numeric(10, 2) NOT NULL,
  currency varchar(3) DEFAULT 'USD',
  status varchar(20) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_plan_cycle UNIQUE (plan_id, billing_cycle)
);

-- Add RLS policy for paypal_billing_plans (admin read-only)
ALTER TABLE paypal_billing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view PayPal billing plans" ON paypal_billing_plans
  FOR SELECT
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

CREATE POLICY "Platform admins can manage PayPal billing plans" ON paypal_billing_plans
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
  );

-- Create indexes for paypal_billing_plans
CREATE INDEX IF NOT EXISTS idx_paypal_plans_plan_cycle ON paypal_billing_plans(plan_id, billing_cycle);
CREATE INDEX IF NOT EXISTS idx_paypal_plans_product_id ON paypal_billing_plans(paypal_product_id);

-- Add comment
COMMENT ON TABLE paypal_billing_plans IS 'Tracks PayPal billing plans and products for subscription management';
COMMENT ON COLUMN subscriptions.payment_provider IS 'Payment provider: stripe or paypal';
COMMENT ON COLUMN subscriptions.paypal_subscription_id IS 'PayPal subscription ID';
COMMENT ON COLUMN subscriptions.paypal_plan_id IS 'PayPal billing plan ID';

-- Migration complete
SELECT 'Migration 036: PayPal support added successfully' AS status;
