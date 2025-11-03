-- Migration 024: Add Promo User and Billing Automation
-- Adds promo user flag, billing configuration, and billing run tracking

-- ============================================================================
-- ADD PROMO USER FLAG AND SUBSCRIPTION TIER TO USERS TABLE
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_promo_user BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';

-- Add indexes for quick filtering
CREATE INDEX IF NOT EXISTS idx_users_promo ON users(is_promo_user);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- Add comments
COMMENT ON COLUMN users.is_promo_user IS 'Promo users get free access to all features without billing';
COMMENT ON COLUMN users.subscription_tier IS 'User subscription level: free, starter, pro, enterprise';

-- ============================================================================
-- BILLING CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Settings
  enabled BOOLEAN DEFAULT false,
  frequency VARCHAR(20) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
  day_of_week INTEGER, -- 0-6 for weekly (0 = Sunday)
  day_of_month INTEGER, -- 1-31 for monthly
  hour_of_day INTEGER DEFAULT 2, -- Hour to run (0-23, UTC)
  
  -- Retry Settings
  auto_retry BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  retry_delay_hours INTEGER DEFAULT 24,
  
  -- Notifications
  notify_on_success BOOLEAN DEFAULT false,
  notify_on_failure BOOLEAN DEFAULT true,
  notification_email VARCHAR(255),
  
  -- Thresholds (when to charge)
  sms_charge_threshold_usd DECIMAL(10,2) DEFAULT 1.00, -- Charge when SMS cost exceeds $1
  ai_charge_threshold_usd DECIMAL(10,2) DEFAULT 5.00, -- Charge when AI cost exceeds $5
  minimum_charge_usd DECIMAL(10,2) DEFAULT 0.50, -- Don't charge less than $0.50
  
  -- Grace Period
  grace_period_days INTEGER DEFAULT 3, -- Days before suspending service for non-payment
  
  -- Tracking
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  last_run_status VARCHAR(50), -- 'success', 'failed', 'partial'
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert default configuration
INSERT INTO billing_config (enabled, frequency, day_of_month, hour_of_day)
VALUES (false, 'monthly', 1, 2)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- BILLING RUNS HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'partial'
  
  -- Results Summary
  accounts_processed INTEGER DEFAULT 0,
  charges_successful INTEGER DEFAULT 0,
  charges_failed INTEGER DEFAULT 0,
  total_amount_charged_usd DECIMAL(10,2) DEFAULT 0,
  
  -- Details
  error_message TEXT,
  metadata JSONB, -- Store details like {user_results: [...], errors: [...]}
  
  -- Configuration Snapshot
  config_snapshot JSONB, -- Store billing config used for this run
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_runs_started ON billing_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_runs_status ON billing_runs(status);

-- ============================================================================
-- BILLING TRANSACTIONS TABLE (for detailed charge tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What
  transaction_type VARCHAR(50) NOT NULL, -- 'charge', 'refund', 'credit', 'adjustment'
  amount_usd DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  
  -- Billing Run Reference
  billing_run_id UUID REFERENCES billing_runs(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Payment Processing
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  
  -- Stripe Details
  stripe_charge_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  
  -- Retry Tracking
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  
  -- Failure Details
  failure_reason TEXT,
  failure_code VARCHAR(100),
  
  -- Metadata
  metadata JSONB, -- Store usage breakdown: {sms: 100, ai: 50, storage: 10}
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraint: Either org or user, but not both
  CONSTRAINT billing_transaction_owner_check CHECK (
    (organization_id IS NOT NULL AND user_id IS NULL) OR
    (organization_id IS NULL AND user_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user ON billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_org ON billing_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON billing_transactions(status);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_run ON billing_transactions(billing_run_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_stripe ON billing_transactions(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_retry ON billing_transactions(next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- ============================================================================
-- PAYMENT METHOD REQUIREMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_method_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Requirement Status
  requires_payment_method BOOLEAN DEFAULT true,
  reason VARCHAR(100), -- 'subscription_tier', 'usage_overage', 'admin_required'
  
  -- Enforcement
  enforce_after TIMESTAMP, -- When to start enforcing (grace period)
  suspended_at TIMESTAMP, -- When service was suspended for non-compliance
  
  -- Notifications
  last_notified_at TIMESTAMP,
  notification_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_payment_requirements_user ON payment_method_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requirements_enforce ON payment_method_requirements(enforce_after) WHERE requires_payment_method = true;

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================

-- Add billing-related fields to sms_usage if not exists
ALTER TABLE sms_usage ADD COLUMN IF NOT EXISTS charged_at TIMESTAMP;
ALTER TABLE sms_usage ADD COLUMN IF NOT EXISTS charge_amount_usd DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sms_usage ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES billing_transactions(id) ON DELETE SET NULL;

-- Add billing-related fields to ai_usage if not exists  
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS charged_at TIMESTAMP;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS charge_amount_usd DECIMAL(10,2) DEFAULT 0;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES billing_transactions(id) ON DELETE SET NULL;

-- ============================================================================
-- HELPFUL VIEWS FOR REPORTING
-- ============================================================================

-- View: Users requiring payment methods
CREATE OR REPLACE VIEW users_requiring_payment AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_promo_user,
  u.subscription_tier,
  COUNT(pm.id) as payment_methods_count,
  pmr.requires_payment_method,
  pmr.enforce_after,
  pmr.suspended_at
FROM users u
LEFT JOIN payment_methods pm ON pm.user_id = u.id AND pm.status = 'active'
LEFT JOIN payment_method_requirements pmr ON pmr.user_id = u.id
WHERE u.subscription_tier != 'free' 
  AND u.is_promo_user = false
GROUP BY u.id, u.email, u.full_name, u.role, u.is_promo_user, u.subscription_tier, 
         pmr.requires_payment_method, pmr.enforce_after, pmr.suspended_at;

-- View: Current period usage summary
CREATE OR REPLACE VIEW current_period_usage AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.is_promo_user,
  u.subscription_tier,
  COALESCE(SUM(sms.total_cost_usd::DECIMAL), 0) as sms_cost,
  COALESCE(SUM(ai.total_cost_usd), 0) as ai_cost,
  COALESCE(SUM(st.overage_cost_usd), 0) as storage_cost,
  COALESCE(SUM(sms.total_cost_usd::DECIMAL), 0) + 
  COALESCE(SUM(ai.total_cost_usd), 0) + 
  COALESCE(SUM(st.overage_cost_usd), 0) as total_pending_cost
FROM users u
LEFT JOIN sms_usage sms ON sms.user_id = u.id 
  AND sms.billing_status = 'pending'
  AND sms.period_start >= date_trunc('month', CURRENT_DATE)
LEFT JOIN ai_usage ai ON ai.user_id = u.id 
  AND ai.period_start >= date_trunc('month', CURRENT_DATE)
LEFT JOIN storage_usage st ON st.user_id = u.id 
  AND st.period_start >= date_trunc('month', CURRENT_DATE)
GROUP BY u.id, u.email, u.full_name, u.is_promo_user, u.subscription_tier;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE billing_config IS 'Configuration for automated billing system';
COMMENT ON TABLE billing_runs IS 'History of automated billing runs';
COMMENT ON TABLE billing_transactions IS 'Detailed transaction log for all charges and refunds';
COMMENT ON TABLE payment_method_requirements IS 'Tracks which users must have payment methods on file';

COMMENT ON VIEW users_requiring_payment IS 'Users who need payment methods (excludes free and promo users)';
COMMENT ON VIEW current_period_usage IS 'Current billing period usage summary for all users';

